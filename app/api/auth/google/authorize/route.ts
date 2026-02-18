/**
 * GET /api/auth/google/authorize
 * 
 * OAuth flow başlatıcı. Bu URL'i tarayıcıda aç.
 * Google yetkilendirme sayfasına yönlendirir.
 */

import { NextResponse } from 'next/server';
import { getAuthorizationUrl } from '@/lib/gsc/auth';

export async function GET() {
    try {
        const authUrl = getAuthorizationUrl();
        return NextResponse.redirect(authUrl);
    } catch (error) {
        return NextResponse.json(
            { error: (error as Error).message },
            { status: 500 }
        );
    }
}
