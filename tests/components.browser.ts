// Requires: npm run build && npm run preview -- --port 4322
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer';
import { renderLogo } from '../src/components/atoms/Logo/Logo.ts';

const browser = await puppeteer.launch({ headless: true });
const errors: string[] = [];
try {
    const page = await browser.newPage();
    page.on('pageerror', error => errors.push(error instanceof Error ? error.message : String(error)));
    await page.setBypassServiceWorker(true);
    await page.goto(process.env.COMPONENTS_TEST_URL || 'http://127.0.0.1:4322', { waitUntil: 'networkidle0' });

    const expectedOrder = ['matchups', 'bubble', 'eliminated', 'schedule', 'power-rankings', 'standings'];
    assert.deepEqual(await page.$$eval('main section[id]', sections => sections.map(section => section.id)), ['my-teams-root', ...expectedOrder]);
    assert.deepEqual(await page.$$eval('.main-nav a[href^="#"]', links => links.map(link => link.getAttribute('href')?.slice(1))), expectedOrder);

    // One application bundle plus the separate Workbox registration library.
    const scripts = await page.evaluate(() => performance.getEntriesByType('resource')
        .map(entry => new URL(entry.name).pathname)
        .filter(path => path.startsWith('/_astro/') && path.endsWith('.js')));
    assert.equal(new Set(scripts).size, 2, 'startup must load only the app bundle and Workbox');
    assert.ok(scripts.some(path => path.includes('workbox-window')));
    assert.ok(!scripts.some(path => path.includes('my-teams.')), 'dashboard code stays lazy');

    // Initializers moved to the common entry must still run once and handle page controls.
    const initialTheme = await page.$eval('html', el => el.dataset.theme);
    await page.click('.theme-toggle');
    const changedTheme = initialTheme === 'dark' ? 'light' : 'dark';
    assert.equal(await page.$eval('html', el => el.dataset.theme), changedTheme);
    assert.equal(await page.evaluate(() => localStorage.getItem('nfl-theme')), changedTheme);
    assert.ok(await page.$eval('.last-updated__ago', el => Boolean(el.textContent)));
    await page.evaluate(() => {
        const event = new Event('beforeinstallprompt', { cancelable: true });
        Object.assign(event, { prompt: async () => {}, userChoice: Promise.resolve({ outcome: 'dismissed', platform: 'web' }) });
        window.dispatchEvent(event);
    });
    assert.equal(await page.$eval('#install-container', el => (el as HTMLElement).hidden), false);
    await page.click('#install-pwa');
    assert.equal(await page.evaluate(() => window.deferredPrompt), null);
    await page.evaluate(() => dispatchEvent(new Event('appinstalled')));
    assert.equal(await page.$eval('#install-container', el => (el as HTMLElement).hidden), true);
    await page.evaluate(() => window.scrollTo({ top: 900, behavior: 'instant' }));
    await page.waitForSelector('.back-to-top--visible');
    await page.click('.back-to-top');
    await page.waitForFunction(() => window.scrollY === 0);

    // One inline stylesheet delivery, with only the font actually supplied by the app.
    const delivery = await page.evaluate(() => ({
        externalCSS: performance.getEntriesByType('resource').filter(entry => new URL(entry.name).pathname.endsWith('.css')).length,
        fontRequests: performance.getEntriesByType('resource').filter(entry => /\.woff2?$/.test(new URL(entry.name).pathname)).length,
        fontFaces: [...document.fonts].map(face => ({ family: face.family.replaceAll('"', ''), status: face.status })),
        bodyFont: getComputedStyle(document.body).fontFamily,
    }));
    assert.equal(delivery.externalCSS, 0, 'the full stylesheet must not be downloaded a second time');
    assert.equal(delivery.fontRequests, 1, 'the supplied font must be downloaded only once');
    assert.deepEqual(delivery.fontFaces, [{ family: 'Space Grotesk', status: 'loaded' }]);
    assert.equal(delivery.bodyFont, 'Arial, sans-serif');

    // Check the public size contract against the real production stylesheet.
    const sizes = { md: 40, lg: 55 };
    await page.evaluate(html => {
        const fixture = document.createElement('div');
        fixture.id = 'logo-contract';
        fixture.innerHTML = html;
        document.body.append(fixture);
    }, (['md', 'lg'] as const).map(size => renderLogo('Buffalo', { size })).join(''));
    for (const width of [390, 1440]) {
        await page.setViewport({ width, height: 900 });
        for (const theme of ['dark', 'light']) {
            await page.evaluate(theme => document.documentElement.dataset.theme = theme, theme);
            for (const [size, pixels] of Object.entries(sizes)) {
                const dimensions = await page.$eval(`#logo-contract .team-logo--${size}`, el => ({
                    width: el.getBoundingClientRect().width, height: el.getBoundingClientRect().height,
                    intrinsicWidth: Number(el.getAttribute('width')), intrinsicHeight: Number(el.getAttribute('height')),
                }));
                assert.deepEqual(dimensions, { width: pixels, height: pixels, intrinsicWidth: pixels, intrinsicHeight: pixels });
            }
            // SSR logos use the same dimensions; contextual overrides keep their existing layout.
            for (const [selector, pixels] of [['#standings-divisions .standings-table .team-logo', 40], ['.ranking-item .team-logo', 40], ['.matchup-card--bye .team-logo', 55]] as const) {
                assert.deepEqual(await page.$eval(selector, el => [Number(el.getAttribute('width')), el.getBoundingClientRect().width]), [pixels, pixels]);
            }

            await page.click('.ranking-item__header');
            await page.waitForSelector('.ranking-item--expanded');
            assert.equal(await page.$eval('.ranking-item__preview', el => getComputedStyle(el).display), 'none');
            await page.click('.ranking-item__header');
            await page.waitForSelector('.ranking-item--expanded', { hidden: true });
        }
    }

    // Exercise the extracted game renderer through its real consumer, including date fallback.
    await page.evaluate(() => dispatchEvent(new CustomEvent('open-schedule-modal', { detail: {
        teamName: 'Buffalo',
        schedule: [
            { opponent: 'Minnesota', location: 'vs', week: 'REG9', date: 'Sunday, November 8', time: '<img src=x onerror=alert(1)>', opponentRecord: '7-1' },
            { opponent: 'Tampa Bay', location: '@', week: 'REG10' },
        ],
    } })));
    await page.waitForSelector('#schedule-modal[open]');
    assert.equal(await page.$$eval('.game-item--next', els => els.length), 1);
    assert.deepEqual(await page.$$eval('.game-item__date', els => els.map(el => el.textContent)), ['Nov 8', '10']);
    assert.deepEqual(await page.$$eval('.game-item__opp-record', els => els.map(el => el.textContent)), ['7-1', '??']);
    assert.deepEqual(await page.$$eval('.game-item__meta', els => els.map(el => el.textContent)), ['Home • <img src=x onerror=alert(1)>', 'Away']);
    assert.equal(await page.$('#schedule-list img'), null, 'scraped text must not become markup');
    assert.equal(await page.$eval('.game-item:last-child use', el => el.getAttribute('href')), '/sprites.svg#buccaneers');
    assert.deepEqual(errors, []);
    console.log('Passed: one app bundle plus Workbox, theme/install/back-to-top controls, CSS delivered once, one supplied font, both Logo sizes agree with CSS, SSR card dimensions, rankings expand/collapse in both themes/viewports, game dates, next opponent, records and escaped text.');
} finally { await browser.close(); }
