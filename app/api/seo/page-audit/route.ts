import { NextRequest, NextResponse } from 'next/server';
import { performPageAudit } from '@/lib/analysis/page-audit';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');
    const query = searchParams.get('query');

    if (!url) {
        return NextResponse.json({ success: false, error: 'URL is required' }, { status: 400 });
    }

    try {
        const auditResult = await performPageAudit(url, query || undefined);
        return NextResponse.json({ success: true, data: auditResult });
    } catch (error: any) {
        console.error('[API /page-audit] Audit error:', error.message);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
