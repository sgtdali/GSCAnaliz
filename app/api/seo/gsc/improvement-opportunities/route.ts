import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api/middleware';
import { getSupabase } from '@/lib/db/connection';
import { performPageAudit } from '@/lib/analysis/page-audit';

export async function GET(request: NextRequest) {
    const supabase = getSupabase();

    try {
        // En son haftalık veriden fırsatları bul
        // Kriterler: position [5, 20], impressions > 200, ctr < 0.08
        const { data, error } = await supabase
            .from('weekly_page_summary')
            .select('*')
            .gte('avg_position', 5)
            .lte('avg_position', 20)
            .gte('total_impressions', 200)
            .lt('avg_ctr', 8) // CTR %8'den küçük (avg_ctr tabloda 0-100 veya 0.0-1.0 mı? WeeklySummary'de total_clicks / total_impressions * 100 yapılmıştı sanırım)
            .order('total_impressions', { ascending: false })
            .limit(20);

        if (error) throw error;

        return successResponse({
            count: data.length,
            opportunities: data.map(item => ({
                page: item.page,
                clicks: item.total_clicks,
                impressions: item.total_impressions,
                ctr: item.avg_ctr,
                position: item.avg_position,
                // Skoru frontend'de lazy-load veya bulk-batch mi yapmalıyız? 
                // Şimdilik sadece datayı döndürelim, UI'da butonla analiz ettirebiliriz.
            }))
        });

    } catch (error: any) {
        console.error('[API improvement-opportunities]', error);
        return errorResponse(error.message, 500);
    }
}
