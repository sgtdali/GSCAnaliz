import { NextResponse } from 'next/server';
import { getIncomingLinks } from '@/lib/db/internal-links';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const url = searchParams.get('url');

        if (!url) {
            return NextResponse.json({ success: false, error: 'URL is required' }, { status: 400 });
        }

        const links = await getIncomingLinks(url);

        return NextResponse.json({
            success: true,
            data: links
        });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
