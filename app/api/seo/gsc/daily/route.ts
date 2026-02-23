/**
 * GET /api/seo/gsc/daily
 * 
 * URL bazlı günlük GSC metrikleri.
 * 
 * Query params:
 *   - page (required): URL
 *   - days (optional): kaç gün geriye git (default: 30)
 * 
 * Response:
 * {
 *   success: true,
 *   data: [
 *     { date, page, clicks, impressions, ctr, position, fetched_at }
 *   ],
 *   meta: { timestamp, totalRows, page, days }
 * }
 */

import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api/middleware';
import { getDailyMetrics } from '@/lib/db/queries';

export async function GET(request: NextRequest) {

    // Query params
    const searchParams = request.nextUrl.searchParams;
    const page = searchParams.get('page') || undefined;
    const days = parseInt(searchParams.get('days') || '30', 10);

    if (isNaN(days) || days < 1 || days > 365) {
        return errorResponse('Invalid parameter: days must be between 1 and 365', 400);
    }

    try {
        const data = await getDailyMetrics(page, days);

        return successResponse(data, {
            totalRows: data.length,
            page,
            days,
        });
    } catch (error) {
        console.error('[API /daily] Error:', (error as Error).message);
        return errorResponse('Internal server error', 500);
    }
}
