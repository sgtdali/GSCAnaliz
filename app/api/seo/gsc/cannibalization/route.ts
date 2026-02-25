import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api/middleware';
import { fetchCannibalizationData } from '@/lib/gsc/client';
import { subDays, format } from 'date-fns';

export async function GET(request: NextRequest) {
    try {
        // Son 30 gün (GSC 2 gün geriden gelir)
        const today = new Date();
        const endDate = subDays(today, 2);
        const startDate = subDays(endDate, 30);

        const startDateStr = format(startDate, 'yyyy-MM-dd');
        const endDateStr = format(endDate, 'yyyy-MM-dd');

        console.log(`[API /cannibalization] Fetching 30 days data: ${startDateStr} - ${endDateStr}`);

        // GSC'den query + page verisini çek
        // Cannibalization için genellikle yüksek row limit gerekir
        const data = await fetchCannibalizationData(startDateStr, endDateStr, 10000);

        // Query bazlı grupla
        const queryGroups = new Map<string, any[]>();

        for (const row of data) {
            const existing = queryGroups.get(row.query) || [];
            existing.push(row);
            queryGroups.set(row.query, existing);
        }

        // Birden fazla sayfası olan query'leri ayıkla (Cannibalization)
        const cannibalized = Array.from(queryGroups.entries())
            .filter(([_, pages]) => pages.length > 1)
            .map(([query, pages]) => {
                // Toplam clicks ve impressions hesapla
                const totalClicks = pages.reduce((sum, p) => sum + p.clicks, 0);
                const totalImpressions = pages.reduce((sum, p) => sum + p.impressions, 0);

                // Sayfaları clicks'e göre sırala
                const sortedPages = pages.sort((a, b) => b.clicks - a.clicks);

                return {
                    query,
                    totalClicks,
                    totalImpressions,
                    pageCount: pages.length,
                    pages: sortedPages
                };
            })
            // Önemine göre sırala (en çok tıklama alan cannibalization'lar en başta)
            .sort((a, b) => b.totalClicks - a.totalClicks || b.totalImpressions - a.totalImpressions);

        return successResponse({
            startDate: startDateStr,
            endDate: endDateStr,
            count: cannibalized.length,
            data: cannibalized.slice(0, 100) // Şimdilik ilk 100'ü dönelim
        });

    } catch (error) {
        console.error('[API /cannibalization] Error:', error);
        return errorResponse('Cannibalization data fetch failed', 500);
    }
}
