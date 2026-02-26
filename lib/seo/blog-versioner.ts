/**
 * Blog Change Management - Versioner Module
 * 
 * Fetches HTML from blog pages, calculates checksums, and updates versions in Supabase.
 */

import * as cheerio from 'cheerio';
import crypto from 'crypto';
import pLimit from 'p-limit';
import { getSupabase } from '../db/connection';

const DEFAULT_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36 (Antigravity BlogCrawler/1.0)';
const CONCURRENCY_LIMIT = 5;

export interface BlogScanResult {
    url: string;
    version: number;
    changed: boolean;
    error?: string;
}

export class BlogVersioner {
    private limit = pLimit(CONCURRENCY_LIMIT);
    private supabase = getSupabase();

    /**
     * Scans a list of blog URLs and creates new versions if changes are detected.
     */
    async scanUrls(urls: string[]): Promise<BlogScanResult[]> {
        console.log(`[BlogVersioner] Starting scan for ${urls.length} URLs...`);

        const tasks = urls.map(url => {
            return this.limit(async () => {
                try {
                    return await this.scanSinglePage(url);
                } catch (error: any) {
                    console.error(`[BlogVersioner] Critical error for ${url}:`, error.message);
                    return { url, version: 0, changed: false, error: error.message };
                }
            });
        });

        const results = await Promise.all(tasks);
        console.log(`[BlogVersioner] Scan complete. Total: ${results.length}, Changed: ${results.filter(r => r.changed).length}`);
        return results;
    }

    /**
     * Scans a single page, detects changes, and saves version if needed.
     */
    private async scanSinglePage(url: string): Promise<BlogScanResult> {
        // 1. Fetch current page from DB
        const { data: pageData, error: pageError } = await this.supabase
            .from('blog_pages')
            .select('*')
            .eq('url', url)
            .single();

        if (pageError && pageError.code !== 'PGRST116') { // PGRST116 common code for "not found"
            throw new Error(`DB Error fetching page: ${pageError.message}`);
        }

        // 2. Performance Optimization: Check HEAD request first
        // If we have a saved blog_modified_at, we can check if it changed before downloading whole HTML
        if (pageData?.blog_modified_at) {
            try {
                const headResponse = await fetch(url, {
                    method: 'HEAD',
                    headers: { 'User-Agent': DEFAULT_USER_AGENT },
                    signal: AbortSignal.timeout(5000),
                });

                // Note: Some servers don't return Last-Modified or Etag reliable for dynamic CMS
                // but we checked that your site provides this in JSON-LD.
                // Since JSON-LD check requires full HTML, we'll proceed the full fetch for now
                // but keeping this structure for future ETag/Last-Modified header support.
            } catch (e) {
                console.warn(`[BlogVersioner] HEAD check failed for ${url}, falling back to GET.`);
            }
        }

        // 3. Fetch HTML from URL
        const response = await fetch(url, {
            headers: { 'User-Agent': DEFAULT_USER_AGENT },
            signal: AbortSignal.timeout(15000),
        });

        if (!response.ok) {
            throw new Error(`HTTP Error ${response.status}`);
        }

        const rawHtml = await response.text();
        const { seoHtml: cleanHtml, modifiedAt } = this.cleanHtmlContent(rawHtml);

        // 3. Find latest version or create new page
        let targetPageId: string;
        let lastChecksum: string | null = null;
        let lastVersion = 0;

        if (!pageData) {
            // New page, create it
            const { data: newPage, error: createError } = await this.supabase
                .from('blog_pages')
                .insert({ url, last_version: 0 })
                .select()
                .single();

            if (createError) throw new Error(`DB Error creating page: ${createError.message}`);
            targetPageId = newPage.id;
        } else {
            targetPageId = pageData.id;
            lastVersion = pageData.last_version;

            // Fetch latest snapshot to compare checksum
            const { data: snapshot, error: snapshotError } = await this.supabase
                .from('blog_page_snapshots')
                .select('checksum')
                .eq('page_id', targetPageId)
                .order('version', { ascending: false })
                .limit(1)
                .single();

            if (snapshot) {
                lastChecksum = snapshot.checksum;
            }
        }

        // 4. Performance Optimization: If modification date matches, skip checksum & DB work
        // Only skip if DB date exists AND matches HTML date
        if (modifiedAt && pageData?.blog_modified_at && new Date(modifiedAt).getTime() === new Date(pageData.blog_modified_at).getTime()) {
            // No need to even calculate checksum, we know it hasn't changed
            await this.supabase
                .from('blog_pages')
                .update({ last_scanned: new Date().toISOString() })
                .eq('id', targetPageId);

            return { url, version: lastVersion, changed: false };
        }

        const checksum = this.calculateChecksum(cleanHtml);

        // 5. Compare and handle versioning
        if (checksum === lastChecksum) {
            // No changes (Fallback if modifiedAt wasn't available or reliable)
            await this.supabase.from('blog_pages').update({ last_scanned: new Date().toISOString() }).eq('id', targetPageId);
            return { url, version: lastVersion, changed: false };
        }

        // Change detected! Create new version
        const nextVersion = lastVersion + 1;
        const { error: insertError } = await this.supabase
            .from('blog_page_snapshots')
            .insert({
                page_id: targetPageId,
                version: nextVersion,
                html_content: cleanHtml,
                checksum: checksum,
                blog_modified_at: modifiedAt // HTML'den gelen gerçek tarih
            });

        if (insertError) throw new Error(`DB Error creating snapshot: ${insertError.message}`);

        // Update page metadata
        await this.supabase
            .from('blog_pages')
            .update({
                last_version: nextVersion,
                last_scanned: new Date().toISOString(),
                blog_modified_at: modifiedAt // Sayfa ana listesi için de güncelliyoruz
            })
            .eq('id', targetPageId);

        console.log(`[BlogVersioner] New version v${nextVersion} created for ${url}`);
        return { url, version: nextVersion, changed: true };
    }

    /**
     * Extracts ONLY SEO-relevant elements from HTML to filter out noise.
     * Also tries to find the blog's last modification date.
     */
    private cleanHtmlContent(html: string): { seoHtml: string; modifiedAt: string | null } {
        const $ = cheerio.load(html);

        // 1. Extract Meta SEO Elements
        const title = $('title').text().trim();
        const metaDescription = $('meta[name="description"]').attr('content') || '';

        // 2. Extract Modification Date (SEO Signal)
        let modifiedAt: string | null = null;
        modifiedAt = $('meta[property="article:modified_time"]').attr('content') ||
            $('meta[name="revised"]').attr('content') ||
            $('meta[property="og:updated_time"]').attr('content') || null;

        if (!modifiedAt) {
            $('script[type="application/ld+json"]').each((_, el) => {
                try {
                    const content = $(el).html() || '{}';
                    const ld = JSON.parse(content);

                    // Direct property
                    if (ld.dateModified) {
                        modifiedAt = ld.dateModified;
                        return false; // break loop
                    }

                    // Check in @graph (common in Yoast/RankMath)
                    if (ld['@graph'] && Array.isArray(ld['@graph'])) {
                        const item = ld['@graph'].find((i: any) => i.dateModified);
                        if (item) {
                            modifiedAt = item.dateModified;
                            return false;
                        }
                    }

                    // Check in simple array
                    if (Array.isArray(ld)) {
                        const item = ld.find((i: any) => i.dateModified);
                        if (item) {
                            modifiedAt = item.dateModified;
                            return false;
                        }
                    }
                } catch (e) { }
            });
        }

        // 3. Identify and Clean Main Content Area
        const contentSelector = 'article, main, .content, .single-post-content, #content, .post-body';
        const $content = $(contentSelector).first();
        const $root = $content.length > 0 ? $content : $('body');

        // Remove known dynamic containers by header text (Turkey specific SEO noise)
        const noiseHeaders = ["İlginizi Çekebilir", "Benzer Yazılar", "Popüler İçerikler", "Yorumlar", "Benzer İçerikler"];
        $root.find('h1, h2, h3, h4, h5').each((_, el) => {
            const $el = $(el);
            const text = $el.text().trim();
            if (noiseHeaders.some(h => text.includes(h))) {
                // Remove the header and its next container (usually the grid of posts)
                // Or better, if it's in a section, remove the whole section
                const $section = $el.closest('section, div.py-20, div.mt-16');
                if ($section.length) $section.remove();
                else {
                    $el.next().remove();
                    $el.remove();
                }
            }
        });

        // Global noise removal
        $root.find('.related-posts, .similar-posts, .social-share, footer, nav, script, style, .comments, #comments, .breadcrumb, .bread-crumbs, .post-navigation, .author-box').remove();

        // 4. Reconstruct a Clean SEO Document
        let seoHtml = `<!-- SEO VERSIONING SYSTEM -->\n`;
        seoHtml += `<div class="seo-meta">\n`;
        seoHtml += `  <div class="field"><strong>TITLE:</strong> ${title}</div>\n`;
        seoHtml += `  <div class="field"><strong>META DESCRIPTION:</strong> ${metaDescription}</div>\n`;
        if (modifiedAt) seoHtml += `  <div class="field"><strong>MODIFIED AT (SOCIAL):</strong> ${modifiedAt}</div>\n`;
        seoHtml += `</div>\n<hr/>\n`;

        seoHtml += `<div class="seo-content">\n`;

        $root.find('h1, h2, h3, h4, h5, h6, p, a, img, li').each((_, el) => {
            const $el = $(el);
            const tagName = el.tagName.toLowerCase();

            if (tagName.startsWith('h')) {
                seoHtml += `<${tagName}>${$el.text().trim()}</${tagName}>\n`;
            } else if (tagName === 'p' || tagName === 'li') {
                const text = $el.text().trim();
                if (text.length > 3) {
                    seoHtml += `<${tagName}>${text}</${tagName}>\n`;
                }
            } else if (tagName === 'a') {
                const href = $el.attr('href') || '';
                const text = $el.text().trim();
                if (text && href && !href.startsWith('#')) {
                    seoHtml += `<p class="seo-link"><strong>LINK [${text}]:</strong> ${href}</p>\n`;
                }
            } else if (tagName === 'img') {
                const alt = $el.attr('alt') || '';
                const src = $el.attr('src') || '';
                if (alt || src) {
                    seoHtml += `<p class="seo-img"><strong>GÖRSEL [Alt: ${alt}]:</strong> ${src}</p>\n`;
                }
            }
        });

        seoHtml += `</div>`;

        return { seoHtml, modifiedAt };
    }

    private calculateChecksum(content: string): string {
        return crypto.createHash('md5').update(content).digest('hex');
    }
}
