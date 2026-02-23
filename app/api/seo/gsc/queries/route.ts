/**
 * GET /api/seo/gsc/queries
 * 
 * Belirli bir sayfa için anahtar kelime (query) bazlı değişim analizi.
 * Son 7 gün vs Önceki 7 gün karşılaştırması yapar.
 * 
 * Query params:
 *   - page (required): Analiz edilecek URL
 */

import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api/middleware';
import { fetchSingleUrlDetail } from '@/lib/gsc/client';
import { subDays, format } from 'date-fns';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const page = searchParams.get('page');

    if (!page) {
        return errorResponse('Missing required parameter: page', 400);
    }

    try {
        // Tarih aralıklarını hesapla (GSC 2-3 gün geriden gelir)
        const today = new Date();
        const endDate = subDays(today, 2);
        const midDate = subDays(endDate, 7);
        const startDate = subDays(midDate, 7);

        const rangeCurrent = {
            start: format(subDays(midDate, -1), 'yyyy-MM-dd'),
            end: format(endDate, 'yyyy-MM-dd')
        };
        const rangePrevious = {
            start: format(startDate, 'yyyy-MM-dd'),
            end: format(midDate, 'yyyy-MM-dd')
        };

        // İki periyot için de veriyi çek
        const [currentData, previousData] = await Promise.all([
            fetchSingleUrlDetail(page, rangeCurrent.start, rangeCurrent.end),
            fetchSingleUrlDetail(page, rangePrevious.start, rangePrevious.end)
        ]);

        // Query'leri karşılaştır
        const prevMap = new Map(previousData.queries.map(q => [q.query, q]));

        const comparisons = currentData.queries.map(curr => {
            const prev = prevMap.get(curr.query);
            return {
                query: curr.query,
                current: {
                    clicks: curr.clicks,
                    impressions: curr.impressions,
                    position: curr.position
                },
                previous: prev ? {
                    clicks: prev.clicks,
                    impressions: prev.impressions,
                    position: prev.position
                } : null,
                diff: {
                    clicks: curr.clicks - (prev?.clicks || 0),
                    impressions: curr.impressions - (prev?.impressions || 0),
                    position: (prev?.position || 0) - curr.position // Pozisyon düşerse (sayısal azalırsa) iyidir
                }
            };
        });

        // Tıklama kaybına göre veya yeni kazanılanlara göre sırala
        // (Şu an en çok tıklama kaybedenleri başa alalım)
        comparisons.sort((a, b) => a.diff.clicks - b.diff.clicks);

        return successResponse({
            page,
            periods: { current: rangeCurrent, previous: rangePrevious },
            queries: comparisons.slice(0, 50) // En önemli 50 değişim
        });

    } catch (error) {
        console.error('[API /queries] Error:', error);
        return errorResponse('GSC data fetch failed', 500);
    }
}
