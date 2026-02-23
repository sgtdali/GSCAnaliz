/**
 * GET /api/seo/gsc/urls
 *
 * GSC'den bugüne kadar gösterim almış benzersiz URL'lerin listesini çeker.
 *
 * Query params:
 *   - prefix (optional): URL prefix filtresi (default: /blog/)
 *                         Boş string göndererek tüm URL'leri çekebilirsiniz.
 *   - startDate (optional): Başlangıç tarihi YYYY-MM-DD (default: 2020-01-01)
 *   - endDate (optional): Bitiş tarihi YYYY-MM-DD (default: bugün)
 *
 * Response:
 * {
 *   success: true,
 *   data: {
 *     urls: [
 *       { url, totalImpressions, totalClicks, avgPosition, avgCtr }
 *     ],
 *     totalUniqueUrls: number
 *   },
 *   meta: { timestamp, startDate, endDate, prefix }
 * }
 */

import { NextRequest } from 'next/server';
import { google } from 'googleapis';
import { getAuthenticatedClient } from '@/lib/gsc/auth';
import { successResponse, errorResponse } from '@/lib/api/middleware';

const SITE_URL = process.env.GSC_SITE_URL || 'sc-domain:uygunbakim.com';
const DEFAULT_URL_PREFIX = process.env.GSC_URL_PREFIX || '/blog/';
const MAX_ROWS_PER_REQUEST = 25000;

interface UrlStats {
    url: string;
    totalImpressions: number;
    totalClicks: number;
    avgPosition: number;
    avgCtr: number;
}

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;

    // Prefix: boş string = tüm URL'ler, undefined = default /blog/
    const prefixParam = searchParams.get('prefix');
    const prefix = prefixParam !== null ? prefixParam : DEFAULT_URL_PREFIX;

    // Tarih aralığı — varsayılan: mümkün olan en geniş aralık
    const startDate = searchParams.get('startDate') || '2020-01-01';

    // Bugünün tarihi (GSC verisi genellikle 2-3 gün gecikmeli olur)
    const today = new Date();
    const defaultEndDate = today.toISOString().split('T')[0];
    const endDate = searchParams.get('endDate') || defaultEndDate;

    try {
        const auth = await getAuthenticatedClient();
        const searchConsole = google.searchconsole({ version: 'v1', auth });

        // Dimension filtresi
        const dimensionFilterGroups: any[] = [];
        if (prefix) {
            dimensionFilterGroups.push({
                filters: [{
                    dimension: 'page',
                    operator: 'includingRegex',
                    expression: `https://uygunbakim\\.com${prefix.replace(/\//g, '\\/')}`,
                }],
            });
        }

        // Pagination ile tüm sonuçları çek
        const urlMap = new Map<string, { impressions: number; clicks: number; position: number; ctr: number; count: number }>();
        let startRow = 0;
        let hasMore = true;
        let totalApiRows = 0;

        while (hasMore) {
            console.log(`[GSC /urls] Fetching rows starting at ${startRow}...`);

            const result = await searchConsole.searchanalytics.query({
                siteUrl: SITE_URL,
                requestBody: {
                    startDate,
                    endDate,
                    dimensions: ['page'],  // Sadece page — tarih kırılımı yok, toplu veri
                    rowLimit: MAX_ROWS_PER_REQUEST,
                    startRow,
                    dimensionFilterGroups: dimensionFilterGroups.length > 0 ? dimensionFilterGroups : undefined,
                    type: 'web',
                },
            });

            const rows = result.data.rows || [];
            totalApiRows += rows.length;

            for (const row of rows) {
                const url = row.keys?.[0];
                if (!url) continue;

                const existing = urlMap.get(url);
                if (existing) {
                    // Aynı URL birden fazla kez gelmez (page dimension tek), ama güvenlik için
                    existing.impressions += row.impressions || 0;
                    existing.clicks += row.clicks || 0;
                    existing.position += row.position || 0;
                    existing.ctr += row.ctr || 0;
                    existing.count += 1;
                } else {
                    urlMap.set(url, {
                        impressions: row.impressions || 0,
                        clicks: row.clicks || 0,
                        position: row.position || 0,
                        ctr: row.ctr || 0,
                        count: 1,
                    });
                }
            }

            // Pagination kontrolü
            if (rows.length < MAX_ROWS_PER_REQUEST) {
                hasMore = false;
            } else {
                startRow += rows.length;
            }
        }

        // Map → Array dönüşümü, impression'a göre sırala (en çok gösterim alan üstte)
        const urls: UrlStats[] = Array.from(urlMap.entries())
            .map(([url, stats]) => ({
                url,
                totalImpressions: stats.impressions,
                totalClicks: stats.clicks,
                avgPosition: Math.round((stats.position / stats.count) * 100) / 100,
                avgCtr: Math.round((stats.ctr / stats.count) * 10000) / 100, // 0.0345 → 3.45%
            }))
            .sort((a, b) => b.totalImpressions - a.totalImpressions);

        console.log(`[GSC /urls] ${urls.length} benzersiz URL bulundu (${totalApiRows} API row).`);

        return successResponse(
            {
                urls,
                totalUniqueUrls: urls.length,
            },
            {
                startDate,
                endDate,
                prefix: prefix || '(all)',
                apiRowsFetched: totalApiRows,
            }
        );
    } catch (error) {
        console.error('[API /urls] Error:', (error as Error).message);
        return errorResponse(`GSC API error: ${(error as Error).message}`, 500);
    }
}
