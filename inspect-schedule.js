import puppeteer from 'puppeteer';

const TARGET_URL = 'https://www.nfl.com/schedules/2025/REG15';

async function scrape() {
    console.log('Launching browser...');
    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    console.log(`Navigating to ${TARGET_URL}...`);
    await page.goto(TARGET_URL, { waitUntil: 'networkidle2', timeout: 60000 });

    // Dump potential game elements
    const data = await page.evaluate(() => {
        const results = [];
        // Look for elements that might contain team names
        // Often schedule pages use class names having "TeamName" or similar
        const allDivs = Array.from(document.querySelectorAll('a[href*="/games/"]'));

        allDivs.forEach(el => {
            results.push({
                text: el.innerText,
                href: el.href,
                ariaLabel: el.ariaLabel,
                innerHTML: el.innerHTML.slice(0, 200) // first 200 chars
            });
        });
        return results;
    });

    console.log('Games found:', JSON.stringify(data, null, 2));

    await browser.close();
}

scrape();
