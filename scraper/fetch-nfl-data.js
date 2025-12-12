
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TARGET_URL = 'https://www.nfl.com/standings/playoff-picture';

const TEAMS_CONF = {
    // AFC
    'Bills': 'AFC', 'Dolphins': 'AFC', 'Patriots': 'AFC', 'Jets': 'AFC',
    'Ravens': 'AFC', 'Bengals': 'AFC', 'Browns': 'AFC', 'Steelers': 'AFC',
    'Texans': 'AFC', 'Colts': 'AFC', 'Jaguars': 'AFC', 'Titans': 'AFC',
    'Broncos': 'AFC', 'Chiefs': 'AFC', 'Raiders': 'AFC', 'Chargers': 'AFC',
    // NFC
    'Cowboys': 'NFC', 'Giants': 'NFC', 'Eagles': 'NFC', 'Commanders': 'NFC',
    'Packers': 'NFC', 'Lions': 'NFC', 'Vikings': 'NFC', 'Bears': 'NFC',
    'Falcons': 'NFC', 'Panthers': 'NFC', 'Saints': 'NFC', 'Buccaneers': 'NFC',
    'Cardinals': 'NFC', 'Rams': 'NFC', '49ers': 'NFC', 'Seahawks': 'NFC'
};

// City to Nickname Mapping
const CITY_TO_NICKNAME = {
    "Denver": "Broncos",
    "New England": "Patriots",
    "Jacksonville": "Jaguars",
    "Pittsburgh": "Steelers",
    "L.A. Chargers": "Chargers",
    "Buffalo": "Bills",
    "Houston": "Texans",
    "Indianapolis": "Colts",
    "Baltimore": "Ravens",
    "Kansas City": "Chiefs",
    "Miami": "Dolphins",
    "Cincinnati": "Bengals",
    "N.Y. Jets": "Jets",
    "Cleveland": "Browns",
    "Las Vegas": "Raiders",
    "Tennessee": "Titans",
    "L.A. Rams": "Rams",
    "Green Bay": "Packers",
    "Philadelphia": "Eagles",
    "Tampa Bay": "Buccaneers",
    "Seattle": "Seahawks",
    "San Francisco": "49ers",
    "Chicago": "Bears",
    "Detroit": "Lions",
    "Carolina": "Panthers",
    "Dallas": "Cowboys",
    "Minnesota": "Vikings",
    "Atlanta": "Falcons",
    "Arizona": "Cardinals",
    "New Orleans": "Saints",
    "Washington": "Commanders",
    "N.Y. Giants": "Giants"
};

async function scrape() {
    console.log('Launching browser...');
    const browser = await puppeteer.launch({
        headless: "new",
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-blink-features=AutomationControlled'
        ]
    });
    const page = await browser.newPage();

    // Set User Agent to avoid detection
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    // Enable console logging from browser
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));

    console.log(`Navigating to ${TARGET_URL}...`);
    await page.setViewport({ width: 1280, height: 800 });

    // Read standings
    const standingsPath = path.join(__dirname, '../src/data/standings.json');
    const standingsRaw = fs.readFileSync(standingsPath, 'utf8');
    const standings = JSON.parse(standingsRaw);

    try {
        await page.goto(TARGET_URL, { waitUntil: 'networkidle2', timeout: 60000 });

        console.log('Page loaded. Checking for content...');

        // Debug: Log title
        const title = await page.title();
        console.log('Page Title:', title);

        // Wait a bit just in case
        await new Promise(r => setTimeout(r, 5000));

        // Check if "On The Bubble" exists
        // Scroll down to trigger lazy loading
        console.log('Scrolling down...');
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
                }, 100);
            });
        });

        // Wait a bit after scroll
        await new Promise(r => setTimeout(r, 2000));

        const hasBubble = await page.evaluate(() => {
            return document.body.innerText.includes('On The Bubble') ||
                   document.body.innerText.includes('In the Hunt');
        });

        if (!hasBubble) {
            console.log('WARNING: "On The Bubble" not found in text. Dumping partial text:');
            const text = await page.evaluate(() => document.body.innerText.substring(0, 500));
            console.log(text);
            // Don't error out immediately, maybe the text parsing will find something else or we can inspect layout
        } else {
            console.log('Found "On The Bubble" text!');
        }

        await page.waitForSelector('div'); // Wait for some content

        // Revised evaluate: Just return flat list of teams and headers
        const rawData = await page.evaluate((teamsConf) => {
            const result = {
                teams: [],
                eliminatedTop: 100000 // default large
            };

            const allDivs = Array.from(document.body.querySelectorAll('*'));
            const getTop = (el) => {
                if (!el) return 0;
                const rect = el.getBoundingClientRect();
                return (rect && rect.top !== undefined) ? rect.top + window.scrollY : 0;
            };

            // Find Eliminated Header
            const headers = allDivs.filter(el => {
                if (!el.innerText) return false;
                if (!['H2', 'H3', 'DIV'].includes(el.tagName)) return false;
                const txt = el.innerText.trim().toUpperCase();
                return txt === 'ELIMINATED';
            });
            headers.forEach(h => {
                const top = getTop(h);
                if (top > 100 && top < result.eliminatedTop) {
                    result.eliminatedTop = top; // Take the highest specific header
                }
            });

            // Find All Teams
            const mapKeys = Object.keys(teamsConf);

            allDivs.forEach(el => {
                if (el.children.length > 0) return;
                if (!el.innerText) return;
                const text = el.innerText.trim();
                const upper = text.toUpperCase();

                const match = mapKeys.find(k => upper.includes(k.toUpperCase()));
                if (match) {
                    const elTop = getTop(el);
                    if (elTop < 300) return; // Ignore banner/nav matches

                    let container = el;
                    let foundProb = false;
                    for (let i=0; i<4; i++) {
                       if (!container.parentElement) break;
                       container = container.parentElement;
                       if (container.innerText && container.innerText.includes('PLAYOFF PROBABILITY')) {
                           foundProb = true;
                           break;
                       }
                    }
                    if (!foundProb) {
                        container = el.parentElement ? (el.parentElement.parentElement || el.parentElement) : el;
                    }

                    const fullText = container.innerText || "";

                    let probability = "";
                    const percentMatch = fullText.match(/(\d+%|>\d+%|<\d+%)/);
                    if (percentMatch) {
                        probability = percentMatch[0];
                    } else if (fullText.toLowerCase().includes('clinched') || fullText.toLowerCase().includes('division')) {
                        probability = "100%";
                    }

                    const recordMatch = fullText.match(/(\d+-\d+(?:-\d+)?)/);
                    const record = recordMatch ? recordMatch[0] : "";

                    if (!record && !probability) return;

                    let trend = "0";
                    let trendDirection = "same";
                    const arrow = container.querySelector('[class*="Changearrow"], [data-testid*="arrow"]');
                     if (arrow) {
                        if (arrow.className.includes('Up') || arrow.innerHTML.includes('Up')) trendDirection = 'up';
                        if (arrow.className.includes('Down') || arrow.innerHTML.includes('Down')) trendDirection = 'down';
                        const arrowParent = arrow.parentElement;
                        const numberEl = arrowParent ? arrowParent.innerText.match(/\d+/) : null;
                        if (numberEl) trend = numberEl[0];
                    } else if (fullText.includes('--')) {
                        trendDirection = 'same';
                    }

                    result.teams.push({
                        name: match, // Nickname
                        conf: teamsConf[match],
                        top: getTop(el),
                        record,
                        probability,
                        trend,
                        trendDirection
                    });
                }
            });
            return result;
        }, TEAMS_CONF);

        const finalResult = {
            bubble: { AFC: [], NFC: [] },
            eliminated: { AFC: [], NFC: [] },
            seeds: { AFC: [], NFC: [] }
        };

        const scrapedTeams = rawData.teams;
        const processedTeams = new Set();

        // 1. Process Seeds from Standings (Users Rule: Top 7)
        ['AFC', 'NFC'].forEach(conf => {
            const top7 = standings[conf].slice(0, 7);
            top7.forEach(sTeam => {
                const nickname = CITY_TO_NICKNAME[sTeam.team] || sTeam.team;
                // Find in scraped
                const match = scrapedTeams.find(t => t.name === nickname || t.name === sTeam.team);

                finalResult.seeds[conf].push({
                    name: nickname,
                    record: match ? match.record : sTeam.record.substring(0, sTeam.record.lastIndexOf('-')), // remove ties from 0-0-0 if needed, usually scraped is 0-0
                    probability: match ? match.probability : "100%", // Default if seeded
                    trend: match ? match.trend : "0",
                    trendDirection: match ? match.trendDirection : "same"
                });
                if (match) processedTeams.add(match.name);
            });
        });

        // 2. Process Remaining Teams
        scrapedTeams.forEach(team => {
            if (processedTeams.has(team.name)) return;
            processedTeams.add(team.name); // prevent dupes

            const section = team.top > rawData.eliminatedTop ? 'eliminated' : 'bubble';
            finalResult[section][team.conf].push(team);
        });

        // Dedup logic if needed - usually set handles it but finding multiple entries on page might cause dupes in scrapedTeams
        // We iterate scrapedTeams once, so if "Colts" appears twice, we might add it twice.
        // Let's unique by name in final result
        const unique = (arr) => {
             const seen = new Set();
             return arr.filter(t => {
                 if (seen.has(t.name)) return false;
                 seen.add(t.name);
                 return true;
             });
        };

        // 2b. Sorting Helper
        const parseProbability = (probStr) => {
            if (!probStr) return -1;
            if (probStr.includes('<1')) return 0.5; // Treat <1% as 0.5%
            if (probStr.includes('>99')) return 99.5;
            const num = parseInt(probStr.replace(/\D/g, ''), 10);
            return isNaN(num) ? -1 : num;
        };

        const parseRecord = (recStr) => {
             // 9-4-0 -> win percentage
             if (!recStr) return 0;
             const parts = recStr.split('-').map(n => parseInt(n, 10));
             const w = parts[0] || 0;
             const l = parts[1] || 1; // avoid div by zero if 0-0
             const t = parts[2] || 0;
             const total = w + l + t;
             if (total === 0) return 0;
             return (w + 0.5 * t) / total;
        };

        const sortTeams = (teams) => {
            return teams.sort((a, b) => {
                // 1. Sort by Probability Descending
                const pA = parseProbability(a.probability);
                const pB = parseProbability(b.probability);

                if (pA !== pB) return pB - pA;

                // 2. Sort by Record (Win %) Descending
                const rA = parseRecord(a.record);
                const rB = parseRecord(b.record);

                return rB - rA;
            });
        };

        ['AFC', 'NFC'].forEach(conf => {
            finalResult.bubble[conf] = unique(finalResult.bubble[conf]);
            finalResult.eliminated[conf] = unique(finalResult.eliminated[conf]);
            finalResult.seeds[conf] = unique(finalResult.seeds[conf]);

            // Apply sorting
            finalResult.bubble[conf] = sortTeams(finalResult.bubble[conf]);
            // finalResult.eliminated[conf] = sortTeams(finalResult.eliminated[conf]); // Eliminated usually sorted by draft order (reverse record), but let's keep win% for now or just trust scraping order?
            // Eliminated teams are better sorted by "best record" at top, closest to not being eliminated.
            finalResult.eliminated[conf] = sortTeams(finalResult.eliminated[conf]);
        });

        // 3. Scrape Schedule for Weeks 15-18
        const WEEKS = ['REG15', 'REG16', 'REG17', 'REG18'];
        const allMatches = [];

        for (const week of WEEKS) { // week is REG15, REG16...
            // Convert REG15 -> reg-15 for URL
            const weekSlug = week.toLowerCase().replace('reg', 'reg-');
            const SCHEDULE_URL = `https://www.nfl.com/schedules/2025/by-week/${weekSlug}`;
            console.log(`Navigating to ${SCHEDULE_URL}...`);
            await page.goto(SCHEDULE_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });

            // Debug: Check where we actually landed
            const currentUrl = page.url();
            console.log(`Landed on: ${currentUrl}`);

            // Simple wait for hydration
            await new Promise(r => setTimeout(r, 1500));

            const weekMatches = await page.evaluate((currentWeek) => {
                const matches = [];
                const links = Array.from(document.querySelectorAll('a[href*="/games/"]'));
                links.forEach(a => {
                    const href = a.getAttribute('href');
                    // href format: /games/away-at-home-2025-reg-15
                    const match = href.match(/\/games\/([a-z0-9-]+)-at-([a-z0-9-]+)-\d{4}/);
                    if (match) {
                        matches.push({ away: match[1], home: match[2], week: currentWeek });
                    }
                });
                return matches;
            }, week);
            console.log(`Found ${weekMatches.length} matchups in ${week}.`);
            allMatches.push(...weekMatches);
        }

        const normalizeSlug = (slug) => {
            // "new-england-patriots" -> "Patriots"
            const parts = slug.split('-');
            let name = parts[parts.length-1];
            // Capitalize first letter
            return name.charAt(0).toUpperCase() + name.slice(1);
        };

        const teamSchedules = {};

        allMatches.forEach(m => {
            let away = normalizeSlug(m.away);
            let home = normalizeSlug(m.home);

            // Initialize arrays
            if (!teamSchedules[away]) teamSchedules[away] = [];
            if (!teamSchedules[home]) teamSchedules[home] = [];

            teamSchedules[away].push({
                opponent: home,
                location: '@',
                week: m.week
            });
            teamSchedules[home].push({
                opponent: away,
                location: 'vs',
                week: m.week
            });
        });

        // Helper to find opponent record from standings
        const getOpponentRecord = (oppName) => {
             // Try to find in standings (city key or direct nickname)
             // standings is { AFC: [...], NFC: [...] }
             for (const conf of ['AFC', 'NFC']) {
                 const found = standings[conf].find(t => {
                     const nick = CITY_TO_NICKNAME[t.team] || t.team;
                     return nick === oppName || t.team === oppName;
                 });
                 if (found) return found.record;
             }
             return "??";
        };

        const enrichWithSchedule = (team) => {
            const sched = teamSchedules[team.name] || [];

            // Enrich with records
            team.remainingSchedule = sched.map(s => ({
                ...s,
                opponentRecord: getOpponentRecord(s.opponent)
            }));

            // Keep next opponent text for easy display (usually first item if sorted, or specifically Week 15)
            // But user wants next opponent display + modal.
            // We can just take the first one as nextOpponent.
            if (team.remainingSchedule.length > 0) {
                 // Sort by week? REG15 < REG16
                 team.remainingSchedule.sort((a,b) => a.week.localeCompare(b.week));
                 team.nextOpponent = {
                     opponent: team.remainingSchedule[0].opponent,
                     location: team.remainingSchedule[0].location
                 };
            } else {
                team.nextOpponent = null;
            }
        };

        ['AFC', 'NFC'].forEach(conf => {
            finalResult.seeds[conf].forEach(enrichWithSchedule);
            finalResult.bubble[conf].forEach(enrichWithSchedule);
            finalResult.eliminated[conf].forEach(enrichWithSchedule);
        });

        // 4. Scrape Power Rankings
        const PR_URL = 'https://www.nfl.com/news/nfl-power-rankings-week-15-2025-nfl-season';
        console.log(`Navigating to Power Rankings: ${PR_URL}...`);
        await page.goto(PR_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await new Promise(r => setTimeout(r, 2000)); // Wait for content

        const rankings = await page.evaluate(() => {
            const results = [];
            // Find all divs that might be ranking containers
            const divs = Array.from(document.querySelectorAll('div'));

            divs.forEach(div => {
                const text = div.innerText.trim();
                // Check if text starts with "Rank" followed by a number
                if (!text.match(/^Rank\n\d+/)) return;

                // Avoid huge containers (like the article body itself which contains everything)
                // We want the specific card/item div.
                // But blurb can be long. Let's look for specific line structure.

                const lines = text.split('\n').map(l => l.trim()).filter(l => l);

                // Find the "Rank" line
                let rankIndex = -1;
                // Look in first 5 lines
                for (let i = 0; i < Math.min(lines.length - 1, 5); i++) {
                    if (lines[i] === 'Rank' && lines[i+1].match(/^\d+$/)) {
                        rankIndex = i;
                        break;
                    }
                }

                if (rankIndex === -1) return;

                // Debug specific rank to see why it fails
                if (lines[rankIndex+1] === '6') {
                     // console.log('DEBUG RANK 6 CANDIDATE:', JSON.stringify(lines));
                }

                const rank = parseInt(lines[rankIndex+1], 10);
                if (isNaN(rank)) return;

                // Check safety - we need at least Rank, Number, Team (3 lines)
                if (lines.length < rankIndex + 3) return;

                // Heuristic for Trend
                // Relative to rankIndex:
                // rankIndex: "Rank"
                // rankIndex + 1: "6"
                // rankIndex + 2: <Trend> OR <Team>

                let trend = "0";
                let teamNameIndex = rankIndex + 2;

                // If line at teamNameIndex is numeric, it is trend
                if (lines[teamNameIndex] && lines[teamNameIndex].match(/^[-+]?\d+$/)) {
                    trend = lines[teamNameIndex];
                    teamNameIndex++;
                }

                if (lines.length <= teamNameIndex) return;

                const teamName = lines[teamNameIndex];

                // Next line match record
                const recordLineIndex = teamNameIndex + 1;
                let blurbStartIndex = recordLineIndex;

                if (lines[recordLineIndex] && lines[recordLineIndex].match(/^(\d+-\d+(-\d+)?)$/)) {
                    blurbStartIndex = recordLineIndex + 1;
                }

                // Content is everything after record
                const blurb = lines.slice(blurbStartIndex).join('\n\n');

                // Log if empty blurb to understand what went wrong
                if (!blurb) {
                     // console.warn(`WARNING: Empty blurb for Rank ${rank} (${teamName}).`);
                }

                // Also, limit huge text to avoid parent containers
                if (text.length > 5000) return;

                results.push({ rank, team: teamName, trend, blurb });
            });

            return results;
        });

        // Remove debug logic to keep it clean

        // Deduplicate and Sort
        const uniqueRankings = [];
        const seenRanks = new Set();

        // Sort by blurb length descending to prefer entries with more content?
        // Actually, if we have duplicate calls, we want the one with content.
        rankings.sort((a,b) => (b.blurb || "").length - (a.blurb || "").length);

        rankings.forEach(r => {
            if (!seenRanks.has(r.rank)) {
                uniqueRankings.push(r);
                seenRanks.add(r.rank);
            }
        });

        uniqueRankings.sort((a,b) => a.rank - b.rank);

        console.log(`Found ${uniqueRankings.length} unique power rankings.`);

        finalResult.powerRankings = uniqueRankings;

        // Clean up team names
        finalResult.powerRankings.forEach(r => {
             // "Kansas City Chiefs" -> "Chiefs"
             // "Washington Commanders" -> "Commanders"
             // "San Francisco 49ers" -> "49ers"
             if (!r.team) return; // safety
             const parts = r.team.split(' ');
             const last = parts[parts.length - 1];
             r.team = last;
        });

        // Write to file
        const outputPath = path.resolve(__dirname, '../src/data/playoff-picture.json');

        if (finalResult.powerRankings.length > 0) {
            console.log('DEBUG FINAL OBJECT [0]:', JSON.stringify(finalResult.powerRankings[0], null, 2));
        }

        fs.writeFileSync(outputPath, JSON.stringify(finalResult, null, 2));
        console.log(`Successfully wrote to ${outputPath}`);

    } catch (e) {
        console.error('Error scraping:', e);
    } finally {
        await browser.close();
    }
}

scrape();
