import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/db/connection';
import { BlogVersioner } from '@/lib/seo/blog-versioner';
import * as cheerio from 'cheerio';

/**
 * POST /api/blog/scan
 * Triggers a scan of all blog pages.
 */
export async function POST(req: Request) {
    try {
        const payload = await req.json().catch(() => ({}));
        const limit = payload.limit;

        const SITE_URL = 'https://uygunbakim.com';
        const SITEMAP_URL = `${SITE_URL}/sitemap.xml`;

        // 1. Fetch URLs from Sitemap (Filtering for /blog/)
        const response = await fetch(SITEMAP_URL);
        const xml = await response.text();
        const $ = cheerio.load(xml, { xmlMode: true });

        let blogUrls: string[] = [];
        $('url > loc').each((_, el) => {
            const url = $(el).text();
            if (url && url.includes('/blog/') && url.startsWith(SITE_URL)) {
                blogUrls.push(url.replace(/\/$/, ''));
            }
        });

        blogUrls = [...new Set(blogUrls)];

        if (limit) {
            blogUrls = blogUrls.slice(0, limit);
        }

        if (blogUrls.length === 0) {
            return NextResponse.json({ success: true, message: "No blog URLs found to scan." });
        }

        // 2. Start Versioning
        const versioner = new BlogVersioner();
        const results = await versioner.scanUrls(blogUrls);

        return NextResponse.json({
            success: true,
            data: {
                scanned: results.length,
                changed: results.filter(r => r.changed).length,
                details: results
            }
        });

    } catch (error: any) {
        console.error('[Scan Error]', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
