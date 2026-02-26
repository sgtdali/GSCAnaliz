import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/db/connection';

/**
 * GET /api/blog/pages
 * Lists all tracked blog pages and their last scan information.
 */
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const limit = parseInt(searchParams.get('limit') || '50');
        const offset = parseInt(searchParams.get('offset') || '0');

        const supabase = getSupabase();

        // Count total pages
        const { count: totalPages } = await supabase
            .from('blog_pages')
            .select('*', { count: 'exact', head: true });

        // Get paginated pages with their latest snapshot info
        const { data: pages, error } = await supabase
            .from('blog_pages')
            .select(`
                id,
                url,
                last_scanned,
                last_version,
                created_at,
                blog_modified_at
            `)
            .order('last_scanned', { ascending: false, nullsFirst: false })
            .range(offset, offset + limit - 1);

        // Map pages to include a simpler last_version_at
        const formattedPages = (pages || []).map((p: any) => ({
            ...p,
            last_version_at: p.blog_modified_at || p.created_at
        }));

        if (error) {
            console.error('[Pages Error]', error);
            throw new Error(`DB Error fetching pages: ${error.message}`);
        }

        return NextResponse.json({
            success: true,
            data: {
                totalPages: totalPages || 0,
                pages: formattedPages,
                hasMore: (pages?.length || 0) >= limit
            }
        });

    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
