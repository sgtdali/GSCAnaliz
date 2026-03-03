import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api/middleware';
import * as cheerio from 'cheerio';

async function fetchHtml(url: string) {
    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            },
            redirect: 'manual', // Redirect'leri (301/302) manuel yakalamak için
            next: { revalidate: 0 }
        });

        if (response.status === 301 || response.status === 302 || response.status === 308) {
            return {
                status: response.status,
                redirectUrl: response.headers.get('location'),
                text: ''
            };
        }

        return {
            status: response.status,
            redirectUrl: null,
            text: response.ok ? await response.text() : ''
        };
    } catch (e) {
        return { status: 500, redirectUrl: null, text: '' };
    }
}

interface AnalyzedUrl {
    url: string;
    status: number;
    redirectUrl: string | null;
    title: string;
    description: string;
    h1: string[];
    isProduct: boolean;
    isBlog: boolean;
    linksToOthers: string[];
}

export async function POST(request: NextRequest) {
    try {
        const { urls, query } = await request.json();

        if (!urls || !Array.isArray(urls)) {
            return errorResponse('URLs array is required', 400);
        }

        const reports: AnalyzedUrl[] = [];

        // ÖNCE TÜM SAYFALARI ÇEK
        for (const url of urls) {
            const { status, text, redirectUrl } = await fetchHtml(url);

            if (status !== 200) {
                reports.push({
                    url, status, redirectUrl, title: status === 404 ? 'Sayfa Bulunamadı' : (redirectUrl ? 'Yönlendirilmiş' : 'Hata'),
                    description: '', h1: [], isProduct: url.includes('/product/'), isBlog: url.includes('/blog/'), linksToOthers: []
                });
                continue;
            }

            const $ = cheerio.load(text);
            const title = $('title').text() || '';
            const description = $('meta[name="description"]').attr('content') || '';
            const h1s: string[] = [];
            $('h1').each((_, el) => { h1s.push($(el).text().trim()); });

            // İç link kontrolü: Bu sayfadan diğer rakip sayfalara link var mı?
            const otherUrls = urls.filter(u => u !== url);
            const linksFound: string[] = [];
            $('a').each((_, el) => {
                const href = $(el).attr('href');
                if (href) {
                    const fullHref = href.startsWith('/') ? `https://uygunbakim.com${href}` : href;
                    const baseHref = fullHref.split('#')[0]; // Anchor'sız kontrol et
                    if (otherUrls.map(u => u.split('#')[0]).includes(baseHref)) {
                        linksFound.push(fullHref);
                    }
                }
            });

            reports.push({
                url, status, redirectUrl: null, title, description, h1: h1s,
                isProduct: url.includes('/product/'),
                isBlog: url.includes('/blog/'),
                linksToOthers: [...new Set(linksFound)]
            });
        }

        const actions: string[] = [];
        const alivePages = reports.filter(r => r.status === 200 && !r.redirectUrl);
        const deadPages = reports.filter(r => r.status === 404);
        const redirectedPages = reports.filter(r => r.redirectUrl);

        // --- 1. YÖNLENDİRME TESPİTİ (ÇÖZÜLENLER) ---
        redirectedPages.forEach(r => {
            actions.push(`[ÇÖZÜLDÜ] "${r.url}" sayfası artık yönleniyor (${r.status} Status). Cannibalization bu URL için engellenmiş.`);
        });

        // --- 2. 404 KRİTİK HATALARI ---
        deadPages.forEach(dead => {
            const target = alivePages.length > 0 ? alivePages[0].url : 'çalışan başka bir sayfaya';
            actions.push(`[KRİTİK - 404!] "${dead.url}" sayfası 404 dönüyor! Google'da hala gösterim aldığı için derhal "${target}" adresine 301 yönlendirmesi yapılmalıdır.`);
        });

        // --- 3. ÜRÜN VS BLOG ÇAKIŞMASI ---
        const blogPages = alivePages.filter(r => r.isBlog);
        const productPages = alivePages.filter(r => r.isProduct);

        if (blogPages.length > 0 && productPages.length > 0) {
            blogPages.forEach(blog => {
                const targetProduct = productPages[0];
                const hasLink = blog.linksToOthers.some(l => l.includes(targetProduct.url.split('/product/')[1]));

                if (!hasLink) {
                    actions.push(`[İç Linkleme] "${blog.url}" blog yazısı içindeki "${query}" kelimesinden "${targetProduct.url}" ürün sayfasına link verilmemiş. Google'ın ürünü lider seçmesi için link eklenmeli.`);
                }

                if (blog.title.toLowerCase().includes('fiyat') || blog.title.toLowerCase().includes('satın al')) {
                    actions.push(`[Niyet Karmaşası] "${blog.url}" başlığında satın alma terimleri var. Bunları kaldırıp bilgilendirici kelimelere (İnceleme/Notalar) odaklanın ki ürünle çakışmasın.`);
                }
            });
        }

        // --- 4. BAŞLIK ÇAKIŞMASI ---
        for (let i = 0; i < alivePages.length; i++) {
            for (let j = i + 1; j < alivePages.length; j++) {
                if (alivePages[i].title.toLowerCase().includes(query.toLowerCase()) &&
                    alivePages[j].title.toLowerCase().includes(query.toLowerCase())) {
                    actions.push(`[Başlık Çatışması] "${alivePages[i].url}" ve "${alivePages[j].url}" başlıklarında "${query}" geçiyor. Birini daha spesifik hale getirin.`);
                }
            }
        }

        // --- 5. H1 EKSİKLİĞİ ---
        alivePages.forEach(r => {
            const hasKeywordInH1 = r.h1.some(h => h.toLowerCase().includes(query.toLowerCase()));
            if (!hasKeywordInH1) {
                actions.push(`[H1 Eksikliği] "${r.url}" sayfasının H1 veya başlığında "${query}" kelimesi geçmiyor. Google'ın niyeti anlaması güçleşiyor.`);
            }
        });

        if (actions.length === 0 && alivePages.length > 1) {
            actions.push(`[Bilgi] ${alivePages.length} adet canlı sayfa hala çakışmaya devam ediyor, ancak temel SEO kriterleri (Link/Başlık) düzgün görünüyor. İçerik derinliğini kontrol edin.`);
        }

        return successResponse({
            query,
            reports,
            specificActions: [...new Set(actions)]
        });

    } catch (error) {
        console.error('[API /analyze-urls] Error:', error);
        return errorResponse('Analysis failed', 500);
    }
}
