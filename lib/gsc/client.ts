/**
 * GSC API Client
 * 
 * Google Search Console API ile iletişim katmanı.
 * Rate limiting, retry/backoff, pagination ve filtreleme yönetimi.
 * 
 * API Limits:
 * - 1200 request/dakika (proje bazlı)
 * - 25000 row/request (tek sorguda)
 * - Günlük quota: genellikle yeterli (blog URL'leri için)
 * 
 * Varsayımlar:
 * - GSC property: sc-domain:uygunbakim.com
 * - Sadece /blog/ URL'leri çekilir (opsiyonel prefix filtresi)
 * - Boyut (dimension): page + date
 */

import { google, searchconsole_v1 } from 'googleapis';
import { getAuthenticatedClient } from './auth';

// ============================================
// Types
// ============================================

export interface GSCMetricRow {
    date: string;        // YYYY-MM-DD
    page: string;        // Full URL
    clicks: number;
    impressions: number;
    ctr: number;         // 0.0 - 1.0 → DB'de 0-100 olarak saklanacak
    position: number;    // Average position
}

export interface FetchOptions {
    startDate: string;   // YYYY-MM-DD
    endDate: string;     // YYYY-MM-DD
    urlPrefix?: string;  // Varsayılan: /blog/
    singleUrl?: string;  // Tek URL analizi için
    rowLimit?: number;    // Max rows per request (default: 25000)
}

export interface FetchResult {
    rows: GSCMetricRow[];
    totalRows: number;
    truncated: boolean;
}

// ============================================
// Constants
// ============================================

const SITE_URL = process.env.GSC_SITE_URL || 'sc-domain:uygunbakim.com';
const DEFAULT_URL_PREFIX = process.env.GSC_URL_PREFIX || '/blog/';
const MAX_ROWS_PER_REQUEST = 25000;
const MAX_RETRIES = 5;
const BASE_DELAY_MS = 1000;

// ============================================
// Rate Limiter
// ============================================

class RateLimiter {
    private requestTimes: number[] = [];
    private readonly maxRequests: number;
    private readonly windowMs: number;

    constructor(maxRequests: number = 60, windowMs: number = 60_000) {
        this.maxRequests = maxRequests;
        this.windowMs = windowMs;
    }

    async waitIfNeeded(): Promise<void> {
        const now = Date.now();
        // Pencere dışındaki request'leri temizle
        this.requestTimes = this.requestTimes.filter(t => now - t < this.windowMs);

        if (this.requestTimes.length >= this.maxRequests) {
            const oldestRequest = this.requestTimes[0];
            const waitTime = this.windowMs - (now - oldestRequest) + 100; // +100ms safety margin
            console.log(`[RateLimiter] Rate limit yaklaşıldı. ${waitTime}ms bekleniyor...`);
            await sleep(waitTime);
        }

        this.requestTimes.push(Date.now());
    }
}

const rateLimiter = new RateLimiter(50, 60_000); // 50 req/min (güvenli limit)

// ============================================
// Utility
// ============================================

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Exponential backoff with jitter
 * delay = base * 2^attempt + random(0, base)
 */
function getBackoffDelay(attempt: number): number {
    const exponentialDelay = BASE_DELAY_MS * Math.pow(2, attempt);
    const jitter = Math.random() * BASE_DELAY_MS;
    return Math.min(exponentialDelay + jitter, 60_000); // Max 60 saniye
}

// ============================================
// GSC API Client
// ============================================

/**
 * GSC API'den metrik çeker.
 * Retry/backoff, rate limiting ve pagination dahil.
 */
export async function fetchGSCMetrics(options: FetchOptions): Promise<FetchResult> {
    const {
        startDate,
        endDate,
        urlPrefix = DEFAULT_URL_PREFIX,
        singleUrl,
        rowLimit = MAX_ROWS_PER_REQUEST,
    } = options;

    const auth = await getAuthenticatedClient();
    const searchConsole = google.searchconsole({ version: 'v1', auth });

    // Dimension filtresi
    const dimensionFilterGroups: searchconsole_v1.Schema$ApiDimensionFilterGroup[] = [];

    if (singleUrl) {
        // Tek URL analizi
        dimensionFilterGroups.push({
            filters: [{
                dimension: 'page',
                operator: 'equals',
                expression: singleUrl,
            }],
        });
    } else if (urlPrefix) {
        // /blog/ prefix filtresi
        dimensionFilterGroups.push({
            filters: [{
                dimension: 'page',
                operator: 'includingRegex',
                expression: `https://uygunbakim\\.com${urlPrefix.replace(/\//g, '\\/')}`,
            }],
        });
    }

    const allRows: GSCMetricRow[] = [];
    let startRow = 0;
    let hasMore = true;

    while (hasMore) {
        await rateLimiter.waitIfNeeded();

        const requestBody: searchconsole_v1.Schema$SearchAnalyticsQueryRequest = {
            startDate,
            endDate,
            dimensions: ['page', 'date'],
            rowLimit: Math.min(rowLimit, MAX_ROWS_PER_REQUEST),
            startRow,
            dimensionFilterGroups,
            type: 'web',
            dataState: 'final', // Sadece final data (günlük dalgalanma olmasın)
        };

        let response: searchconsole_v1.Schema$SearchAnalyticsQueryResponse | undefined;
        let lastError: Error | undefined;

        // Retry loop with exponential backoff
        for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
            try {
                const result = await searchConsole.searchanalytics.query({
                    siteUrl: SITE_URL,
                    requestBody,
                });
                response = result.data;
                break; // Başarılı → döngüden çık
            } catch (err) {
                lastError = err as Error;
                const errorMessage = (err as any)?.message || '';
                const status = (err as any)?.code || (err as any)?.status || 0;

                // 401/403: Auth hatası — retry etme
                if (status === 401 || status === 403) {
                    throw new Error(
                        `GSC API auth error (${status}): ${errorMessage}. ` +
                        'Token expired veya permission yok. OAuth flow\'u tekrar çalıştırın.'
                    );
                }

                // 429: Quota exceeded
                if (status === 429) {
                    const retryAfter = parseInt((err as any)?.response?.headers?.['retry-after'] || '60', 10);
                    console.warn(
                        `[GSC Client] 429 Quota exceeded. ${retryAfter}s bekleniyor... (attempt ${attempt + 1}/${MAX_RETRIES + 1})`
                    );
                    await sleep(retryAfter * 1000);
                    continue;
                }

                // 5xx: Server error — retry with backoff
                if (status >= 500) {
                    const delay = getBackoffDelay(attempt);
                    console.warn(
                        `[GSC Client] ${status} Server error. ${delay}ms sonra retry... (attempt ${attempt + 1}/${MAX_RETRIES + 1})`
                    );
                    await sleep(delay);
                    continue;
                }

                // Diğer hatalar — retry etme
                throw new Error(`GSC API error (${status}): ${errorMessage}`);
            }
        }

        if (!response) {
            throw new Error(
                `GSC API request failed after ${MAX_RETRIES + 1} attempts. Last error: ${lastError?.message}`
            );
        }

        // Response'u parse et
        const rows = response.rows || [];

        for (const row of rows) {
            const keys = row.keys || [];
            if (keys.length < 2) continue;

            allRows.push({
                page: keys[0],         // page dimension
                date: keys[1],         // date dimension
                clicks: row.clicks || 0,
                impressions: row.impressions || 0,
                ctr: Math.round((row.ctr || 0) * 10000) / 100, // 0.0345 → 3.45 (%)
                position: Math.round((row.position || 0) * 100) / 100,
            });
        }

        // Pagination: 25000'den az row geldiyse daha fazla yok
        if (rows.length < rowLimit) {
            hasMore = false;
        } else {
            startRow += rows.length;
            console.log(`[GSC Client] Pagination: ${allRows.length} rows fetched, devam ediliyor...`);
        }
    }

    console.log(`[GSC Client] Toplam ${allRows.length} row çekildi (${startDate} → ${endDate})`);

    return {
        rows: allRows,
        totalRows: allRows.length,
        truncated: allRows.length >= rowLimit * 10, // Çok fazla veri uyarısı
    };
}

/**
 * Belirli bir URL için detaylı metrik çeker (query kırılımlı).
 * Tek URL analizi için kullanılır.
 */
export async function fetchSingleUrlDetail(
    url: string,
    startDate: string,
    endDate: string
): Promise<{
    daily: GSCMetricRow[];
    queries: Array<{ query: string; clicks: number; impressions: number; ctr: number; position: number }>;
}> {
    // Günlük metrikler
    const dailyResult = await fetchGSCMetrics({
        startDate,
        endDate,
        singleUrl: url,
    });

    // Query kırılımlı metrikler
    const auth = await getAuthenticatedClient();
    const searchConsole = google.searchconsole({ version: 'v1', auth });

    await rateLimiter.waitIfNeeded();

    const queryResult = await searchConsole.searchanalytics.query({
        siteUrl: SITE_URL,
        requestBody: {
            startDate,
            endDate,
            dimensions: ['query'],
            dimensionFilterGroups: [{
                filters: [{
                    dimension: 'page',
                    operator: 'equals',
                    expression: url,
                }],
            }],
            rowLimit: 1000,
            type: 'web',
        },
    });

    const queries = (queryResult.data.rows || []).map(row => ({
        query: row.keys?.[0] || '',
        clicks: row.clicks || 0,
        impressions: row.impressions || 0,
        ctr: Math.round((row.ctr || 0) * 10000) / 100,
        position: Math.round((row.position || 0) * 100) / 100,
    }));

    return {
        daily: dailyResult.rows,
        queries,
    };
}
