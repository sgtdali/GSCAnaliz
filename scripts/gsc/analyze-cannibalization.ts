import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { fetchCannibalizationData } from '../../lib/gsc/client';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
    console.log('Cannibalization analizi başlıyor...');

    const today = new Date();
    const end = new Date(today);
    end.setDate(end.getDate() - 3);
    const start = new Date(end);
    start.setMonth(start.getMonth() - 3);

    const startDateStr = start.toISOString().split('T')[0];
    const endDateStr = end.toISOString().split('T')[0];

    console.log(`Veri Aralığı: ${startDateStr} - ${endDateStr}`);

    try {
        // 25.000 satır çekelim ki kapsamlı olsun
        const data = await fetchCannibalizationData(startDateStr, endDateStr, 25000);
        console.log(`GSC'den ${data.length} satır ham veri çekildi.`);

        const queryGroups = new Map<string, any[]>();
        for (const row of data) {
            const existing = queryGroups.get(row.query) || [];
            existing.push(row);
            queryGroups.set(row.query, existing);
        }

        const cannibalized = Array.from(queryGroups.entries())
            .filter(([_, pages]) => pages.length > 1)
            .map(([query, pages]) => {
                const totalClicks = pages.reduce((sum, p) => sum + p.clicks, 0);
                const totalImpressions = pages.reduce((sum, p) => sum + p.impressions, 0);
                const sortedPages = pages.sort((a, b) => b.clicks - a.clicks || b.impressions - a.impressions);

                return {
                    query,
                    totalClicks,
                    totalImpressions,
                    pageCount: pages.length,
                    pages: sortedPages
                };
            })
            .sort((a, b) => b.totalClicks - a.totalClicks || b.totalImpressions - a.totalImpressions);

        console.log(`Toplam ${cannibalized.length} adet cannibalization (çakışan kelime) tespit edildi.`);

        // MD Raporu Oluştur
        let md = `# Keyword Cannibalization Raporu (Tüm Site)\n\n`;
        md += `> **Analiz Tarihi:** ${today.toISOString().split('T')[0]}\n`;
        md += `> **GSC Veri Aralığı:** ${startDateStr} ~ ${endDateStr}\n`;
        md += `> **Tespit Edilen Çakışan Kelime Sayısı:** ${cannibalized.length}\n\n`;
        md += `Bu rapor, aynı anahtar kelime için Google sonuçlarında görünen birden fazla URL'yi listeler. En çok tıklama ve gösterim alan kelimeler en üsttedir.\n\n`;
        md += `---\n\n`;

        // İlk 100 tanesini detaylı listele
        md += `## İlk 100 Kritik Çakışma\n\n`;

        cannibalized.slice(0, 100).forEach((item, index) => {
            md += `### ${index + 1}. "${item.query}"\n`;
            md += `- **Toplam Tıklama:** ${item.totalClicks}\n`;
            md += `- **Toplam Gösterim:** ${item.totalImpressions}\n`;
            md += `- **Sayfa Sayısı:** ${item.pageCount}\n\n`;

            md += `| Tıklama | Gösterim | Sıra | URL |\n`;
            md += `|---------|----------|------|-----|\n`;
            item.pages.forEach(p => {
                md += `| ${p.clicks} | ${p.impressions} | ${p.position} | ${p.page} |\n`;
            });
            md += `\n`;
        });

        const outputPath = path.join(__dirname, '..', '..', 'docs', 'cannibalization_raporu.md');
        fs.writeFileSync(outputPath, md, 'utf-8');
        console.log(`Rapor oluşturuldu: ${outputPath}`);

    } catch (error) {
        console.error('Hata:', error);
    }
}

main();
