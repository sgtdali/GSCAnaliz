
const SITE_URL = 'https://uygunbakim.com';
const SITEMAP_URL = `${SITE_URL}/sitemap.xml`;

async function countSitemapUrls(url) {
    console.log(`Checking sitemap: ${url}`);
    const response = await fetch(url);
    const xml = await response.text();

    // Simple regex to count <loc> tags since we don't have cheerio easily available in a quick script without npm install
    // but wait, I can use a script that uses cheerio if it's already in node_modules

    const locs = xml.match(/<loc>(.*?)<\/loc>/g) || [];
    let count = 0;
    let sitemapIndexes = [];

    locs.forEach(loc => {
        const locUrl = loc.replace('<loc>', '').replace('</loc>', '');
        if (locUrl.endsWith('.xml')) {
            sitemapIndexes.push(locUrl);
        } else if (locUrl.startsWith(SITE_URL)) {
            count++;
        }
    });

    if (sitemapIndexes.length > 0) {
        for (const subSitemap of sitemapIndexes) {
            count += await countSitemapUrls(subSitemap);
        }
    }

    return count;
}

countSitemapUrls(SITEMAP_URL).then(total => {
    console.log(`Total URLs found in sitemap: ${total}`);
});
