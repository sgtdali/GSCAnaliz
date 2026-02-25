import { NextRequest, NextResponse } from 'next/server';
import { inspectUrl } from '@/lib/gsc/client';
import { getIndexStatuses, upsertIndexStatus, getSiteMetadata, updateSiteMetadata } from '@/lib/db/queries';

export const maxDuration = 120;

export async function GET(request: NextRequest) {
    try {
        const task = request.nextUrl.searchParams.get('task') || 'db';

        // Task: DB - Fetch from Supabase (default)
        if (task === 'db') {
            const data = await getIndexStatuses();
            const lastSync = await getSiteMetadata('last_indexing_sync');
            return NextResponse.json({ success: true, data, lastSync });
        }

        // Task: LIST - Just return the URLs from sitemap
        if (task === 'list') {
            const sitemapUrl = 'https://uygunbakim.com/sitemap.xml';
            let blogUrls: string[] = [];

            const sitemapRes = await fetch(sitemapUrl);
            const sitemapXml = await sitemapRes.text();

            const matches = sitemapXml.match(/<loc>(https:\/\/uygunbakim\.com\/blog\/.*?)<\/loc>/g);
            if (matches) {
                blogUrls = matches.map(m => m.replace(/<\/?loc>/g, ''));
            }

            return NextResponse.json({ success: true, urls: blogUrls });
        }

        // Task: INSPECT - Inspect a single URL AND SAVE TO DB
        if (task === 'inspect') {
            const url = request.nextUrl.searchParams.get('url');
            if (!url) throw new Error('URL parametresi eksik.');

            const inspection = await inspectUrl(url);

            const result = {
                url,
                verdict: inspection.indexStatusResult?.verdict || 'UNKNOWN',
                coverage_state: inspection.indexStatusResult?.coverageState || 'No Data',
                last_crawl_time: inspection.indexStatusResult?.lastCrawlTime || null,
                google_canonical: inspection.indexStatusResult?.googleCanonical || null,
                status_type: inspection.indexStatusResult?.verdict === 'PASSING' ? 'success' :
                    inspection.indexStatusResult?.verdict === 'NEUTRAL' ? 'warning' : 'error'
            };

            // SYNC TO DB
            await upsertIndexStatus(result);

            return NextResponse.json({ success: true, data: result });
        }

        // Task: MARK_SYNC - Mark the end of a full sync session
        if (task === 'mark_sync') {
            const now = new Date().toISOString();
            await updateSiteMetadata('last_indexing_sync', now);
            return NextResponse.json({ success: true, lastSync: now });
        }

        return NextResponse.json({ success: false, error: 'Lütfen task belirtin (db, list, inspect veya mark_sync).' });

    } catch (error: any) {
        console.error('[API /indexing] Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
