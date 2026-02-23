/**
 * Build Weekly Summary Script
 * 
 * Haftalık aggregate tablosunu oluşturur/günceller.
 * Pazartesi günleri cron ile çalışır.
 * 
 * Çalıştırma:
 *   npx tsx scripts/gsc/build-weekly-summary.ts
 *   npx tsx scripts/gsc/build-weekly-summary.ts --weeks=12  (son 12 hafta)
 *   npx tsx scripts/gsc/build-weekly-summary.ts --week-start=2026-02-09
 * 
 * Strateji:
 * - Varsayılan: son 2 haftayı yeniden hesapla
 * - --weeks ile daha fazla hafta hesaplanabilir (backfill)
 * - Son 2 gün hariç tutulur (D-2 penceresi)
 * - Hafta: Pazartesi → Pazar
 */

import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
import {
    format,
    subDays,
    subWeeks,
    startOfWeek,
    endOfWeek,
    parseISO,
    isValid,
    eachWeekOfInterval,
} from 'date-fns';
import { getSupabase } from '../../lib/db/connection';

// ============================================
// Configuration
// ============================================

const DELAY_DAYS = 2;
const DEFAULT_WEEKS = 2; // Varsayılan: son 2 haftayı hesapla

// ============================================
// Weekly Summary Builder
// ============================================

async function buildWeekSummary(weekStart: Date, weekEnd: Date): Promise<number> {
    const supabase = getSupabase();
    const weekStartStr = format(weekStart, 'yyyy-MM-dd');
    const weekEndStr = format(weekEnd, 'yyyy-MM-dd');

    // Önceki haftanın tarihleri
    const prevWeekStart = subWeeks(weekStart, 1);
    const prevWeekStartStr = format(prevWeekStart, 'yyyy-MM-dd');

    console.log(`  Hafta: ${weekStartStr} → ${weekEndStr}`);

    // 1. Mevcut hafta metrikleri
    const { data: currentData, error: currentError } = await supabase
        .from('gsc_daily_metrics')
        .select('page, clicks, impressions, ctr, position')
        .gte('date', weekStartStr)
        .lte('date', weekEndStr);

    if (currentError) {
        throw new Error(`Current week query failed: ${currentError.message}`);
    }

    // 2. Önceki hafta metrikleri
    const { data: prevData, error: prevError } = await supabase
        .from('gsc_daily_metrics')
        .select('page, clicks, impressions, ctr, position')
        .gte('date', prevWeekStartStr)
        .lt('date', weekStartStr);

    if (prevError) {
        throw new Error(`Previous week query failed: ${prevError.message}`);
    }

    // 3. Sayfa bazlı aggregation — current week
    const currentByPage = new Map<string, {
        clicks: number; impressions: number;
        ctrSum: number; posSum: number; count: number;
    }>();

    for (const row of currentData || []) {
        const existing = currentByPage.get(row.page) || {
            clicks: 0, impressions: 0, ctrSum: 0, posSum: 0, count: 0,
        };
        existing.clicks += row.clicks;
        existing.impressions += row.impressions;
        existing.ctrSum += row.ctr;
        existing.posSum += row.position;
        existing.count++;
        currentByPage.set(row.page, existing);
    }

    // 4. Sayfa bazlı aggregation — previous week
    const prevByPage = new Map<string, {
        clicks: number; impressions: number;
        ctrSum: number; posSum: number; count: number;
    }>();

    for (const row of prevData || []) {
        const existing = prevByPage.get(row.page) || {
            clicks: 0, impressions: 0, ctrSum: 0, posSum: 0, count: 0,
        };
        existing.clicks += row.clicks;
        existing.impressions += row.impressions;
        existing.ctrSum += row.ctr;
        existing.posSum += row.position;
        existing.count++;
        prevByPage.set(row.page, existing);
    }

    // 5. weekly_page_summary kayıtları oluştur
    const summaries = [];

    for (const [page, curr] of currentByPage) {
        const prev = prevByPage.get(page);

        const avgCtr = curr.impressions > 0
            ? Math.round((curr.clicks / curr.impressions) * 10000) / 100
            : 0;
        const avgPosition = Math.round((curr.posSum / curr.count) * 100) / 100;

        const prevClicks = prev?.clicks ?? null;
        const prevImpressions = prev?.impressions ?? null;
        const prevAvgCtr = prev && prev.impressions > 0
            ? Math.round((prev.clicks / prev.impressions) * 10000) / 100
            : null;
        const prevAvgPosition = prev
            ? Math.round((prev.posSum / prev.count) * 100) / 100
            : null;

        // WoW deltas
        const clickChangePct = prevClicks && prevClicks > 0
            ? Math.round(((curr.clicks - prevClicks) / prevClicks) * 10000) / 100
            : null;

        const impressionChangePct = prevImpressions && prevImpressions > 0
            ? Math.round(((curr.impressions - prevImpressions) / prevImpressions) * 10000) / 100
            : null;

        const ctrDelta = prevAvgCtr !== null
            ? Math.round((avgCtr - prevAvgCtr) * 10000) / 10000
            : null;

        const positionDelta = prevAvgPosition !== null
            ? Math.round((avgPosition - prevAvgPosition) * 100) / 100
            : null;

        summaries.push({
            week_start: weekStartStr,
            week_end: weekEndStr,
            page,
            total_clicks: curr.clicks,
            total_impressions: curr.impressions,
            avg_ctr: avgCtr,
            avg_position: avgPosition,
            data_days: curr.count,
            prev_clicks: prevClicks,
            prev_impressions: prevImpressions,
            prev_avg_ctr: prevAvgCtr,
            prev_avg_position: prevAvgPosition,
            click_change_pct: clickChangePct,
            impression_change_pct: impressionChangePct,
            ctr_delta: ctrDelta,
            position_delta: positionDelta,
            computed_at: new Date().toISOString(),
        });
    }

    if (summaries.length === 0) {
        console.log(`  ⚠️ Veri yok, atlanıyor.`);
        return 0;
    }

    // 6. Upsert
    const { error: upsertError } = await supabase
        .from('weekly_page_summary')
        .upsert(summaries, {
            onConflict: 'week_start,page',
            ignoreDuplicates: false,
        });

    if (upsertError) {
        throw new Error(`Weekly summary upsert failed: ${upsertError.message}`);
    }

    console.log(`  ✅ ${summaries.length} sayfa işlendi`);
    return summaries.length;
}

// ============================================
// Main
// ============================================

async function main() {
    console.log('='.repeat(60));
    console.log('[build-weekly] Haftalık özet oluşturuluyor...');
    console.log(`[build-weekly] Zaman: ${new Date().toISOString()}`);

    // D-2 penceresi — son 2 gün hariç
    const safeEndDate = subDays(new Date(), DELAY_DAYS);

    // Arguments
    let weeksToProcess = DEFAULT_WEEKS;
    let specificWeekStart: Date | null = null;

    for (const arg of process.argv.slice(2)) {
        if (arg.startsWith('--weeks=')) {
            weeksToProcess = parseInt(arg.split('=')[1], 10);
        } else if (arg.startsWith('--week-start=')) {
            specificWeekStart = parseISO(arg.split('=')[1]);
            if (!isValid(specificWeekStart)) {
                throw new Error('Invalid --week-start date');
            }
        }
    }

    if (specificWeekStart) {
        // Tek hafta hesapla
        const wEnd = endOfWeek(specificWeekStart, { weekStartsOn: 1 });
        const safeEnd = wEnd > safeEndDate ? safeEndDate : wEnd;
        await buildWeekSummary(specificWeekStart, safeEnd);
    } else {
        // Son N haftayı hesapla
        const rangeStart = subWeeks(safeEndDate, weeksToProcess);
        const weeks = eachWeekOfInterval(
            { start: rangeStart, end: safeEndDate },
            { weekStartsOn: 1 } // Pazartesi başlangıç
        );

        console.log(`[build-weekly] ${weeks.length} hafta hesaplanacak\n`);

        let totalPages = 0;

        for (const weekStart of weeks) {
            const wEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
            const safeEnd = wEnd > safeEndDate ? safeEndDate : wEnd;

            try {
                const pageCount = await buildWeekSummary(weekStart, safeEnd);
                totalPages += pageCount;
            } catch (error) {
                console.error(`  ❌ Hata: ${(error as Error).message}`);
            }
        }

        console.log(`\n[build-weekly] Toplam ${totalPages} sayfa özeti oluşturuldu.`);
    }

    console.log('[build-weekly] ✅ Tamamlandı.');
    console.log('='.repeat(60));
}

main();
