/**
 * Database Upsert Module
 * 
 * GSC metriklerinin idempotent şekilde veritabanına yazılması.
 * Aynı (date, page) çifti için tekrar çalışırsa update yapar, duplicate oluşmaz.
 * 
 * Upsert Stratejisi:
 * - INSERT ... ON CONFLICT (date, page) DO UPDATE SET ...
 * - Supabase JS client'ın upsert() metodu kullanılır
 * - Batch processing: 500 row'luk chunk'lar halinde
 */

import { getSupabase } from './connection';
import type { GSCMetricRow } from '@/lib/gsc/client';

const BATCH_SIZE = 500;

export interface UpsertResult {
    totalRows: number;
    upsertedRows: number;
    errors: string[];
    durationMs: number;
}

/**
 * GSC metriklerini batch halinde upsert eder.
 * Idempotent: aynı (date, page) çifti varsa günceller.
 */
export async function upsertDailyMetrics(
    rows: GSCMetricRow[],
    sourceWindow: string = 'D-2'
): Promise<UpsertResult> {
    const supabase = getSupabase();
    const startTime = Date.now();
    const errors: string[] = [];
    let upsertedRows = 0;

    // Batch'lere böl
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        const batch = rows.slice(i, i + BATCH_SIZE);

        const records = batch.map(row => ({
            date: row.date,
            page: row.page,
            clicks: row.clicks,
            impressions: row.impressions,
            ctr: row.ctr,
            position: row.position,
            fetched_at: new Date().toISOString(),
            source_window: sourceWindow,
        }));

        const { data, error } = await supabase
            .from('gsc_daily_metrics')
            .upsert(records, {
                onConflict: 'date,page',       // UNIQUE constraint üzerinden
                ignoreDuplicates: false,        // false = UPDATE yap (true olursa skip eder)
            })
            .select('id');

        if (error) {
            errors.push(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${error.message}`);
            console.error(`[Upsert] Batch error:`, error.message);
        } else {
            const count = data?.length || batch.length;
            upsertedRows += count;
        }
    }

    const durationMs = Date.now() - startTime;

    console.log(
        `[Upsert] ${upsertedRows}/${rows.length} rows upserted in ${durationMs}ms` +
        (errors.length > 0 ? ` (${errors.length} errors)` : '')
    );

    return {
        totalRows: rows.length,
        upsertedRows,
        errors,
        durationMs,
    };
}

/**
 * Fetch log kaydı oluşturur veya günceller.
 * Debugging ve monitoring için.
 */
export async function logFetchOperation(params: {
    targetDate: string;
    status: 'started' | 'success' | 'failed' | 'partial';
    rowsFetched?: number;
    rowsUpserted?: number;
    errorMessage?: string;
    durationMs?: number;
    sourceWindow?: string;
}): Promise<void> {
    const supabase = getSupabase();

    const { error } = await supabase.from('gsc_fetch_log').insert({
        fetch_date: new Date().toISOString().split('T')[0],
        target_date: params.targetDate,
        status: params.status,
        rows_fetched: params.rowsFetched || 0,
        rows_upserted: params.rowsUpserted || 0,
        error_message: params.errorMessage || null,
        duration_ms: params.durationMs || 0,
        source_window: params.sourceWindow || 'D-2',
    });

    if (error) {
        console.error('[FetchLog] Failed to log fetch operation:', error.message);
    }
}

/**
 * Content change log kaydı oluşturur.
 */
export async function insertChangeLog(params: {
    page: string;
    changeType: 'title' | 'meta' | 'content' | 'internal_link' | 'schema' | 'tech' | 'other';
    description: string;
    actor?: string;
    changedAt?: string;
}): Promise<{ id: number } | null> {
    const supabase = getSupabase();

    const { data, error } = await supabase
        .from('content_change_log')
        .insert({
            page: params.page,
            change_type: params.changeType,
            description: params.description,
            actor: params.actor || 'manual',
            changed_at: params.changedAt || new Date().toISOString(),
        })
        .select('id')
        .single();

    if (error) {
        console.error('[ChangeLog] Insert failed:', error.message);
        return null;
    }

    return data;
}
