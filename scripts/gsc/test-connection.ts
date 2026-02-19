/**
 * GSC Bağlantı Testi - Supabase'siz
 * Sadece Google Search Console API'den veri çekip terminale basar.
 */

import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
import { google } from 'googleapis';

async function main() {
    console.log('🔌 GSC API bağlantı testi başlıyor...\n');

    // 1. OAuth client oluştur
    const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
    );

    oauth2Client.setCredentials({
        access_token: process.env.GOOGLE_ACCESS_TOKEN || undefined,
        refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
    });

    console.log('✅ OAuth client oluşturuldu');

    // 2. Search Console API'yi başlat
    const searchConsole = google.searchconsole({ version: 'v1', auth: oauth2Client });
    const siteUrl = process.env.GSC_SITE_URL || 'sc-domain:uygunbakim.com';

    console.log(`📡 Site: ${siteUrl}\n`);

    // 3. Son 7 günlük veriyi çek
    const endDate = new Date();
    endDate.setDate(endDate.getDate() - 2); // GSC 2 gün gecikmeli
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 7);

    const formatDate = (d: Date) => d.toISOString().split('T')[0];

    console.log(`📅 Tarih aralığı: ${formatDate(startDate)} → ${formatDate(endDate)}\n`);

    try {
        const response = await searchConsole.searchanalytics.query({
            siteUrl,
            requestBody: {
                startDate: formatDate(startDate),
                endDate: formatDate(endDate),
                dimensions: ['page'],
                rowLimit: 20,
                type: 'web',
            },
        });

        const rows = response.data.rows || [];

        if (rows.length === 0) {
            console.log('⚠️  Veri yok. GSC henüz bu tarih aralığı için veri yayınlamamış olabilir.');
            return;
        }

        console.log(`📊 ${rows.length} sayfa bulundu:\n`);
        console.log('─'.repeat(100));
        console.log(
            'Tıklama'.padStart(8),
            'Gösterim'.padStart(10),
            'CTR'.padStart(8),
            'Pozisyon'.padStart(10),
            '  Sayfa'
        );
        console.log('─'.repeat(100));

        let totalClicks = 0;
        let totalImpressions = 0;

        for (const row of rows) {
            const page = (row.keys?.[0] || '').replace('https://uygunbakim.com', '');
            const clicks = row.clicks || 0;
            const impressions = row.impressions || 0;
            const ctr = ((row.ctr || 0) * 100).toFixed(1);
            const position = (row.position || 0).toFixed(1);

            totalClicks += clicks;
            totalImpressions += impressions;

            console.log(
                String(clicks).padStart(8),
                String(impressions).padStart(10),
                `${ctr}%`.padStart(8),
                position.padStart(10),
                ` ${page}`
            );
        }

        console.log('─'.repeat(100));
        console.log(
            String(totalClicks).padStart(8),
            String(totalImpressions).padStart(10),
            '',
            '',
            '  TOPLAM'
        );
        console.log('\n🎉 GSC API bağlantısı başarılı!');

    } catch (error: any) {
        console.error('❌ Hata:', error.message);
        if (error.code === 401) {
            console.error('   → Token geçersiz. OAuth flow\'u tekrar çalıştırın.');
        } else if (error.code === 403) {
            console.error('   → Bu siteye erişim izniniz yok. GSC\'de doğrulanmış mı?');
        }
    }
}

main();
