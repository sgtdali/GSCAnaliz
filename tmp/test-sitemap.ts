export { };
async function test() {
    try {
        const res = await fetch('https://uygunbakim.com/sitemap.xml');
        console.log('Status:', res.status);
        const text = await res.text();
        console.log('Snippet:', text.substring(0, 500));
    } catch (err: any) {
        console.error('Error:', err.message);
    }
}
test();
