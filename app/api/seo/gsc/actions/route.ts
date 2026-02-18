/**
 * GET /api/seo/gsc/actions
 * 
 * Aksiyon önerileri — WoW analizine dayalı otomatik tavsiyeler.
 * 
 * Query params:
 *   - page (optional): URL — boşsa tüm sayfalar
 *   - minImpressions (optional): minimum impression eşiği (default: 50)
 * 
 * Response:
 * {
 *   success: true,
 *   data: [
 *     {
 *       page, total_clicks, total_impressions, avg_ctr, avg_position,
 *       click_change_pct, impression_change_pct, ctr_delta, position_delta,
 *       action_recommendation: 'TITLE_META_TEST' | 'SNIPPET_INTENT_REVIEW' | ...
 *       priority_score: 0-100,
 *       action_detail: { ... }  // İnsan tarafından okunabilir açıklama
 *     }
 *   ]
 * }
 * 
 * Action Types:
 * - TITLE_META_TEST: Impressions ↑ + CTR ↓ → Title/meta desc test öner
 * - SNIPPET_INTENT_REVIEW: Position ↑ + Click = → Snippet/intent uyumu incele
 * - QUERY_LOSS_ANALYSIS: Click ↓↓ → Hangi query'ler kayboldu analizi
 * - URGENT_REVIEW: Tüm metrikler ↓ → Acil inceleme
 * - POSITION_DECLINE_CHECK: Position ↓ → Teknik/içerik kontrolü
 * - GROWTH_OPPORTUNITY: Tüm metrikler ↑ → Fırsatı büyüt
 * - MONITOR: Stabil → İzlemeye devam
 */

import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api/middleware';
import { getActionRecommendations } from '@/lib/db/queries';

const ACTION_DETAILS: Record<string, { title: string; description: string; suggestedActions: string[] }> = {
    TITLE_META_TEST: {
        title: 'Title / Meta Description Testi',
        description: 'Impressions artarken CTR düşüyor. Kullanıcılar sayfanızı görüyor ama tıklamıyor.',
        suggestedActions: [
            'Title tag\'i daha çekici/spesifik yap',
            'Meta description\'a CTA ekle',
            'Featured snippet formatı dene',
            'Structured data (FAQ, HowTo) ekle',
        ],
    },
    SNIPPET_INTENT_REVIEW: {
        title: 'Snippet ve Arama Niyeti İncelemesi',
        description: 'Sıralama iyileşti ama click artmıyor. Arama niyeti ile içerik uyumsuz olabilir.',
        suggestedActions: [
            'SERP\'te rakiplerin snippet\'larını incele',
            'Kullanıcı niyetine (informational/transactional) göre içeriği güncelle',
            'Rich snippet\'lar için structured data ekle',
            'İçeriğin ilk paragrafını güçlendir',
        ],
    },
    QUERY_LOSS_ANALYSIS: {
        title: 'Query Kaybı Analizi',
        description: 'Click\'lerde ciddi düşüş var. Hangi query\'ler kaybedildi incelenmeli.',
        suggestedActions: [
            'GSC query raporundan kaybedilen query\'leri bul',
            'Rakiplerin bu query\'lerde sıralamasını kontrol et',
            'İçerik güncellemesi yap (freshness sinyali)',
            'Internal link yapısını güçlendir',
        ],
    },
    URGENT_REVIEW: {
        title: 'Acil İnceleme Gerekli',
        description: 'Tüm metrikler düşüyor. Teknik sorun veya algoritma güncellemesi olabilir.',
        suggestedActions: [
            'Google Search Console\'da manual action kontrol et',
            'Site hızı ve Core Web Vitals kontrol et',
            'Crawl hataları kontrol et',
            'Canonical tag ve hreflang kontrol et',
            'Rakip analizi yap — sektörel düşüş mü yoksa site-specific mi?',
        ],
    },
    POSITION_DECLINE_CHECK: {
        title: 'Sıralama Düşüşü Kontrolü',
        description: 'Ortalama sıralama kötüleşiyor. İçerik veya teknik sorun olabilir.',
        suggestedActions: [
            'İçeriğin güncelliğini kontrol et',
            'Backlink profilini incele (kayıp linkler?)',
            'Sayfa yükleme hızını kontrol et',
            'İç link yapısını güçlendir',
        ],
    },
    GROWTH_OPPORTUNITY: {
        title: 'Büyüme Fırsatı',
        description: 'Tüm metrikler yükselişte. Bu sayfayı daha da güçlendirin.',
        suggestedActions: [
            'İçeriği genişlet ve derinleştir',
            'İlgili konularda yeni sayfalar oluştur',
            'Internal link ağını genişlet',
            'Featured snippet pozisyonu hedefle',
        ],
    },
    MONITOR: {
        title: 'İzlemeye Devam',
        description: 'Metrikler stabil. Önemli bir değişiklik yok.',
        suggestedActions: [
            'Haftalık izlemeye devam et',
            'Rakip hareketlerini takip et',
        ],
    },
};

export async function GET(request: NextRequest) {

    const searchParams = request.nextUrl.searchParams;
    const page = searchParams.get('page') || undefined;
    const minImpressions = parseInt(searchParams.get('minImpressions') || '50', 10);

    try {
        const recommendations = await getActionRecommendations(page, minImpressions);

        // Her öneri için detay bilgisi ekle
        const enrichedData = recommendations.map(rec => ({
            ...rec,
            action_detail: ACTION_DETAILS[rec.action_recommendation] || ACTION_DETAILS['MONITOR'],
        }));

        return successResponse(enrichedData, {
            totalRows: enrichedData.length,
            page: page || 'all',
            minImpressions,
        });
    } catch (error) {
        console.error('[API /actions] Error:', (error as Error).message);
        return errorResponse('Internal server error', 500);
    }
}
