/**
 * Internal Link Crawler Module
 * 
 * Kaynak URL listesinden (veya sitemap'ten) linkleri ayrıştırır, 
 * filtreler ve veritabanına kaydeder.
 */

import * as cheerio from 'cheerio';
import pLimit from 'p-limit';
import { replaceInternalLinks, InternalLinkRecord } from '../db/internal-links';

const DEFAULT_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36 (Antigravity Crawler/1.0)';
const DEFAULT_CONCURRENCY = 20;
const DEFAULT_DELAY_MS = 100;

export interface CrawlerConfig {
    concurrency?: number;
    delayMs?: number;
    userAgent?: string;
    contentSelector?: string; // Sadece içerik alanındaki linkleri almak için (örn: 'main', 'article', '.content')
    excludePatterns?: RegExp[]; // Hariç tutulacak URL paternleri
    baseUrl?: string; // Internal link ayrıştırması için gerekli
}

export class InternalLinkCrawler {
    private limit: any;
    private config: Required<CrawlerConfig>;

    constructor(config: CrawlerConfig) {
        this.config = {
            concurrency: config.concurrency || DEFAULT_CONCURRENCY,
            delayMs: config.delayMs || DEFAULT_DELAY_MS,
            userAgent: config.userAgent || DEFAULT_USER_AGENT,
            contentSelector: config.contentSelector || 'main, article, .content, #content, .post-content', // Sensible defaults
            excludePatterns: config.excludePatterns || [],
            baseUrl: config.baseUrl || '',
        };
        this.limit = pLimit(this.config.concurrency);
    }

    /**
     * Verilen URL listesini kuyruğa ekler ve taramaya başlar.
     */
    async crawlAll(urls: string[]) {
        console.log(`[Crawler] Starting crawl for ${urls.length} URLs with concurrency ${this.config.concurrency}...`);

        const tasks = urls.map(url => {
            return this.limit(async () => {
                await this.delay(this.config.delayMs);
                return this.crawlSinglePage(url);
            });
        });

        const results = await Promise.allSettled(tasks);

        const success = results.filter(r => r.status === 'fulfilled' && (r as any).value === true).length;
        const failed = results.length - success;

        console.log(`[Crawler] Done! Success: ${success}, Failed: ${failed}`);
        return { success, failed };
    }

    /**
     * Tek bir sayfayı çeker, linkleri ayıklar ve DB'ye yazar.
     */
    private async crawlSinglePage(url: string): Promise<boolean> {
        try {
            console.log(`[Crawler] Fetching: ${url}`);

            const response = await fetch(url, {
                headers: { 'User-Agent': this.config.userAgent },
                signal: AbortSignal.timeout(15000), // 15 saniye timeout
            });

            if (!response.ok) {
                console.error(`[Crawler] HTTP Error ${response.status} for ${url}`);
                return false;
            }

            const html = await response.text();
            const $ = cheerio.load(html);

            // Sadece içerik alanındaki linkleri topla
            const contentArea = $(this.config.contentSelector);
            const anchorTags = contentArea.find('a');

            const internalLinks: InternalLinkRecord[] = [];

            anchorTags.each((_, element) => {
                const href = $(element).attr('href');
                const anchorText = $(element).text().trim() || '(No Text)'; // Boş anchorları işaretle

                if (!href) return;

                const absoluteUrl = this.toAbsoluteUrl(href, url);

                // Filtreleme: 
                // 1. Dış link mi? (domain aynı mı)
                // 2. Anchor link mi? (#)
                // 3. Geçerli bir URL mi?
                // 4. Özel hariç tutma (User Request: /catalog)
                const isCatalog = absoluteUrl === 'https://uygunbakim.com/catalog';

                if (this.isInternal(absoluteUrl) && !href.startsWith('#') && absoluteUrl !== url && !isCatalog) {
                    internalLinks.push({
                        source_page: url,
                        target_page: absoluteUrl,
                        anchor_text: anchorText,
                    });
                }
            });

            // Veritabanına kaydet (Upsert / Overwrite)
            const uniqueLinks = this.getUniqueLinks(internalLinks);
            const { count, error } = await replaceInternalLinks(url, uniqueLinks);

            if (error) {
                console.error(`[Crawler] DB Storage Error for ${url}: ${error}`);
                return false;
            }

            console.log(`[Crawler] Extracted and stored ${count} internal links for ${url}`);
            return true;

        } catch (error: any) {
            console.error(`[Crawler] Error processing ${url}:`, error.message);
            // Sessizce devam et (Graceful error handling)
            return false;
        }
    }

    /**
     * URL'yi absolute yap (root-relative veya relative linkler için)
     */
    private toAbsoluteUrl(href: string, base: string): string {
        try {
            const urlObj = new URL(href, base);
            // Query string ve hashleri temizleyelim (kanonik URL mantığı)
            urlObj.hash = '';
            urlObj.search = '';
            return urlObj.toString().replace(/\/$/, ''); // Trailing slash temizliği
        } catch {
            return href;
        }
    }

    /**
     * Linkin iç link olup olmadığını kontrol eder.
     */
    private isInternal(url: string): boolean {
        try {
            const urlObj = new URL(url);
            const baseObj = new URL(this.config.baseUrl);
            return urlObj.hostname === baseObj.hostname;
        } catch {
            return false;
        }
    }

    /**
     * Aynı sayfaya giden birden fazla link varsa anchor textler farklı olabilir.
     * Şimdilik hepsini tutalım mı yoksa tekilleyelim mi? 
     * DB'de unique constraint (source, target, anchor) olduğu için batch insert'te hata almamak adına tekilleştirelim.
     */
    private getUniqueLinks(links: InternalLinkRecord[]): InternalLinkRecord[] {
        const seenTarget = new Set<string>();
        return links.filter(link => {
            // Sadece ilk karşılaşılan (en üstteki) hedef URL'i tut
            if (seenTarget.has(link.target_page)) return false;
            seenTarget.add(link.target_page);
            return true;
        });
    }

    private delay(ms: number) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
