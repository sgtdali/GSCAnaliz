import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/db/connection';

/**
 * GET /api/blog/versions
 * Fetches version history for a specific blog page.
 */
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const pageId = searchParams.get('pageId');
        const includeHtml = searchParams.get('includeHtml') === 'true';

        if (!pageId) {
            return NextResponse.json({ success: false, error: 'pageId is required' }, { status: 400 });
        }

        const supabase = getSupabase();

        // Get versions for specific page
        const selectFields = ['id', 'version', 'created_at', 'checksum'];
        if (includeHtml) selectFields.push('html_content');

        const query = supabase
            .from('blog_page_snapshots')
            .select(selectFields.join(','))
            .eq('page_id', pageId)
            .order('version', { ascending: false });

        const { data: versions, error } = await query;

        if (error) {
            console.error('[Versions Error]', error);
            throw new Error(`DB Error fetching versions: ${error.message}`);
        }

        return NextResponse.json({
            success: true,
            data: {
                versions: versions || []
            }
        });

    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
