/**
 * Analysis Scoring Module
 * 
 * WoW metriklerine dayalı skor hesaplama ve aksiyon önerisi motoru.
 * Ayrıca değişiklik etki analizi için baseline/uplift hesaplama.
 * 
 * Bu modül API endpoint'lerinden ve raporlama araçlarından kullanılır.
 */

// ============================================
// Types
// ============================================

export interface ScoringInput {
    page: string;
    clicks: number;
    impressions: number;
    avgCtr: number;
    avgPosition: number;
    clickChangePct: number | null;
    impressionChangePct: number | null;
    ctrDelta: number | null;
    positionDelta: number | null;
}

export interface ScoringResult {
    action: ActionType;
    priorityScore: number;
    detail: ActionDetail;
}

export type ActionType =
    | 'TITLE_META_TEST'
    | 'SNIPPET_INTENT_REVIEW'
    | 'QUERY_LOSS_ANALYSIS'
    | 'URGENT_REVIEW'
    | 'POSITION_DECLINE_CHECK'
    | 'GROWTH_OPPORTUNITY'
    | 'MONITOR';

export interface ActionDetail {
    title: string;
    description: string;
    suggestedActions: string[];
    severity: 'critical' | 'warning' | 'info' | 'positive';
}

// ============================================
// Action Rules Engine
// ============================================

/**
 * WoW metriklerine göre aksiyon belirler.
 * Kurallar öncelik sırasına göre değerlendirilir.
 */
export function determineAction(input: ScoringInput): ScoringResult {
    const {
        impressions,
        clickChangePct,
        impressionChangePct,
        ctrDelta,
        positionDelta,
    } = input;

    const cc = clickChangePct ?? 0;
    const ic = impressionChangePct ?? 0;
    const cd = ctrDelta ?? 0;
    const pd = positionDelta ?? 0;

    // Kural 4 (en acil): Tüm metrikler düşüyor
    if (cc < -10 && ic < -10) {
        return {
            action: 'URGENT_REVIEW',
            priorityScore: calculatePriority(input),
            detail: {
                title: 'Acil İnceleme Gerekli',
                description: `Click (${cc.toFixed(1)}%) ve impression (${ic.toFixed(1)}%) birlikte düşüyor.`,
                severity: 'critical',
                suggestedActions: [
                    'Google Search Console\'da manual action kontrol et',
                    'Site hızı ve Core Web Vitals kontrol et',
                    'Crawl hataları kontrol et',
                    'Canonical tag ve hreflang kontrol et',
                    'Rakip analizi yap',
                ],
            },
        };
    }

    // Kural 1: Impressions artıp CTR düşüyorsa
    if (ic > 10 && cd < -0.5) {
        return {
            action: 'TITLE_META_TEST',
            priorityScore: calculatePriority(input),
            detail: {
                title: 'Title / Meta Description Testi',
                description: `Impressions +${ic.toFixed(1)}% artarken CTR ${cd.toFixed(2)}% düştü. Kullanıcılar gösteriyor ama tıklamıyor.`,
                severity: 'warning',
                suggestedActions: [
                    'Title tag\'i daha çekici/spesifik yap',
                    'Meta description\'a CTA ekle',
                    'Featured snippet formatı dene',
                    'Structured data (FAQ, HowTo) ekle',
                ],
            },
        };
    }

    // Kural 2: Position iyileşip click artmıyorsa
    if (pd < -1.0 && cc < 5) {
        return {
            action: 'SNIPPET_INTENT_REVIEW',
            priorityScore: calculatePriority(input),
            detail: {
                title: 'Snippet ve Arama Niyeti İncelemesi',
                description: `Sıralama ${Math.abs(pd).toFixed(1)} basamak iyileşti ama click artmıyor (${cc.toFixed(1)}%).`,
                severity: 'warning',
                suggestedActions: [
                    'SERP\'te rakiplerin snippet\'larını incele',
                    'Kullanıcı niyetine göre içeriği güncelle',
                    'Rich snippet\'lar için structured data ekle',
                    'İçeriğin ilk paragrafını güçlendir',
                ],
            },
        };
    }

    // Kural 3: Click düşüşü
    if (cc < -15) {
        return {
            action: 'QUERY_LOSS_ANALYSIS',
            priorityScore: calculatePriority(input),
            detail: {
                title: 'Query Kaybı Analizi',
                description: `Click'lerde ${Math.abs(cc).toFixed(1)}% düşüş. Hangi query'ler kaybedildi incelenmeli.`,
                severity: 'warning',
                suggestedActions: [
                    'GSC query raporundan kaybedilen query\'leri bul',
                    'Rakiplerin bu query\'lerde sıralamasını kontrol et',
                    'İçerik güncellemesi yap',
                    'Internal link yapısını güçlendir',
                ],
            },
        };
    }

    // Kural 5: Position kötüleşiyor
    if (pd > 2.0) {
        return {
            action: 'POSITION_DECLINE_CHECK',
            priorityScore: calculatePriority(input),
            detail: {
                title: 'Sıralama Düşüşü Kontrolü',
                description: `Ortalama sıralama ${pd.toFixed(1)} basamak kötüleşti.`,
                severity: 'warning',
                suggestedActions: [
                    'İçeriğin güncelliğini kontrol et',
                    'Backlink profilini incele',
                    'Sayfa yükleme hızını kontrol et',
                    'İç link yapısını güçlendir',
                ],
            },
        };
    }

    // Kural 6: Büyüme
    if (cc > 20 && ic > 20) {
        return {
            action: 'GROWTH_OPPORTUNITY',
            priorityScore: calculatePriority(input),
            detail: {
                title: 'Büyüme Fırsatı',
                description: `Tüm metrikler yükselişte! Click +${cc.toFixed(1)}%, Impression +${ic.toFixed(1)}%.`,
                severity: 'positive',
                suggestedActions: [
                    'İçeriği genişlet ve derinleştir',
                    'İlgili konularda yeni sayfalar oluştur',
                    'Internal link ağını genişlet',
                    'Featured snippet pozisyonu hedefle',
                ],
            },
        };
    }

    // Default: İzle
    return {
        action: 'MONITOR',
        priorityScore: 0,
        detail: {
            title: 'İzlemeye Devam',
            description: 'Metrikler stabil. Önemli bir değişiklik yok.',
            severity: 'info',
            suggestedActions: [
                'Haftalık izlemeye devam et',
                'Rakip hareketlerini takip et',
            ],
        },
    };
}

// ============================================
// Priority Score Calculator
// ============================================

/**
 * Öncelik skoru hesaplar (0-100).
 * Yüksek skor = daha acil aksiyon gerekli.
 */
export function calculatePriority(input: ScoringInput): number {
    let score = 0;

    // Yüksek hacimli sayfalar daha önemli
    if (input.impressions > 1000) score += 30;
    else if (input.impressions > 500) score += 20;
    else if (input.impressions > 100) score += 10;
    else score += 5;

    // Büyük click düşüşleri daha acil
    const cc = input.clickChangePct ?? 0;
    if (cc < -30) score += 40;
    else if (cc < -15) score += 25;
    else if (cc < -5) score += 10;

    // Position kötüleşmesi
    const pd = input.positionDelta ?? 0;
    if (pd > 5) score += 20;
    else if (pd > 2) score += 10;

    // CTR düşüşü
    if ((input.ctrDelta ?? 0) < -1.0) score += 10;

    return Math.max(0, Math.min(100, score));
}

// ============================================
// Impact Analysis Helpers
// ============================================

export interface ImpactResult {
    clickUplift: number | null;
    impressionUplift: number | null;
    ctrUplift: number | null;
    positionChange: number | null;
    confidence: 'high' | 'medium' | 'low';
    verdict: 'positive' | 'negative' | 'neutral' | 'insufficient_data';
}

/**
 * Değişiklik etki sonucunu değerlendirir.
 * 
 * Güven eşikleri:
 * - high: >=100 impressions + >=10 veri günü (baseline)
 * - medium: >=30 impressions + >=5 veri günü
 * - low: bunların altı
 */
export function evaluateImpact(params: {
    baselineClicks: number;
    baselineImpressions: number;
    baselineDays: number;
    postClicks: number;
    postImpressions: number;
    postDays: number;
    baselineCtr: number;
    postCtr: number;
    baselinePosition: number;
    postPosition: number;
}): ImpactResult {
    const {
        baselineClicks, baselineImpressions, baselineDays,
        postClicks, postImpressions, postDays,
        baselineCtr, postCtr,
        baselinePosition, postPosition,
    } = params;

    // Güven seviyesi
    let confidence: 'high' | 'medium' | 'low' = 'low';
    if (baselineImpressions >= 100 && baselineDays >= 10) {
        confidence = 'high';
    } else if (baselineImpressions >= 30 && baselineDays >= 5) {
        confidence = 'medium';
    }

    // Yetersiz veri
    if (baselineDays < 3 || postDays < 3) {
        return {
            clickUplift: null,
            impressionUplift: null,
            ctrUplift: null,
            positionChange: null,
            confidence: 'low',
            verdict: 'insufficient_data',
        };
    }

    // Uplift hesaplama
    const clickUplift = baselineClicks > 0
        ? Math.round(((postClicks - baselineClicks) / baselineClicks) * 10000) / 100
        : null;

    const impressionUplift = baselineImpressions > 0
        ? Math.round(((postImpressions - baselineImpressions) / baselineImpressions) * 10000) / 100
        : null;

    const ctrUplift = Math.round((postCtr - baselineCtr) * 10000) / 10000;
    const positionChange = Math.round((postPosition - baselinePosition) * 100) / 100;

    // Karar
    let verdict: 'positive' | 'negative' | 'neutral' = 'neutral';

    if (clickUplift !== null) {
        if (clickUplift > 10) verdict = 'positive';
        else if (clickUplift < -10) verdict = 'negative';
    }

    return {
        clickUplift,
        impressionUplift,
        ctrUplift,
        positionChange,
        confidence,
        verdict,
    };
}
