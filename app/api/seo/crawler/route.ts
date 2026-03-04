import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/db/connection';
import { InternalLinkCrawler } from '@/lib/seo/crawler';
import { truncateInternalLinks } from '@/lib/db/internal-links';
import * as cheerio from 'cheerio';

/**
 * GET: Veritabanındaki link istatistiklerini döner.
 */
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const limit = parseInt(searchParams.get('limit') || '40');
        const offset = parseInt(searchParams.get('offset') || '0');

        const supabase = getSupabase();

        // Toplam link sayısı
        const { count: totalLinks } = await supabase
            .from('internal_links')
            .select('*', { count: 'exact', head: true });

        // Linkleri paginated olarak çekelim
        const { data: samples } = await supabase
            .from('internal_links')
            .select('target_page')
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        return NextResponse.json({
            success: true,
            data: {
                totalLinks: totalLinks || 0,
                samples: samples || [],
                hasMore: (samples?.length || 0) >= limit
            }
        });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

/**
 * POST: Crawler'ı başlatır.
 */
export async function POST(req: Request) {
    try {
        const payload = await req.json().catch(() => ({}));
        const limit = payload.limit; // Optional limit

        // 0. Önce tüm eski verileri silelim (Kullanıcı Talebi)
        const { success: truncateSuccess, error: truncateError } = await truncateInternalLinks();
        if (!truncateSuccess) {
            throw new Error(`Eski veriler temizlenemedi: ${truncateError}`);
        }

        const SITE_URL = 'https://uygunbakim.com';
        const SITEMAP_URL = `${SITE_URL}/sitemap.xml`;

        // 1. Sitemap'ten URL'leri çekelim
        const response = await fetch(SITEMAP_URL);
        const xml = await response.text();
        const $ = cheerio.load(xml, { xmlMode: true });

        let allUrls: string[] = [];
        $('url > loc').each((_, el) => {
            const url = $(el).text();
            if (url && url.startsWith(SITE_URL)) {
                allUrls.push(url.replace(/\/$/, ''));
            }
        });

        allUrls = [...new Set(allUrls)];

        if (limit) {
            allUrls = allUrls.slice(0, limit);
        }

        // 2. Crawler'ı arka planda değil, istek süresince (veya timeout'a kadar) çalıştıralım
        // Not: Gerçek bir üretim ortamında bu bir "job queue" olmalıdır (örn: Ingest, BullMQ)
        const crawler = new InternalLinkCrawler({
            baseUrl: SITE_URL,
            concurrency: 20,
            delayMs: 200,
            contentSelector: 'article, main, .content, .single-post-content',
        });

        // Bu işlem uzun sürebilir
        const result = await crawler.crawlAll(allUrls);

        return NextResponse.json({
            success: true,
            data: {
                message: `${allUrls.length} sayfa başarıyla tarandı.`,
                result
            }
        });

    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
