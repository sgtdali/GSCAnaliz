/**
 * Database Query Module
 * 
 * API endpoint'lerinden çağrılan sorgular.
 * Her fonksiyon belirli bir analiz senaryosunu destekler.
 */

import { getSupabase } from './connection';

// ============================================
// Types
// ============================================

export interface DailyMetric {
    date: string;
    page: string;
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
    fetched_at: string;
}

export interface WeeklySummary {
    week_start: string;
    week_end: string;
    page: string;
    total_clicks: number;
    total_impressions: number;
    avg_ctr: number;
    avg_position: number;
    data_days: number;
    prev_clicks: number | null;
    prev_impressions: number | null;
    click_change_pct: number | null;
    impression_change_pct: number | null;
    ctr_delta: number | null;
    position_delta: number | null;
}

export interface ImpactAnalysis {
    page: string;
    change_date: string;
    change_type: string;
    description: string;
    baseline_clicks: number;
    baseline_impressions: number;
    baseline_ctr: number;
    baseline_position: number;
    baseline_days: number;
    post_clicks: number;
    post_impressions: number;
    post_ctr: number;
    post_position: number;
    post_days: number;
    click_uplift_pct: number | null;
    impression_uplift_pct: number | null;
    ctr_uplift: number | null;
    position_change: number | null;
    confidence_level: 'high' | 'medium' | 'low';
}

export interface ActionRecommendation {
    page: string;
    total_clicks: number;
    total_impressions: number;
    avg_ctr: number;
    avg_position: number;
    click_change_pct: number | null;
    impression_change_pct: number | null;
    ctr_delta: number | null;
    position_delta: number | null;
    action_recommendation: string;
    priority_score: number;
}

// ============================================
// Queries
// ============================================

/**
 * URL bazlı günlük metrikler.
 * GET /api/seo/gsc/daily?page=...&days=30
 */
export async function getDailyMetrics(
    page?: string,
    days: number = 30
): Promise<DailyMetric[]> {
    const supabase = getSupabase();

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.toISOString().split('T')[0];

    let query = supabase
        .from('gsc_daily_metrics')
        .select('date, page, clicks, impressions, ctr, position, fetched_at')
        .gte('date', startDateStr)
        .order('date', { ascending: false });

    if (page) {
        query = query.eq('page', page);
    } else {
        // Eğer sayfa bazlı değilse, tıklamaya göre de sırala ki anlamlı olsun
        query = query.order('clicks', { ascending: false });
    }

    const { data, error } = await query.limit(page ? 1000 : 500);

    if (error) throw new Error(`getDailyMetrics failed: ${error.message}`);
    return data || [];
}

/**
 * Haftalık WoW analiz.
 * GET /api/seo/gsc/weekly?page=...&weeks=8
 */
export async function getWeeklySummary(
    page?: string,
    weeks: number = 8
): Promise<WeeklySummary[]> {
    const supabase = getSupabase();

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - weeks * 7);
    const startDateStr = startDate.toISOString().split('T')[0];

    let query = supabase
        .from('weekly_page_summary')
        .select('*')
        .gte('week_start', startDateStr)
        .order('week_start', { ascending: false });

    if (page) {
        query = query.eq('page', page);
    }

    const { data, error } = await query.limit(500);

    if (error) throw new Error(`getWeeklySummary failed: ${error.message}`);
    return data || [];
}

/**
 * Değişiklik etki analizi.
 * GET /api/seo/gsc/impact?changeId=...
 * 
 * Değişiklikten önceki 2 hafta vs sonraki 2 hafta karşılaştırması.
 */
export async function getImpactAnalysis(
    changeId: number
): Promise<ImpactAnalysis | null> {
    const supabase = getSupabase();

    // 1. Değişiklik bilgisini al
    const { data: changeData, error: changeError } = await supabase
        .from('content_change_log')
        .select('page, changed_at, change_type, description')
        .eq('id', changeId)
        .single();

    if (changeError || !changeData) {
        throw new Error(`Change log not found for id: ${changeId}`);
    }

    const changeDate = new Date(changeData.changed_at);
    const changeDateStr = changeDate.toISOString().split('T')[0];

    // Tarih hesaplamaları
    const baselineStart = new Date(changeDate);
    baselineStart.setDate(baselineStart.getDate() - 14);
    const baselineStartStr = baselineStart.toISOString().split('T')[0];

    const postEnd = new Date(changeDate);
    postEnd.setDate(postEnd.getDate() + 14);
    const postEndStr = postEnd.toISOString().split('T')[0];

    // 2. Baseline metrikler (önceki 2 hafta)
    const { data: baselineData, error: baselineError } = await supabase
        .from('gsc_daily_metrics')
        .select('clicks, impressions, ctr, position')
        .eq('page', changeData.page)
        .gte('date', baselineStartStr)
        .lt('date', changeDateStr);

    if (baselineError) throw new Error(`Baseline query failed: ${baselineError.message}`);

    // 3. Post-change metrikler (sonraki 2 hafta)
    const { data: postData, error: postError } = await supabase
        .from('gsc_daily_metrics')
        .select('clicks, impressions, ctr, position')
        .eq('page', changeData.page)
        .gte('date', changeDateStr)
        .lt('date', postEndStr);

    if (postError) throw new Error(`Post-change query failed: ${postError.message}`);

    // 4. Aggregation
    const baseline = aggregateMetrics(baselineData || []);
    const post = aggregateMetrics(postData || []);

    // 5. Uplift hesaplama
    const clickUplift = baseline.totalClicks > 0
        ? Math.round(((post.totalClicks - baseline.totalClicks) / baseline.totalClicks) * 10000) / 100
        : null;

    const impressionUplift = baseline.totalImpressions > 0
        ? Math.round(((post.totalImpressions - baseline.totalImpressions) / baseline.totalImpressions) * 10000) / 100
        : null;

    // 6. Güven eşiği
    let confidenceLevel: 'high' | 'medium' | 'low' = 'low';
    if (baseline.totalImpressions >= 100 && baseline.dataDays >= 10) {
        confidenceLevel = 'high';
    } else if (baseline.totalImpressions >= 30 && baseline.dataDays >= 5) {
        confidenceLevel = 'medium';
    }

    return {
        page: changeData.page,
        change_date: changeDateStr,
        change_type: changeData.change_type,
        description: changeData.description,
        baseline_clicks: baseline.totalClicks,
        baseline_impressions: baseline.totalImpressions,
        baseline_ctr: baseline.avgCtr,
        baseline_position: baseline.avgPosition,
        baseline_days: baseline.dataDays,
        post_clicks: post.totalClicks,
        post_impressions: post.totalImpressions,
        post_ctr: post.avgCtr,
        post_position: post.avgPosition,
        post_days: post.dataDays,
        click_uplift_pct: clickUplift,
        impression_uplift_pct: impressionUplift,
        ctr_uplift: post.avgCtr - baseline.avgCtr,
        position_change: Math.round((post.avgPosition - baseline.avgPosition) * 100) / 100,
        confidence_level: confidenceLevel,
    };
}

/**
 * Aksiyon önerileri — WoW analizine dayalı.
 * GET /api/seo/gsc/actions?page=...&minImpressions=50
 */
export async function getActionRecommendations(
    page?: string,
    minImpressions: number = 50
): Promise<ActionRecommendation[]> {
    const supabase = getSupabase();

    // En son haftalık özeti al
    let query = supabase
        .from('weekly_page_summary')
        .select('*')
        .gte('total_impressions', minImpressions)
        .order('week_start', { ascending: false });

    if (page) {
        query = query.eq('page', page);
    }

    const { data, error } = await query.limit(200);
    if (error) throw new Error(`getActionRecommendations failed: ${error.message}`);

    // Her sayfa için en son haftayı al ve aksiyon belirle
    const latestByPage = new Map<string, WeeklySummary>();
    for (const row of (data || [])) {
        if (!latestByPage.has(row.page)) {
            latestByPage.set(row.page, row);
        }
    }

    const recommendations: ActionRecommendation[] = [];

    for (const [, row] of latestByPage) {
        const action = determineAction(row);
        const priority = calculatePriority(row);

        recommendations.push({
            page: row.page,
            total_clicks: row.total_clicks,
            total_impressions: row.total_impressions,
            avg_ctr: row.avg_ctr,
            avg_position: row.avg_position,
            click_change_pct: row.click_change_pct,
            impression_change_pct: row.impression_change_pct,
            ctr_delta: row.ctr_delta,
            position_delta: row.position_delta,
            action_recommendation: action,
            priority_score: priority,
        });
    }

    // Öncelik skoruna göre sırala
    recommendations.sort((a, b) => b.priority_score - a.priority_score);

    return recommendations;
}

/**
 * Top pages — en çok tıklanan blog sayfaları.
 */
export async function getTopPages(
    days: number = 30,
    limit: number = 50
): Promise<DailyMetric[]> {
    const supabase = getSupabase();

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.toISOString().split('T')[0];

    // Supabase'de aggregate sorgu olmadığından, tüm veriyi çekip JS'te aggregate ediyoruz
    // Büyük veri setleri için database function / RPC kullanılmalı
    const { data, error } = await supabase
        .from('gsc_daily_metrics')
        .select('page, clicks, impressions, ctr, position')
        .gte('date', startDateStr)
        .order('clicks', { ascending: false })
        .limit(limit * 10); // Fazla çekip aggregate et

    if (error) throw new Error(`getTopPages failed: ${error.message}`);

    // JS'te aggregate
    const pageMap = new Map<string, { clicks: number; impressions: number; ctrSum: number; posSum: number; count: number }>();
    for (const row of data || []) {
        const existing = pageMap.get(row.page) || { clicks: 0, impressions: 0, ctrSum: 0, posSum: 0, count: 0 };
        existing.clicks += row.clicks;
        existing.impressions += row.impressions;
        existing.ctrSum += row.ctr;
        existing.posSum += row.position;
        existing.count++;
        pageMap.set(row.page, existing);
    }

    return Array.from(pageMap.entries())
        .map(([page, agg]) => ({
            date: startDateStr, // not meaningful for aggregate
            page,
            clicks: agg.clicks,
            impressions: agg.impressions,
            ctr: Math.round((agg.ctrSum / agg.count) * 100) / 100,
            position: Math.round((agg.posSum / agg.count) * 100) / 100,
            fetched_at: '',
        }))
        .sort((a, b) => b.clicks - a.clicks)
        .slice(0, limit);
}

// ============================================
// Helpers
// ============================================

function aggregateMetrics(rows: Array<{ clicks: number; impressions: number; ctr: number; position: number }>) {
    if (rows.length === 0) {
        return { totalClicks: 0, totalImpressions: 0, avgCtr: 0, avgPosition: 0, dataDays: 0 };
    }

    const totalClicks = rows.reduce((sum, r) => sum + r.clicks, 0);
    const totalImpressions = rows.reduce((sum, r) => sum + r.impressions, 0);
    const avgCtr = totalImpressions > 0
        ? Math.round((totalClicks / totalImpressions) * 10000) / 100
        : 0;
    const avgPosition = Math.round((rows.reduce((sum, r) => sum + r.position, 0) / rows.length) * 100) / 100;

    return {
        totalClicks,
        totalImpressions,
        avgCtr,
        avgPosition,
        dataDays: rows.length,
    };
}

/**
 * WoW metriklerine göre aksiyon belirler.
 */
function determineAction(row: WeeklySummary): string {
    const { impression_change_pct, ctr_delta, position_delta, click_change_pct } = row;

    // Kural 1: Impressions artıp CTR düşüyorsa → title/meta testi
    if ((impression_change_pct ?? 0) > 10 && (ctr_delta ?? 0) < -0.5) {
        return 'TITLE_META_TEST';
    }

    // Kural 2: Position iyileşip click artmıyorsa → snippet/intent uyumu
    if ((position_delta ?? 0) < -1.0 && (click_change_pct ?? 0) < 5) {
        return 'SNIPPET_INTENT_REVIEW';
    }

    // Kural 3: Click düşüşü → query kaybı analizi
    if ((click_change_pct ?? 0) < -15) {
        return 'QUERY_LOSS_ANALYSIS';
    }

    // Kural 4: Tüm metrikler düşüyor → acil inceleme
    if ((click_change_pct ?? 0) < -10 && (impression_change_pct ?? 0) < -10) {
        return 'URGENT_REVIEW';
    }

    // Kural 5: Position kötüleşiyor → teknik/içerik kontrolü
    if ((position_delta ?? 0) > 2.0) {
        return 'POSITION_DECLINE_CHECK';
    }

    // Kural 6: Büyüme → fırsat
    if ((click_change_pct ?? 0) > 20 && (impression_change_pct ?? 0) > 20) {
        return 'GROWTH_OPPORTUNITY';
    }

    return 'MONITOR';
}

/**
 * Öncelik skoru hesaplar (0-100).
 */
function calculatePriority(row: WeeklySummary): number {
    let score = 0;

    // Yüksek hacimli sayfalar daha önemli
    if (row.total_impressions > 1000) score += 30;
    else if (row.total_impressions > 500) score += 20;
    else if (row.total_impressions > 100) score += 10;
    else score += 5;

    // Büyük düşüşler daha acil
    const clickChange = row.click_change_pct ?? 0;
    if (clickChange < -30) score += 40;
    else if (clickChange < -15) score += 25;
    else if (clickChange < -5) score += 10;

    // Position kötüleşmesi
    const posDelta = row.position_delta ?? 0;
    if (posDelta > 5) score += 20;
    else if (posDelta > 2) score += 10;

    // CTR düşüşü
    if ((row.ctr_delta ?? 0) < -1.0) score += 10;

    return Math.max(0, Math.min(100, score));
}
