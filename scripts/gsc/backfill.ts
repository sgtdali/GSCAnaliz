/**
 * GSC Backfill Script
 * 
 * Geçmiş tarihler için veri çeker.
 * İlk kurulumda veya eksik veriler için kullanılır.
 * 
 * Çalıştırma:
 *   npx tsx scripts/gsc/backfill.ts --start=2026-01-01 --end=2026-02-15
 *   npx tsx scripts/gsc/backfill.ts --days=90  (son 90 gün)
 * 
 * Özellikler:
 * - Gün gün çeker (idempotent, aynı gün tekrar çalışabilir)
 * - Rate limit friendly: her gün arası 2 saniye bekleme
 * - Progress tracking
 * - Hata durumunda devam eder (atlanan günleri loglar)
 * 
 * Not: GSC API en fazla 16 aylık veri sunar.
 */

import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
import {
    format,
    subDays,
    parseISO,
    isValid,
    eachDayOfInterval,
    differenceInDays,
} from 'date-fns';
import { fetchGSCMetrics } from '../../lib/gsc/client';
import { upsertDailyMetrics, logFetchOperation } from '../../lib/db/upsert';

// ============================================
// Configuration
// ============================================

const DELAY_BETWEEN_DAYS_MS = 2000;  // Günler arası bekleme (rate limit)
const DELAY_DAYS = 2;                 // Son 2 gün hariç

// ============================================
// Argument Parsing
// ============================================

function parseArgs(): { startDate: Date; endDate: Date } {
    const args = process.argv.slice(2);
    let startDate: Date | null = null;
    let endDate: Date | null = null;

    for (const arg of args) {
        if (arg.startsWith('--start=')) {
            startDate = parseISO(arg.split('=')[1]);
        } else if (arg.startsWith('--end=')) {
            endDate = parseISO(arg.split('=')[1]);
        } else if (arg.startsWith('--days=')) {
            const days = parseInt(arg.split('=')[1], 10);
            if (isNaN(days) || days <= 0) {
                throw new Error('--days must be a positive number');
            }
            startDate = subDays(new Date(), days + DELAY_DAYS);
            endDate = subDays(new Date(), DELAY_DAYS);
        }
    }

    if (!startDate || !isValid(startDate)) {
        throw new Error('Missing or invalid --start date. Usage: --start=2026-01-01 --end=2026-02-15');
    }

    if (!endDate || !isValid(endDate)) {
        // Varsayılan end date: today - 2
        endDate = subDays(new Date(), DELAY_DAYS);
    }

    // End date bugün-2'den büyük olamaz
    const maxEndDate = subDays(new Date(), DELAY_DAYS);
    if (endDate > maxEndDate) {
        console.warn(
            `[backfill] End date ${format(endDate, 'yyyy-MM-dd')} bugün-${DELAY_DAYS}'den büyük. ` +
            `${format(maxEndDate, 'yyyy-MM-dd')} olarak ayarlandı.`
        );
        endDate = maxEndDate;
    }

    return { startDate, endDate };
}

// ============================================
// Main
// ============================================

async function main() {
    console.log('='.repeat(60));
    console.log('[backfill] GSC Backfill başlatılıyor...');
    console.log(`[backfill] Zaman: ${new Date().toISOString()}`);

    const { startDate, endDate } = parseArgs();
    const startDateStr = format(startDate, 'yyyy-MM-dd');
    const endDateStr = format(endDate, 'yyyy-MM-dd');
    const totalDays = differenceInDays(endDate, startDate) + 1;

    console.log(`[backfill] Tarih aralığı: ${startDateStr} → ${endDateStr} (${totalDays} gün)`);

    // Gün gün çek
    const days = eachDayOfInterval({ start: startDate, end: endDate });

    let successCount = 0;
    let failCount = 0;
    let totalRows = 0;
    const failedDates: string[] = [];

    for (let i = 0; i < days.length; i++) {
        const day = days[i];
        const dayStr = format(day, 'yyyy-MM-dd');
        const progress = `[${i + 1}/${days.length}]`;

        console.log(`\n${progress} ${dayStr} çekiliyor...`);

        try {
            const result = await fetchGSCMetrics({
                startDate: dayStr,
                endDate: dayStr,
                urlPrefix: '/blog/',
            });

            if (result.totalRows > 0) {
                const upsertResult = await upsertDailyMetrics(result.rows, 'backfill');
                totalRows += upsertResult.upsertedRows;
                console.log(`${progress} ✅ ${result.totalRows} row çekildi, ${upsertResult.upsertedRows} upserted`);
            } else {
                console.log(`${progress} ⚠️ Veri yok`);
            }

            await logFetchOperation({
                targetDate: dayStr,
                status: 'success',
                rowsFetched: result.totalRows,
                rowsUpserted: result.totalRows,
                sourceWindow: 'backfill',
            });

            successCount++;
        } catch (error) {
            const err = error as Error;
            console.error(`${progress} ❌ HATA: ${err.message}`);
            failedDates.push(dayStr);
            failCount++;

            await logFetchOperation({
                targetDate: dayStr,
                status: 'failed',
                errorMessage: err.message,
                sourceWindow: 'backfill',
            });

            // Auth hatası → dur
            if (err.message.includes('auth error') || err.message.includes('invalid_grant')) {
                console.error('[backfill] Auth hatası! İşlem durduruluyor.');
                process.exit(1);
            }
        }

        // Rate limit koruması: günler arası bekleme
        if (i < days.length - 1) {
            await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_DAYS_MS));
        }
    }

    // Özet
    console.log('\n' + '='.repeat(60));
    console.log('[backfill] SONUÇ:');
    console.log(`  Toplam gün  : ${days.length}`);
    console.log(`  Başarılı    : ${successCount}`);
    console.log(`  Başarısız   : ${failCount}`);
    console.log(`  Toplam row  : ${totalRows}`);

    if (failedDates.length > 0) {
        console.log(`  Başarısız tarihler: ${failedDates.join(', ')}`);
    }

    console.log('='.repeat(60));

    if (failCount > 0) {
        process.exit(1);
    }
}

main();
