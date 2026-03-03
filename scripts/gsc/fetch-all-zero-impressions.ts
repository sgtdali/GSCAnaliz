import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { fetchAllPagesWithTraffic } from '../../lib/gsc/client';
import * as https from 'https';
import * as fs from 'fs';
import * as path from 'path';

function fetchUrl(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(data));
            res.on('error', reject);
        }).on('error', reject);
    });
}

async function main() {
    console.log('Başlıyor...');

    // 1. Tarih aralığını belirle (Son 3 ay)
    // GSC data usually has 2-3 days lag. So we'll use today - 3 days as end date.
    const today = new Date();
    const end = new Date(today);
    end.setDate(end.getDate() - 3);

    const start = new Date(end);
    start.setMonth(start.getMonth() - 3);

    const startDate = start.toISOString().split('T')[0];
    const endDate = end.toISOString().split('T')[0];

    console.log(`GSC Veri Aralığı: ${startDate} ile ${endDate} arası (Son 3 ay)`);

    // 2. Sitemap'ten URL'leri çek
    console.log('Sitemap indiriliyor...');
    let xml = '';
    try {
        xml = await fetchUrl('https://uygunbakim.com/sitemap.xml');
    } catch (e) {
        console.error('Sitemap çekilirken hata oluştu:', e);
        process.exit(1);
    }

    const locRegex = /<loc>(.*?)<\/loc>/g;
    const sitemapUrls: string[] = [];
    let match;
    while ((match = locRegex.exec(xml)) !== null) {
        sitemapUrls.push(match[1]);
    }
    console.log(`Sitemap'te toplam ${sitemapUrls.length} URL bulundu.`);

    // 3. GSC'den gösterim alan tüm URL'leri çek
    console.log('GSC API üzerinden tüm URL\\ler için metrikler çekiliyor (bu işlem biraz sürebilir)...');
    let pagesWithTraffic: { page: string; clicks: number; impressions: number }[] = [];
    try {
        // urlPrefix olarak boş string gönderiyoruz ki filtre uygulamasın ve tüm siteyi çeksin
        pagesWithTraffic = await fetchAllPagesWithTraffic(startDate, endDate, '');
    } catch (e) {
        console.error('GSC verisi çekilirken hata oluştu:', e);
        process.exit(1);
    }

    console.log(`GSC'de son 3 ayda gösterim alan sayfalar: ${pagesWithTraffic.length}`);

    const gscUrls = new Set(pagesWithTraffic.map(p => p.page));

    // 4. Eşleştirme - Gösterim almayanları bul
    const noImpressionUrls = sitemapUrls.filter(url => !gscUrls.has(url));

    // 5. Kategorilere ayır
    const categories: Record<string, string[]> = {
        product: [],
        blog: [],
        brand: [],
        other: []
    };

    noImpressionUrls.forEach(url => {
        if (url.includes('/product/')) {
            categories.product.push(url);
        } else if (url.includes('/blog/')) {
            categories.blog.push(url);
        } else if (url.includes('/brand/')) {
            categories.brand.push(url);
        } else {
            categories.other.push(url);
        }
    });

    // 6. Raporu oluştur
    let md = `# Sitemap'te Olup GSC'de Son 3 Ayda HİÇ Gösterim Almayan URL'ler (Tüm Site)\n\n`;
    md += `> **Analiz Tarihi:** ${today.toISOString().split('T')[0]}\n`;
    md += `> **GSC Veri Aralığı:** ${startDate} ~ ${endDate} (Son 3 ay)\n`;
    md += `> **Sitemap Toplam URL:** ${sitemapUrls.length}\n`;
    md += `> **GSC'de Gösterim Alan Toplam URL:** ${pagesWithTraffic.length}\n`;
    md += `> **Hiç Gösterim Almayan URL:** ${noImpressionUrls.length}\n\n`;
    md += `---\n\n`;

    md += `## Özet\n\n`;
    md += `| Kategori | Adet |\n`;
    md += `|----------|------|\n`;
    md += `| 🛍️ Ürün Sayfaları | ${categories.product.length} |\n`;
    md += `| 📝 Blog Sayfaları | ${categories.blog.length} |\n`;
    md += `| 🏷️ Marka Sayfaları | ${categories.brand.length} |\n`;
    md += `| 📄 Diğer Sayfalar | ${categories.other.length} |\n`;
    md += `| **Toplam** | **${noImpressionUrls.length}** |\n\n`;

    const addSection = (title: string, urls: string[]) => {
        if (urls.length === 0) return;
        md += `## ${title} (${urls.length})\n\n`;
        urls.forEach((url, index) => {
            md += `${index + 1}. ${url}\n`;
        });
        md += `\n`;
    };

    addSection('📄 Diğer Sayfalar', categories.other);
    addSection('📝 Blog Sayfaları', categories.blog);
    addSection('🏷️ Marka Sayfaları', categories.brand);
    addSection('🛍️ Ürün Sayfaları', categories.product);

    // 7. Dosyaya kaydet
    const docsDir = path.join(__dirname, '..', '..', 'docs');
    if (!fs.existsSync(docsDir)) {
        fs.mkdirSync(docsDir, { recursive: true });
    }

    const outputPath = path.join(docsDir, 'tum_site_sifir_gosterim_' + endDate + '.md');
    fs.writeFileSync(outputPath, md, 'utf-8');

    console.log(`\nRapor başarıyla oluşturuldu: ${outputPath}`);
    console.log(`Toplam Gösterim Almayan: ${noImpressionUrls.length}`);
    console.log(`  Ürün:   ${categories.product.length}`);
    console.log(`  Blog:   ${categories.blog.length}`);
    console.log(`  Marka:  ${categories.brand.length}`);
    console.log(`  Diğer:  ${categories.other.length}`);
}

main();
