const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

// Helper to strip BOM
const stripBom = (str) => str.replace(/^\uFEFF/, '');

// 1. Read zero-impression product URLs from raw JSON
const rawJson = JSON.parse(stripBom(fs.readFileSync(path.join(ROOT, 'gsc_zero_impression_raw.json'), 'utf8')));
const zeroImpressionUrls = rawJson.data.zeroImpressions.products;
const zeroSlugs = zeroImpressionUrls.map(url => url.replace('https://uygunbakim.com/product/', ''));
console.log(`Zero impression slugs: ${zeroSlugs.length}`);

// 2. Read product data from Supabase output file
const supabaseOutputPath = 'C:/Users/tvural.REPKON/.gemini/antigravity/brain/2af82553-aa69-46aa-a111-15641cd05243/.system_generated/steps/193/output.txt';
const supabaseRaw = stripBom(fs.readFileSync(supabaseOutputPath, 'utf8'));

// The output is a JSON string containing escaped JSON data
// First, try to find the JSON array directly
let allProducts;
try {
    // Try direct parse if it's a plain JSON array
    const startIdx = supabaseRaw.indexOf('[{');
    const endIdx = supabaseRaw.lastIndexOf('}]') + 2;
    const productsJson = supabaseRaw.substring(startIdx, endIdx);
    allProducts = JSON.parse(productsJson);
} catch (e) {
    // The output is a double-escaped JSON string wrapper
    // Parse the outer string first, then extract the inner JSON
    const outerStr = JSON.parse(supabaseRaw);
    const innerStart = outerStr.indexOf('[{');
    const innerEnd = outerStr.lastIndexOf('}]') + 2;
    const innerJson = outerStr.substring(innerStart, innerEnd);
    allProducts = JSON.parse(innerJson);
}
console.log(`Total products from DB: ${allProducts.length}`);

// 3. Create a lookup map: slug -> product info
const productMap = {};
for (const p of allProducts) {
    productMap[p.slug] = p;
}

// 4. Match zero impression slugs with product data
const matched = [];
const notFound = [];

for (const slug of zeroSlugs) {
    const product = productMap[slug];
    if (product) {
        matched.push({
            slug,
            year: product.year,
            brand: product.brand_name,
            name: product.product_name,
            gender: product.gender,
        });
    } else {
        notFound.push(slug);
    }
}

console.log(`Matched: ${matched.length}`);
console.log(`Not found in DB: ${notFound.length}`);

// 5. Statistics
const withYear = matched.filter(m => m.year !== null);
const withoutYear = matched.filter(m => m.year === null);
console.log(`With year: ${withYear.length}`);
console.log(`Without year: ${withoutYear.length}`);

// Year distribution
const yearDist = {};
for (const m of withYear) {
    yearDist[m.year] = (yearDist[m.year] || 0) + 1;
}
const sortedYears = Object.entries(yearDist).sort((a, b) => Number(b[0]) - Number(a[0]));

// 6. Generate MD report
const lines = [];
lines.push('# Sıfır Gösterimli Ürünler — Çıkış Yılı Raporu');
lines.push('');
lines.push(`> **Rapor Tarihi:** ${new Date().toISOString().split('T')[0]}`);
lines.push(`> **Toplam Sıfır Gösterimli Ürün:** ${zeroSlugs.length}`);
lines.push(`> **DB'de Eşleşen:** ${matched.length}`);
lines.push(`> **Yılı Belli Olan:** ${withYear.length}`);
lines.push(`> **Yılı Bilinmeyen:** ${withoutYear.length}`);
lines.push('');

// Year distribution table
lines.push('---');
lines.push('');
lines.push('## 1. Yıl Dağılımı Özeti');
lines.push('');
lines.push('| Yıl | Sıfır Gösterim Ürün Sayısı |');
lines.push('|-----|---------------------------|');
for (const [year, count] of sortedYears) {
    lines.push(`| ${year} | ${count} |`);
}
lines.push(`| **Yılı bilinmeyen** | **${withoutYear.length}** |`);
lines.push(`| **TOPLAM** | **${zeroSlugs.length}** |`);
lines.push('');

// Decade summary
lines.push('---');
lines.push('');
lines.push('## 2. Dönem Bazlı Özet');
lines.push('');
const decades = {};
for (const m of withYear) {
    const decade = Math.floor(m.year / 10) * 10;
    decades[decade] = (decades[decade] || 0) + 1;
}
const sortedDecades = Object.entries(decades).sort((a, b) => Number(b[0]) - Number(a[0]));
lines.push('| Dönem | Ürün Sayısı |');
lines.push('|-------|------------|');
for (const [decade, count] of sortedDecades) {
    lines.push(`| ${decade}s | ${count} |`);
}
lines.push('');

// Full list sorted by year
lines.push('---');
lines.push('');
lines.push('## 3. Yılı Belli Olan Ürünler (Yıla Göre Sıralı)');
lines.push('');
lines.push('| # | Yıl | Marka | Ürün | Cinsiyet | URL |');
lines.push('|---|-----|-------|------|----------|-----|');

const sortedByYear = withYear.sort((a, b) => {
    if (b.year !== a.year) return b.year - a.year;
    if (a.brand !== b.brand) return a.brand.localeCompare(b.brand);
    return a.name.localeCompare(b.name);
});

let i = 1;
for (const m of sortedByYear) {
    lines.push(`| ${i} | ${m.year} | ${m.brand} | ${m.name} | ${m.gender || '-'} | \`/product/${m.slug}\` |`);
    i++;
}

// Without year
lines.push('');
lines.push('---');
lines.push('');
lines.push(`## 4. Yılı Bilinmeyen Ürünler (${withoutYear.length} adet)`);
lines.push('');
lines.push('| # | Marka | Ürün | Cinsiyet | URL |');
lines.push('|---|-------|------|----------|-----|');
i = 1;
for (const m of withoutYear.sort((a, b) => a.brand.localeCompare(b.brand) || a.name.localeCompare(b.name))) {
    lines.push(`| ${i} | ${m.brand} | ${m.name} | ${m.gender || '-'} | \`/product/${m.slug}\` |`);
    i++;
}

// Not found in DB
if (notFound.length > 0) {
    lines.push('');
    lines.push('---');
    lines.push('');
    lines.push(`## 5. Veritabanında Bulunamayan Slug'lar (${notFound.length} adet)`);
    lines.push('');
    lines.push('| # | Slug |');
    lines.push('|---|------|');
    i = 1;
    for (const slug of notFound) {
        lines.push(`| ${i} | \`${slug}\` |`);
        i++;
    }
}

const outputPath = path.join(ROOT, 'gsc_zero_impression_year_report.md');
fs.writeFileSync(outputPath, lines.join('\n'), 'utf8');
console.log(`\nRapor kaydedildi: ${outputPath}`);
console.log(`Toplam satır: ${lines.length}`);
