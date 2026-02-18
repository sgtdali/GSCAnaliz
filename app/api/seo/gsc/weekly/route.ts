/**
 * GET /api/seo/gsc/weekly
 * 
 * Haftalık WoW analiz verisi.
 * 
 * Query params:
 *   - page (optional): URL — boşsa tüm sayfalar
 *   - weeks (optional): kaç hafta geriye git (default: 8)
 * 
 * Response:
 * {
 *   success: true,
 *   data: [
 *     {
 *       week_start, week_end, page,
 *       total_clicks, total_impressions, avg_ctr, avg_position, data_days,
 *       prev_clicks, prev_impressions,
 *       click_change_pct, impression_change_pct, ctr_delta, position_delta
 *     }
 *   ],
 *   meta: { timestamp, totalRows, page, weeks }
 * }
 */

import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api/middleware';
import { getWeeklySummary } from '@/lib/db/queries';

export async function GET(request: NextRequest) {

    const searchParams = request.nextUrl.searchParams;
    const page = searchParams.get('page') || undefined;
    const weeks = parseInt(searchParams.get('weeks') || '8', 10);

    if (isNaN(weeks) || weeks < 1 || weeks > 52) {
        return errorResponse('Invalid parameter: weeks must be between 1 and 52', 400);
    }

    try {
        const data = await getWeeklySummary(page, weeks);

        return successResponse(data, {
            totalRows: data.length,
            page: page || 'all',
            weeks,
        });
    } catch (error) {
        console.error('[API /weekly] Error:', (error as Error).message);
        return errorResponse('Internal server error', 500);
    }
}
