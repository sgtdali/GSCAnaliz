/**
 * GET /api/seo/gsc/impact
 * 
 * Değişiklik etki analizi.
 * Değişiklikten önceki 2 hafta vs sonraki 2 hafta karşılaştırması.
 * 
 * Query params:
 *   - changeId (required): content_change_log id
 * 
 * Response:
 * {
 *   success: true,
 *   data: {
 *     page, change_date, change_type, description,
 *     baseline_clicks, baseline_impressions, baseline_ctr, baseline_position, baseline_days,
 *     post_clicks, post_impressions, post_ctr, post_position, post_days,
 *     click_uplift_pct, impression_uplift_pct, ctr_uplift, position_change,
 *     confidence_level: 'high' | 'medium' | 'low'
 *   },
 *   meta: { timestamp, changeId }
 * }
 */

import { NextRequest } from 'next/server';
import { validateApiKey, successResponse, errorResponse } from '@/lib/api/middleware';
import { getImpactAnalysis } from '@/lib/db/queries';

export async function GET(request: NextRequest) {
    const authError = validateApiKey(request);
    if (authError) return authError;

    const searchParams = request.nextUrl.searchParams;
    const changeIdStr = searchParams.get('changeId');

    if (!changeIdStr) {
        return errorResponse('Missing required parameter: changeId', 400);
    }

    const changeId = parseInt(changeIdStr, 10);
    if (isNaN(changeId)) {
        return errorResponse('Invalid parameter: changeId must be a number', 400);
    }

    try {
        const data = await getImpactAnalysis(changeId);

        if (!data) {
            return errorResponse(`Change log not found: ${changeId}`, 404);
        }

        return successResponse(data, {
            changeId,
        });
    } catch (error) {
        console.error('[API /impact] Error:', (error as Error).message);
        return errorResponse('Internal server error', 500);
    }
}
