/**
 * API Middleware — Authentication & Rate Limiting
 * 
 * Tüm SEO API endpoint'leri bu middleware'i kullanır.
 * x-api-key header'ı ile basit authentication.
 */

import { NextRequest, NextResponse } from 'next/server';

/**
 * API key doğrulama.
 * Production'da Supabase Auth veya daha gelişmiş bir çözüm kullanılabilir.
 */
export function validateApiKey(request: NextRequest): NextResponse | null {
    const apiKey = request.headers.get('x-api-key');
    const expectedKey = process.env.API_SECRET_KEY;

    if (!expectedKey) {
        console.error('[Auth] API_SECRET_KEY not configured!');
        return NextResponse.json(
            { error: 'Server configuration error' },
            { status: 500 }
        );
    }

    if (!apiKey || apiKey !== expectedKey) {
        return NextResponse.json(
            { error: 'Unauthorized. Provide a valid x-api-key header.' },
            { status: 401 }
        );
    }

    return null; // Geçerli — devam et
}

/**
 * Standart error response.
 */
export function errorResponse(message: string, status: number = 500): NextResponse {
    return NextResponse.json(
        {
            error: message,
            timestamp: new Date().toISOString(),
        },
        { status }
    );
}

/**
 * Standart success response.
 */
export function successResponse<T>(data: T, meta?: Record<string, unknown>): NextResponse {
    return NextResponse.json(
        {
            success: true,
            data,
            meta: {
                timestamp: new Date().toISOString(),
                ...meta,
            },
        },
        { status: 200 }
    );
}
