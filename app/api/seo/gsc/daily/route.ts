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
import { validateApiKey, successResponse, errorResponse } from '@/lib/api/middleware';
import { getDailyMetrics } from '@/lib/db/queries';

export async function GET(request: NextRequest) {
    // Auth check
    const authError = validateApiKey(request);
    if (authError) return authError;

    // Query params
    const searchParams = request.nextUrl.searchParams;
    const page = searchParams.get('page');
    const days = parseInt(searchParams.get('days') || '30', 10);

    if (!page) {
        return errorResponse('Missing required parameter: page', 400);
    }

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
