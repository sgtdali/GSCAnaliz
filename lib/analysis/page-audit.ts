import * as cheerio from 'cheerio';
import { getIncomingLinks } from '../db/internal-links';
import { getDailyMetrics } from '../db/queries';
import { getAllBrands } from '../db/brands';
import { fetchSingleUrlDetail } from '../gsc/client';
import { subDays, format } from 'date-fns';

export type RuleStatus = 'ok' | 'warning' | 'critical';

export interface RuleResult {
    id: string;
    status: RuleStatus;
    message: string;
    action: string | null;
}

export interface PageAuditResult {
    url: string;
    query: string;
    gscData: {
        impressions: number;
        clicks: number;
        position: number;
        ctr: number;
    };
    score: number;
    rules: RuleResult[];
    summary: {
        critical: number;
        warning: number;
        ok: number;
    };
}

export async function performPageAudit(url: string, targetQuery?: string): Promise<PageAuditResult> {
    // 1. Get GSC Data and determine top query if missing
    const today = new Date();
    const endDate = subDays(today, 2);
    const startDate = subDays(endDate, 30);
    const startStr = format(startDate, 'yyyy-MM-dd');
    const endStr = format(endDate, 'yyyy-MM-dd');

    const gscDetail = await fetchSingleUrlDetail(url, startStr, endStr);

    // Top query determination
    let query = targetQuery;
    if (!query && gscDetail.queries.length > 0) {
        // Find top impression query
        const topQ = [...gscDetail.queries].sort((a, b) => b.impressions - a.impressions)[0];
        query = topQ.query;
    }
    query = query || 'n/a';

    // Aggregate GSC Metrics
    const impressions = gscDetail.queries.reduce((sum, q) => sum + q.impressions, 0);
    const clicks = gscDetail.queries.reduce((sum, q) => sum + q.clicks, 0);
    const position = gscDetail.queries.length > 0
        ? gscDetail.queries.reduce((sum, q) => sum + q.position, 0) / gscDetail.queries.length
        : 0;
    const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;

    // 2. Fetch HTML
    let html = '';
    try {
        const response = await fetch(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36 (Antigravity Audit/2.0)' },
            signal: AbortSignal.timeout(10000),
        });
        if (response.ok) {
            html = await response.text();
        }
    } catch (err) {
        console.error(`Audit fetch failed for ${url}:`, err);
    }

    const $ = cheerio.load(html);
    const title = $('title').text().trim();
    const h1 = $('h1').first().text().trim();
    const bodyText = $('body').text().replace(/\s+/g, ' ').trim();
    const wordCount = bodyText.split(' ').length;

    // 3. Database queries
    const [incomingLinks, allBrands] = await Promise.all([
        getIncomingLinks(url),
        getAllBrands()
    ]);

    const rules: RuleResult[] = [];
    const tq = query.toLowerCase();

    // R01 - Title Length
    if (title.length > 60) {
        rules.push({
            id: 'R01',
            status: 'critical',
            message: `Title ${title.length} karakter (max 60)`,
            action: `Title'ı kısalt: "${title.slice(0, 57)}..."`
        });
    } else {
        rules.push({ id: 'R01', status: 'ok', message: 'Title uzunluğu uygun', action: null });
    }

    // R02 - Keyword in Title
    if (!title.toLowerCase().includes(tq)) {
        rules.push({
            id: 'R02',
            status: 'warning',
            message: `Title'da hedef keyword yok: "${query}"`,
            action: `Title başına "${query}" ekle`
        });
    } else {
        rules.push({ id: 'R02', status: 'ok', message: 'Keyword title\'da geçiyor', action: null });
    }

    // R03 - Keyword in H1
    if (!h1.toLowerCase().includes(tq)) {
        rules.push({
            id: 'R03',
            status: 'warning',
            message: `H1'de hedef keyword yok`,
            action: `H1'i şu şekilde güncelle: "${query} + mevcut h1"`
        });
    } else {
        rules.push({ id: 'R03', status: 'ok', message: 'Keyword H1\'de geçiyor', action: null });
    }

    // R04 - Content Length
    if (wordCount < 300) {
        rules.push({
            id: 'R04',
            status: 'critical',
            message: `İçerik ${wordCount} kelime`,
            action: `En az 300 kelimeye çıkar`
        });
    } else if (wordCount < 500) {
        rules.push({
            id: 'R04',
            status: 'warning',
            message: `İçerik ${wordCount} kelime`,
            action: `500 kelimeye yaklaştır`
        });
    } else {
        rules.push({ id: 'R04', status: 'ok', message: `İçerik uzunluğu yeterli (${wordCount} kelime)`, action: null });
    }

    // R05 - Bullet point / list
    const listItems = $('ul li, ol li').length;
    if (listItems > 50) { // Spec says > 5 -> warning but 5 is very small for a perfume site. I'll use 50 or re-read. 
        // User spec says: if ($('ul li, ol li').length > 5) → warning. Message: "${n} adet liste item tespit edildi". Action: "Liste yerine düzyazı (prose) kullan"
        // I will follow the user's exactly requested number 5.
    }
    if (listItems > 5) {
        rules.push({
            id: 'R05',
            status: 'warning',
            message: `${listItems} adet liste item tespit edildi`,
            action: 'Liste yerine düzyazı (prose) kullan'
        });
    } else {
        rules.push({ id: 'R05', status: 'ok', message: 'Liste item sayısı makul', action: null });
    }

    // FAQ Analysis
    const hasFaq = bodyText.toLowerCase().includes('sık') || bodyText.toLowerCase().includes('soru');
    let firstAnswerLength = 0;

    // Try to find FAQ patterns in text or schema
    const faqSchemaCount = $('script[type="application/ld+json"]').filter((_, el) => {
        try {
            const j = JSON.parse($(el).html() || '{}');
            if (j['@type'] === 'FAQPage') {
                const firstA = j.mainEntity?.[0]?.acceptedAnswer?.text || '';
                firstAnswerLength = firstA.replace(/<[^>]*>/g, '').length;
                return true;
            }
        } catch (e) { }
        return false;
    }).length;

    // R06 - FAQ presence
    if (!hasFaq && faqSchemaCount === 0 && position > 5 && position < 20) {
        rules.push({
            id: 'R06',
            status: 'warning',
            message: `FAQ bölümü yok, pozisyon ${position.toFixed(1)}`,
            action: `Featured snippet için FAQ ekle: "${query} nedir/nasıl/ne zaman"`
        });
    } else {
        rules.push({ id: 'R06', status: 'ok', message: 'FAQ durumu uygun veya pozisyon dışı', action: null });
    }

    // R07 - FAQ Answer length
    if ((hasFaq || faqSchemaCount > 0) && firstAnswerLength > 160) {
        rules.push({
            id: 'R07',
            status: 'warning',
            message: `İlk FAQ cevabı ${firstAnswerLength} karakter (max 160)`,
            action: `İlk cevabı ${firstAnswerLength - 160} karakter kısalt`
        });
    } else if (hasFaq || faqSchemaCount > 0) {
        rules.push({ id: 'R07', status: 'ok', message: 'FAQ cevap uzunluğu uygun', action: null });
    }

    // R08 - Banned Words
    const bannedWords = ['bütçe dostu', 'ekonomik', 'uygun fiyat', 'cüzdanınızı', 'fiyatının çok üzerinde', 'ucuz', 'pahalı'];
    const foundBanned = bannedWords.filter(w => bodyText.toLowerCase().includes(w));
    if (foundBanned.length > 0) {
        rules.push({
            id: 'R08',
            status: 'critical',
            message: `Yasaklı ifadeler: ${foundBanned.join(', ')}`,
            action: `Bu ifadeleri sil: ${foundBanned.join(', ')}`
        });
    } else {
        rules.push({ id: 'R08', status: 'ok', message: 'Yasaklı ifade bulunmadı', action: null });
    }

    // R09 - Competitor Brands
    const competitorBrands = allBrands
        .filter(b => b.is_original && bodyText.toLowerCase().includes(b.name.toLowerCase()))
        .map(b => b.name);

    if (competitorBrands.length > 0) {
        rules.push({
            id: 'R09',
            status: 'warning',
            message: `Rakip marka adı geçiyor: ${competitorBrands.join(', ')}`,
            action: `Bu marka isimlerini çıkar veya "orijinal" gibi genel bir ifadeyle değiştir`
        });
    } else {
        rules.push({ id: 'R09', status: 'ok', message: 'Rakip marka adı tespit edilmedi', action: null });
    }

    // R10 - Internal link count
    if (incomingLinks.length < 2) {
        rules.push({
            id: 'R10',
            status: 'warning',
            message: `Bu sayfaya sadece ${incomingLinks.length} internal link var`,
            action: `Google Search Console'da "${query}" için sıralanan diğer benzer sayfalardan link ekleyerek otoriteyi artırın.`
        });
    } else {
        rules.push({ id: 'R10', status: 'ok', message: `İç link sayısı yeterli (${incomingLinks.length})`, action: null });
    }

    // Calculate score
    // Base 100. Critical: -20, Warning: -10
    let score = 100;
    let criticalCount = 0;
    let warningCount = 0;
    let okCount = 0;

    rules.forEach(r => {
        if (r.status === 'critical') {
            score -= 20;
            criticalCount++;
        } else if (r.status === 'warning') {
            score -= 10;
            warningCount++;
        } else {
            okCount++;
        }
    });

    return {
        url,
        query,
        gscData: {
            impressions,
            clicks,
            position: Number(position.toFixed(1)),
            ctr: Number(ctr.toFixed(2))
        },
        score: Math.max(0, score),
        rules,
        summary: {
            critical: criticalCount,
            warning: warningCount,
            ok: okCount
        }
    };
}
