import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { fetchAllPagesWithTraffic } from '../../lib/gsc/client';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
    console.log('Başlıyor: 1 Gösterimi Olan Sayfalar Analizi...');

    // 1. Tarih aralığını belirle (Son 90 gün)
    // GSC verisi genellikle 2-3 gün geriden gelir.
    const today = new Date();
    const end = new Date(today);
    end.setDate(end.getDate() - 3);

    const start = new Date(end);
    start.setDate(start.getDate() - 90);

    const startDate = start.toISOString().split('T')[0];
    const endDate = end.toISOString().split('T')[0];

    console.log(`GSC Veri Aralığı: ${startDate} ile ${endDate} arası (Son 90 gün)`);

    // 2. GSC'den tüm sayfaları çek (tüm site için urlPrefix = '')
    let allPages: { page: string; clicks: number; impressions: number }[] = [];
    try {
        console.log('GSC API üzerinden sayfalar çekiliyor...');
        allPages = await fetchAllPagesWithTraffic(startDate, endDate, '');
    } catch (e) {
        console.error('GSC verisi çekilirken hata oluştu:', e);
        process.exit(1);
    }

    console.log(`GSC'de toplam ${allPages.length} sayfa bulundu.`);

    // 3. 1 gösterimi olanları filtrele (ve anchor linkleri hariç tut)
    const oneImpressionPages = allPages.filter(p => p.impressions === 1 && !p.page.includes('#'));
    console.log(`Sadece 1 gösterimi olan (anchor hariç) sayfa sayısı: ${oneImpressionPages.length}`);

    // 4. Kategorilere ayır
    const categories: Record<string, typeof oneImpressionPages> = {
        product: [],
        blog: [],
        brand: [],
        other: []
    };

    oneImpressionPages.forEach(p => {
        if (p.page.includes('/product/')) {
            categories.product.push(p);
        } else if (p.page.includes('/blog/')) {
            categories.blog.push(p);
        } else if (p.page.includes('/brand/')) {
            categories.brand.push(p);
        } else {
            categories.other.push(p);
        }
    });

    // 5. Raporu oluştur
    let md = `# Son 90 Günde Sadece 1 Gösterim Alan Sayfalar\n\n`;
    md += `> **Analiz Tarihi:** ${today.toISOString().split('T')[0]}\n`;
    md += `> **GSC Veri Aralığı:** ${startDate} ~ ${endDate} (Son 90 gün)\n`;
    md += `> **GSC'de Gösterim Alan Toplam URL:** ${allPages.length}\n`;
    md += `> **Sadece 1 Gösterim Alan URL Sayısı:** ${oneImpressionPages.length}\n\n`;
    md += `---\n\n`;

    md += `## Özet\n\n`;
    md += `| Kategori | Sayfa Sayısı |\n`;
    md += `|----------|--------------|\n`;
    md += `| 🛍️ Ürün Sayfaları | ${categories.product.length} |\n`;
    md += `| 📝 Blog Sayfaları | ${categories.blog.length} |\n`;
    md += `| 🏷️ Marka Sayfaları | ${categories.brand.length} |\n`;
    md += `| 📄 Diğer Sayfalar | ${categories.other.length} |\n`;
    md += `| **Toplam** | **${oneImpressionPages.length}** |\n\n`;

    const addSection = (title: string, pages: typeof oneImpressionPages) => {
        if (pages.length === 0) return;
        md += `## ${title} (${pages.length})\n\n`;
        md += `| # | URL | Tıklama | Gösterim |\n`;
        md += `|---|-----|---------|----------|\n`;
        pages.forEach((p, index) => {
            md += `| ${index + 1} | ${p.page} | ${p.clicks} | ${p.impressions} |\n`;
        });
        md += `\n`;
    };

    addSection('📝 Blog Sayfaları', categories.blog);
    addSection('🛍️ Ürün Sayfaları', categories.product);
    addSection('🏷️ Marka Sayfaları', categories.brand);
    addSection('📄 Diğer Sayfalar', categories.other);

    // 6. Dosyaya kaydet
    const docsDir = path.join(__dirname, '..', '..', 'docs');
    if (!fs.existsSync(docsDir)) {
        fs.mkdirSync(docsDir, { recursive: true });
    }

    const outputPath = path.join(docsDir, 'bir_gosterim_alanlar_' + endDate + '.md');
    fs.writeFileSync(outputPath, md, 'utf-8');

    console.log(`\nRapor başarıyla oluşturuldu: ${outputPath}`);
}

main();
