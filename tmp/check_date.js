
const cheerio = require('cheerio');

async function checkStructure() {
    try {
        const url = 'https://uygunbakim.com/blog/bargello-111-neyin-muadili/';
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        const data = await response.text();
        const $ = cheerio.load(data);

        const h3 = $('h3').filter((i, el) => $(el).text().includes('İlginizi Çekebilir'));
        if (h3.length > 0) {
            // Usually related posts are in a section or a specific div
            let container = h3.closest('section');
            if (!container.length) container = h3.closest('.py-20'); // The py-20 class we saw earlier

            console.log('Container classes:', container.attr('class'));
            console.log('Container tag:', container.prop('tagName'));

            // Let's also check for other common related post containers
            console.log('Found .related-posts?', $('.related-posts').length);
            console.log('Found .similar-posts?', $('.similar-posts').length);
        }
    } catch (e) {
        console.error(e);
    }
}

checkStructure();
