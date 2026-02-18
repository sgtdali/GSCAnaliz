/**
 * GET /api/auth/google/callback
 * 
 * OAuth callback. Google yetkilendirmeden sonra buraya döner.
 * Token'ları alır ve ekranda gösterir.
 * 
 * ÖNEMLİ: Bu token'ları .env dosyasına kaydedin!
 * Bu endpoint sadece ilk kurulumda kullanılır.
 */

import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForTokens } from '@/lib/gsc/auth';

export async function GET(request: NextRequest) {
    const code = request.nextUrl.searchParams.get('code');
    const error = request.nextUrl.searchParams.get('error');

    if (error) {
        return NextResponse.json(
            { error: `Google OAuth error: ${error}` },
            { status: 400 }
        );
    }

    if (!code) {
        return NextResponse.json(
            { error: 'Missing authorization code' },
            { status: 400 }
        );
    }

    try {
        const tokens = await exchangeCodeForTokens(code);

        // Güvenlik notu: Production'da token'ları ekranda göstermek yerine
        // doğrudan Supabase Vault veya env variable olarak kaydedin.
        return NextResponse.json({
            success: true,
            message: 'OAuth tokens obtained. Save these to your .env file!',
            instructions: [
                'Add these to your .env.local file:',
                `GOOGLE_ACCESS_TOKEN=${tokens.access_token}`,
                `GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`,
                '',
                '⚠️ IMPORTANT: Do not share these tokens!',
                'The refresh_token is permanent unless revoked.',
                'The access_token expires in ~1 hour but will auto-refresh.',
            ],
            tokens: {
                access_token: tokens.access_token.substring(0, 20) + '...',
                refresh_token: tokens.refresh_token.substring(0, 20) + '...',
                expiry_date: tokens.expiry_date,
            },
            // Development only — production'da full token gösterme
            ...(process.env.NODE_ENV === 'development' ? {
                full_tokens: tokens,
            } : {}),
        });
    } catch (err) {
        return NextResponse.json(
            { error: (err as Error).message },
            { status: 500 }
        );
    }
}
