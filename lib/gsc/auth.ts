/**
 * GSC OAuth 2.0 Authentication Module
 * 
 * Google Search Console API erişimi için OAuth 2.0 yetkilendirme.
 * User OAuth kullanır (Service Account değil).
 * 
 * İlk kurulumda:
 * 1. Google Cloud Console'da OAuth 2.0 Client ID oluştur
 * 2. /api/auth/google/authorize endpoint'ine git → yetkilendirme URL'i al
 * 3. Kullanıcı izin verince callback'te token'lar alınır
 * 4. refresh_token .env'ye kaydedilir (tek seferlik)
 * 
 * Güvenlik:
 * - Token'lar asla koda gömülmez
 * - refresh_token ile süresiz erişim (revoke edilmediği sürece)
 * - Scope: https://www.googleapis.com/auth/webmasters.readonly (least privilege)
 */

import { google } from 'googleapis';

const SCOPES = ['https://www.googleapis.com/auth/webmasters.readonly'];

export interface TokenSet {
    access_token: string;
    refresh_token: string;
    expiry_date?: number;
}

/**
 * OAuth2 client oluşturur.
 * Env'den credentials alır.
 */
export function createOAuth2Client() {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
        throw new Error(
            'Missing Google OAuth credentials. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI in .env'
        );
    }

    return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

/**
 * Yetkilendirme URL'i üretir.
 * Kullanıcıyı bu URL'e yönlendir.
 */
export function getAuthorizationUrl(): string {
    const oauth2Client = createOAuth2Client();

    return oauth2Client.generateAuthUrl({
        access_type: 'offline', // refresh_token almak için
        scope: SCOPES,
        prompt: 'consent', // Her zaman consent ekranı göster (refresh_token garantisi)
        include_granted_scopes: true,
    });
}

/**
 * Authorization code → token'lara çevirir.
 * İlk kurulumda bir kez çağrılır.
 */
export async function exchangeCodeForTokens(code: string): Promise<TokenSet> {
    const oauth2Client = createOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.access_token || !tokens.refresh_token) {
        throw new Error('Failed to obtain tokens. Make sure you set prompt=consent.');
    }

    return {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expiry_date: tokens.expiry_date ?? undefined,
    };
}

/**
 * Mevcut token'larla authenticated OAuth2 client döndürür.
 * Token expired ise otomatik yenilenir.
 */
export async function getAuthenticatedClient() {
    const oauth2Client = createOAuth2Client();

    const accessToken = process.env.GOOGLE_ACCESS_TOKEN;
    const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

    if (!refreshToken) {
        throw new Error(
            'Missing GOOGLE_REFRESH_TOKEN. Run OAuth flow first: GET /api/auth/google/authorize'
        );
    }

    oauth2Client.setCredentials({
        access_token: accessToken || undefined,
        refresh_token: refreshToken,
    });

    // Token expired mı kontrol et, expired ise yenile
    const tokenInfo = oauth2Client.credentials;
    const now = Date.now();
    const expiryDate = tokenInfo.expiry_date || 0;

    if (!tokenInfo.access_token || now >= expiryDate - 60_000) {
        console.log('[Auth] Access token expired or missing. Refreshing...');
        try {
            const { credentials } = await oauth2Client.refreshAccessToken();
            oauth2Client.setCredentials(credentials);
            console.log('[Auth] Token refreshed successfully.');

            // Not: Production'da yeni access_token'ı Supabase Vault'a kaydetmelisiniz
            // Şimdilik log'a yazıyoruz
            if (credentials.access_token) {
                console.log('[Auth] New access_token obtained (expires:', credentials.expiry_date, ')');
            }
        } catch (err) {
            const error = err as Error;
            // 401/403: Token revoke edilmiş veya permission yok
            if (error.message?.includes('invalid_grant')) {
                throw new Error(
                    'Refresh token is invalid or revoked. Re-run OAuth flow: GET /api/auth/google/authorize'
                );
            }
            throw new Error(`Token refresh failed: ${error.message}`);
        }
    }

    return oauth2Client;
}
