import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api/middleware';
import * as cheerio from 'cheerio';

async function fetchHtml(url: string) {
    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            },
            next: { revalidate: 0 }
        });
        if (!response.ok) return null;
        return await response.text();
    } catch (e) {
        return null;
    }
}

interface AnalyzedUrl {
    url: string;
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

        for (const url of urls) {
            const html = await fetchHtml(url);
            if (!html) {
                reports.push({
                    url, title: 'Error fetching', description: '', h1: [], isProduct: false, isBlog: false, linksToOthers: []
                });
                continue;
            }

            const $ = cheerio.load(html);
            const title = $('title').text() || '';
            const description = $('meta[name="description"]').attr('content') || '';
            const h1s: string[] = [];
            $('h1').each((_, el) => { h1s.push($(el).text().trim()); });

            const isProduct = url.includes('/product/');
            const isBlog = url.includes('/blog/');

            // Check if this page links to other pages in the conflict
            const otherUrls = urls.filter(u => u !== url);
            const linksToOthers: string[] = [];
            $('a').each((_, el) => {
                const href = $(el).attr('href');
                if (href) {
                    const fullHref = href.startsWith('/') ? `https://uygunbakim.com${href}` : href;
                    if (otherUrls.includes(fullHref)) {
                        linksToOthers.push(fullHref);
                    }
                }
            });

            reports.push({
                url,
                title,
                description,
                h1: h1s,
                isProduct,
                isBlog,
                linksToOthers: [...new Set(linksToOthers)]
            });
        }

        // --- SPECIFIC ACTION GENERATOR ---
        const actions: string[] = [];
        const mainUrl = reports[0].url; // Usually the one with most clicks

        // Logic 1: Product vs Blog Conflict
        const blogPages = reports.filter(r => r.isBlog);
        const productPages = reports.filter(r => r.isProduct);

        if (blogPages.length > 0 && productPages.length > 0) {
            blogPages.forEach(blog => {
                const targets = productPages.map(p => p.url);
                const linkedToProduct = blog.linksToOthers.some(l => targets.includes(l));

                if (!linkedToProduct) {
                    actions.push(`[İç Linkleme] "${blog.url}" blog yazısı içindeki "${query}" kelimesinden "${productPages[0].url}" ürün sayfasına link verilmemiş. Mutlaka bir link eklenmeli.`);
                } else {
                    actions.push(`[İç Linkleme] "${blog.url}" yazısı ürüne link veriyor, harika. Linkin anchor text'inin tam olarak "${query}" olduğundan emin olun.`);
                }

                // Title check for Intent
                if (blog.title.toLowerCase().includes('fiyat') || blog.title.toLowerCase().includes('satın al')) {
                    actions.push(`[Başlık Düzenleme] "${blog.url}" başlığında ticari terimler (fiyat/satın al) var. Bunları kaldırıp "İnceleme" veya "Koku Profili" gibi bilgilendirici kelimelere odaklanın.`);
                }
            });
        }

        // Logic 2: Title Overlap
        for (let i = 0; i < reports.length; i++) {
            for (let j = i + 1; j < reports.length; j++) {
                if (reports[i].title.includes(query) && reports[j].title.includes(query)) {
                    actions.push(`[Başlık Çakışması] Hem "${reports[i].url}" hem de "${reports[j].url}" başlığında "${query}" geçiyor. Birini daha spesifik hale getirin (örn: birine "İnceleme" ekleyin).`);
                }
            }
        }

        // Logic 3: Missing H1 keyword
        reports.forEach(r => {
            const hasKeywordInH1 = r.h1.some(h => h.toLowerCase().includes(query.toLowerCase()));
            if (!hasKeywordInH1) {
                actions.push(`[H1 Eksikliği] "${r.url}" sayfasının H1 etiketinde "${query}" kelimesi geçmiyor. Google bu yüzden niyetini tam anlamıyor olabilir.`);
            }
        });

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
