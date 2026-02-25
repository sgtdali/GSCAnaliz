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

        console.log(`[API /low-hanging-fruits] Fetching 30 days data: ${startDateStr} - ${endDateStr}`);

        // GSC'den query + page verisini çek
        // En yüksek gösterimli fırsatları bulmak için geniş bir limit kullanıyoruz
        const data = await fetchCannibalizationData(startDateStr, endDateStr, 10000);

        // 1. Sayfanın hemen dışında kalan (11-20. sıra) ve gösterimi yüksek olanları filtrele
        const fruits = data
            .filter(r => r.position >= 10.1 && r.position <= 20.0)
            // Clicks'ten ziyade Impressions'a göre sıralıyoruz çünkü bu bir "potansiyel" analizi
            .sort((a, b) => b.impressions - a.impressions)
            // En iyi 50 fırsatı dönelim
            .slice(0, 50);

        return successResponse({
            startDate: startDateStr,
            endDate: endDateStr,
            count: fruits.length,
            data: fruits
        });

    } catch (error: any) {
        console.error('[API /low-hanging-fruits] Error:', error);
        return errorResponse('Low-hanging fruits analysis failed: ' + error.message, 500);
    }
}
