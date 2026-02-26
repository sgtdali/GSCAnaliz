export { };
async function test() {
    try {
        const res = await fetch('https://uygunbakim.com/blog/mad-parfum-muadil-listesi');
        const text = await res.text();
        console.log('Snippet:', text.substring(0, 5000));
    } catch (err: any) {
        console.error('Error:', err.message);
    }
}
test();
