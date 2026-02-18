/**
 * API Middleware — Response Helpers
 */

import { NextResponse } from 'next/server';

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
