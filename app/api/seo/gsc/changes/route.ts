/**
 * POST /api/seo/gsc/changes
 * GET  /api/seo/gsc/changes
 * 
 * İçerik değişiklik günlüğü (CRUD).
 * 
 * POST Body:
 * {
 *   page: string,             // URL
 *   changeType: string,       // title | meta | content | internal_link | schema | tech | other
 *   description: string,      // Açıklama
 *   actor?: string,           // Kim yaptı (default: 'manual')
 *   changedAt?: string        // ISO date (default: now)
 * }
 * 
 * GET Query params:
 *   - page (optional): URL filtresi
 *   - limit (optional): max kayıt (default: 50)
 * 
 * Response (POST):
 * { success: true, data: { id: number } }
 * 
 * Response (GET):
 * { success: true, data: [ { id, page, change_type, description, actor, changed_at } ] }
 */

import { NextRequest } from 'next/server';
import { validateApiKey, successResponse, errorResponse } from '@/lib/api/middleware';
import { insertChangeLog } from '@/lib/db/upsert';
import { getSupabase } from '@/lib/db/connection';
import { z } from 'zod';

// Input validation schema
const ChangeLogSchema = z.object({
    page: z.string().url('Invalid URL format'),
    changeType: z.enum(['title', 'meta', 'content', 'internal_link', 'schema', 'tech', 'other']),
    description: z.string().min(1, 'Description is required').max(5000),
    actor: z.string().optional().default('manual'),
    changedAt: z.string().datetime().optional(),
});

export async function POST(request: NextRequest) {
    const authError = validateApiKey(request);
    if (authError) return authError;

    try {
        const body = await request.json();
        const parsed = ChangeLogSchema.safeParse(body);

        if (!parsed.success) {
            return errorResponse(
                `Validation error: ${parsed.error.errors.map(e => e.message).join(', ')}`,
                400
            );
        }

        const result = await insertChangeLog({
            page: parsed.data.page,
            changeType: parsed.data.changeType,
            description: parsed.data.description,
            actor: parsed.data.actor,
            changedAt: parsed.data.changedAt,
        });

        if (!result) {
            return errorResponse('Failed to insert change log', 500);
        }

        return successResponse({ id: result.id }, { action: 'created' });
    } catch (error) {
        console.error('[API /changes POST] Error:', (error as Error).message);
        return errorResponse('Internal server error', 500);
    }
}

export async function GET(request: NextRequest) {
    const authError = validateApiKey(request);
    if (authError) return authError;

    const searchParams = request.nextUrl.searchParams;
    const page = searchParams.get('page');
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    try {
        const supabase = getSupabase();

        let query = supabase
            .from('content_change_log')
            .select('id, page, change_type, description, actor, changed_at, created_at')
            .order('changed_at', { ascending: false })
            .limit(limit);

        if (page) {
            query = query.eq('page', page);
        }

        const { data, error } = await query;

        if (error) {
            throw new Error(`Query failed: ${error.message}`);
        }

        return successResponse(data || [], {
            totalRows: data?.length || 0,
            page: page || 'all',
            limit,
        });
    } catch (error) {
        console.error('[API /changes GET] Error:', (error as Error).message);
        return errorResponse('Internal server error', 500);
    }
}
