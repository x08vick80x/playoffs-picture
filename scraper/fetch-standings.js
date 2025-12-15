import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TARGET_URL = 'https://www.cbssports.com/nfl/standings/playoffrace/';
const OUTPUT_FILE = path.join(__dirname, '../src/data/standings.json');

// Ensure output directory exists
const outputDir = path.dirname(OUTPUT_FILE);
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

async function fetchStandings() {
    console.log(`Launching browser...`);
    const browser = await puppeteer.launch({
        headless: "new",
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-blink-features=AutomationControlled'
        ]
    });

    try {
        const page = await browser.newPage();

        // Set User Agent
        await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        console.log(`Navigating to ${TARGET_URL}...`);
        await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });

        // Wait for table
        await page.waitForSelector('#TableBase-AFC', { timeout: 30000 });

        const standings = await page.evaluate(() => {
            const data = {
                lastUpdated: new Date().toISOString(),
                AFC: [],
                NFC: []
            };

            function parseTable(selector) {
                const teams = [];
                const table = document.querySelector(selector);
                if (!table) return teams;

                const rows = table.querySelectorAll('tr.TableBase-bodyTr');

                rows.forEach(row => {
                    const seedCell = row.querySelector('td:nth-child(1)');
                    const seed = seedCell ? seedCell.innerText.trim() : '';
                    if (!seed) return;

                    const nameLink = row.querySelector('.TeamName a');
                    const teamName = nameLink ? nameLink.innerText.trim() : 'Unknown';

                    const numberCell = row.querySelector('td.TableBase-bodyTd--number');
                    const record = numberCell ? numberCell.innerText.trim() : '0-0';

                    teams.push({
                        seed,
                        team: teamName,
                        record,
                        status: ""
                    });
                });
                return teams;
            }

            data.AFC = parseTable('#TableBase-AFC');
            data.NFC = parseTable('#TableBase-NFC');
            return data;
        });

        console.log(`Found ${standings.AFC.length} AFC teams and ${standings.NFC.length} NFC teams.`);
        console.log('Writing data to ' + OUTPUT_FILE);
        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(standings, null, 2));
        console.log('Done!');

    } catch (error) {
        console.error('Error fetching standings:', error);
        process.exit(1);
    } finally {
        await browser.close();
    }
}

fetchStandings();
