
const SITE_URL = 'https://uygunbakim.com';
const SITEMAP_URL = `${SITE_URL}/sitemap.xml`;

async function countBlogUrls(url) {
    const response = await fetch(url);
    const xml = await response.text();
    const locs = xml.match(/<loc>(.*?)<\/loc>/g) || [];
    let count = 0;
    let sitemapIndexes = [];

    locs.forEach(loc => {
        const locUrl = loc.replace('<loc>', '').replace('</loc>', '');
        if (locUrl.endsWith('.xml')) {
            sitemapIndexes.push(locUrl);
        } else if (locUrl.startsWith(SITE_URL) && locUrl.includes('/blog/')) {
            count++;
        }
    });

    if (sitemapIndexes.length > 0) {
        for (const subSitemap of sitemapIndexes) {
            count += await countBlogUrls(subSitemap);
        }
    }

    return count;
}

countBlogUrls(SITEMAP_URL).then(total => {
    console.log(`Total Blog URLs found in sitemap: ${total}`);
});
