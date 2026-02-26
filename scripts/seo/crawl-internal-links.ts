/**
 * CLI Script: Internal Link Crawler
 * 
 * Veritabanına internal_links tablosunu doldurmak için sitemap üzerinden tüm sayfaları tarar.
 * 
 * Kullanım: npx tsx scripts/seo/crawl-internal-links.ts
 */

import * as dotenv from 'dotenv';
import * as cheerio from 'cheerio';
import { InternalLinkCrawler } from '../../lib/seo/crawler';

dotenv.config({ path: '.env.local' });

const SITE_URL = 'https://uygunbakim.com'; // Manuel veya .env'den alınabilir
const SITEMAP_URL = `${SITE_URL}/sitemap.xml`; // Next.js blogları genelde sitemap.xml kullanır

async function fetchSitemapUrls(sitemapUrl: string): Promise<string[]> {
    console.log(`[Sitemap] Fetching urls from: ${sitemapUrl}`);

    try {
        const response = await fetch(sitemapUrl);
        if (!response.ok) {
            throw new Error(`Sitemap fetch failed: ${response.status}`);
        }

        const xml = await response.text();
        const $ = cheerio.load(xml, { xmlMode: true });

        const urls: string[] = [];

        // 1. Eğer bu bir sitemap index ise alt sitemapleri çekelim
        const sitemaps = $('sitemap > loc').map((_, el) => $(el).text()).get();

        if (sitemaps.length > 0) {
            console.log(`[Sitemap] Found index with ${sitemaps.length} sub-sitemaps. Processing...`);
            for (const subSitemap of sitemaps) {
                const subUrls = await fetchSitemapUrls(subSitemap);
                urls.push(...subUrls);
            }
        } else {
            // 2. Normal sitemap ise direkt loc'ları alalım
            $('url > loc').each((_, el) => {
                const url = $(el).text();
                // Sadece SITE_URL ile başlayanları alalım (internal)
                if (url && url.startsWith(SITE_URL)) {
                    urls.push(url.replace(/\/$/, '')); // Trailing slash temizliği
                }
            });
        }

        // Tekilleştirme
        return [...new Set(urls)];

    } catch (error: any) {
        console.error(`[Sitemap] Error fetching ${sitemapUrl}: ${error.message}`);
        return [];
    }
}

async function run() {
    console.log('--- Internal Link Crawler Started ---');
    console.log(`Target Site: ${SITE_URL}`);

    // 1. URL'leri topla (Sitemap üzerinden)
    let allUrls = await fetchSitemapUrls(SITEMAP_URL);

    if (allUrls.length === 0) {
        console.error('[Error] No URLs found in sitemap! Check SITEMAP_URL.');
        process.exit(1);
    }

    // TEST: Sadece ilk 100 URL'i tarayalım
    const totalDiscovered = allUrls.length;
    allUrls = allUrls.slice(0, 100);
    console.log(`[Test] Crawling only 100 URLs. Total discovered in sitemap: ${totalDiscovered}`);

    // 2. Crawler'ı başlat
    const crawler = new InternalLinkCrawler({
        baseUrl: SITE_URL,
        concurrency: 20,
        delayMs: 200,
        contentSelector: 'article, main, .content, .single-post-content',
    });

    const startTime = Date.now();
    await crawler.crawlAll(allUrls);
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log(`--- Crawler Finished in ${duration}s ---`);
}

run().catch(error => {
    console.error('[Fatal Error] Crawler failed:', error);
    process.exit(1);
});
