import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import * as cheerio from 'cheerio';

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
    console.log(`Fetching standings from ${TARGET_URL}...`);
    try {
        const { data } = await axios.get(TARGET_URL, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
            }
        });
        const $ = cheerio.load(data);

        const standings = {
            lastUpdated: new Date().toISOString(),
            AFC: [],
            NFC: []
        };

        function parseTable(selector) {
            const teams = [];
            $(selector).find('tr.TableBase-bodyTr').each((i, row) => {
                const $row = $(row);
                const seed = $row.find('td:nth-child(1)').text().trim();
                if (!seed) return; // Skip empty rows

                const teamName = $row.find('.TeamName a').first().text().trim();
                const record = $row.find('td.TableBase-bodyTd--number').first().text().trim(); // First number col is record

                // Status (Clinched, etc) often appears as text in the name cell or nearby.
                // Checks for *, z, x, y usually in the text similar to "Denver *"
                // In the HTML inspected, it wasn't obvious, so leaving status blank for now
                // or we can look for specific indicators later.
                const status = "";

                teams.push({
                    seed,
                    team: teamName,
                    record,
                    status
                });
            });
            return teams;
        }

        standings.AFC = parseTable('#TableBase-AFC');
        standings.NFC = parseTable('#TableBase-NFC');

        console.log(`Found ${standings.AFC.length} AFC teams and ${standings.NFC.length} NFC teams.`);
        console.log('Writing data to ' + OUTPUT_FILE);
        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(standings, null, 2));
        console.log('Done!');

    } catch (error) {
        console.error('Error fetching standings:', error.message);
        if (error.response) console.error('Status:', error.response.status);
    }
}

fetchStandings();
