
import puppeteer from 'puppeteer';

const TARGET_URL = 'https://www.nfl.com/standings/playoff-picture';

async function scrape() {
    console.log('Launching browser...');
    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1280, height: 800 });

    console.log(`Navigating to ${TARGET_URL}...`);
    await page.goto(TARGET_URL, { waitUntil: 'networkidle2', timeout: 60000 });

    // Scroll down to trigger lazy loading
    console.log('Scrolling...');
    await page.evaluate(async () => {
        await new Promise((resolve) => {
            let totalHeight = 0;
            const distance = 100;
            const timer = setInterval(() => {
                const scrollHeight = document.body.scrollHeight;
                window.scrollBy(0, distance);
                totalHeight += distance;

                if(totalHeight >= scrollHeight){
                    clearInterval(timer);
                    resolve();
                }
            }, 50); // fast scroll
        });
    });

    // Wait a bit
    await new Promise(r => setTimeout(r, 2000));

    // Scan for relevant headers
    const hits = await page.evaluate(() => {
        const results = [];
        // Look for any element that might be a header
        const all = document.body.querySelectorAll('*');
        all.forEach(el => {
            if (!el.innerText) return;
            const text = el.innerText.trim();
            if (text.length > 50) return;

            const upper = text.toUpperCase();
            if (upper.includes('BUBBLE') || upper.includes('ELIMINATED') || upper.includes('HUNT')) {
                 const rect = el.getBoundingClientRect();
                 results.push({
                    tagName: el.tagName,
                    className: el.className,
                    text: text,
                    top: rect.top + window.scrollY
                 });
            }
        });
        return results;
    });

    console.log('Targeted Headers:');
    console.log(JSON.stringify(hits, null, 2));

    await browser.close();
}

scrape();
