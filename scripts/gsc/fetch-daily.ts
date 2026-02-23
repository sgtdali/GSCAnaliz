/**
 * GSC Daily Fetch Script
 * 
 * Günlük çalışır (cron ile).
 * "Bugün - 2 gün" tarihinin verilerini GSC API'den çeker ve DB'ye upsert eder.
 * 
 * Çalıştırma: npx tsx scripts/gsc/fetch-daily.ts
 * Opsiyonel args: --date 2026-02-15 (belirli bir tarihi çek)
 * 
 * Gecikme stratejisi:
 * - GSC verileri 2 gün gecikmeli → hedef tarih = today - 2
 * - dataState='final' → sadece kesinleşmiş veri
 */

import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { format, subDays, parseISO, isValid } from 'date-fns';
import { fetchGSCMetrics } from '../../lib/gsc/client';
import { upsertDailyMetrics, logFetchOperation } from '../../lib/db/upsert';

// ============================================
// Configuration
// ============================================

const DELAY_DAYS = 2; // GSC gecikme süresi

// ============================================
// Main
// ============================================

async function main() {
    console.log('='.repeat(60));
    console.log('[fetch-daily] GSC Daily Fetch başlatılıyor...');
    console.log(`[fetch-daily] Zaman: ${new Date().toISOString()}`);

    // Hedef tarihi belirle
    let targetDate: Date;

    const dateArg = process.argv.find(arg => arg.startsWith('--date='));
    if (dateArg) {
        const parsedDate = parseISO(dateArg.split('=')[1]);
        if (!isValid(parsedDate)) {
            console.error('[fetch-daily] Geçersiz tarih formatı. Kullanım: --date=2026-02-15');
            process.exit(1);
        }
        targetDate = parsedDate;
        console.log(`[fetch-daily] Manuel tarih kullanılıyor: ${format(targetDate, 'yyyy-MM-dd')}`);
    } else {
        targetDate = subDays(new Date(), DELAY_DAYS);
        console.log(`[fetch-daily] Otomatik tarih (D-${DELAY_DAYS}): ${format(targetDate, 'yyyy-MM-dd')}`);
    }

    const targetDateStr = format(targetDate, 'yyyy-MM-dd');

    // Fetch log başlat
    await logFetchOperation({
        targetDate: targetDateStr,
        status: 'started',
        sourceWindow: `D-${DELAY_DAYS}`,
    });

    const startTime = Date.now();

    try {
        // 1. GSC API'den veri çek
        console.log(`[fetch-daily] GSC API'den veri çekiliyor: ${targetDateStr}...`);

        const result = await fetchGSCMetrics({
            startDate: targetDateStr,
            endDate: targetDateStr,
            urlPrefix: '/blog/', // Sadece blog URL'leri
        });

        console.log(`[fetch-daily] ${result.totalRows} row çekildi.`);

        if (result.totalRows === 0) {
            console.log('[fetch-daily] Veri yok (GSC henüz bu tarih için veri yayınlamamış olabilir).');
            await logFetchOperation({
                targetDate: targetDateStr,
                status: 'success',
                rowsFetched: 0,
                rowsUpserted: 0,
                sourceWindow: `D-${DELAY_DAYS}`,
                durationMs: Date.now() - startTime,
            });
            return;
        }

        // 2. DB'ye upsert et
        console.log('[fetch-daily] DB\'ye upsert ediliyor...');

        const upsertResult = await upsertDailyMetrics(result.rows, `D-${DELAY_DAYS}`);

        console.log(`[fetch-daily] Upsert tamamlandı: ${upsertResult.upsertedRows}/${upsertResult.totalRows} rows`);

        if (upsertResult.errors.length > 0) {
            console.warn('[fetch-daily] Upsert hataları:', upsertResult.errors);
            await logFetchOperation({
                targetDate: targetDateStr,
                status: 'partial',
                rowsFetched: result.totalRows,
                rowsUpserted: upsertResult.upsertedRows,
                errorMessage: upsertResult.errors.join('; '),
                sourceWindow: `D-${DELAY_DAYS}`,
                durationMs: Date.now() - startTime,
            });
        } else {
            await logFetchOperation({
                targetDate: targetDateStr,
                status: 'success',
                rowsFetched: result.totalRows,
                rowsUpserted: upsertResult.upsertedRows,
                sourceWindow: `D-${DELAY_DAYS}`,
                durationMs: Date.now() - startTime,
            });
        }

        console.log('[fetch-daily] ✅ Tamamlandı.');
    } catch (error) {
        const err = error as Error;
        console.error('[fetch-daily] ❌ HATA:', err.message);
        console.error(err.stack);

        await logFetchOperation({
            targetDate: targetDateStr,
            status: 'failed',
            errorMessage: err.message,
            sourceWindow: `D-${DELAY_DAYS}`,
            durationMs: Date.now() - startTime,
        });

        process.exit(1);
    }

    console.log('='.repeat(60));
}

main();
