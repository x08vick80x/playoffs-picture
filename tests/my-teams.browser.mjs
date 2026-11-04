// Requires: npm run build && npm run preview -- --port 4322
import assert from 'node:assert/strict';
import { readFileSync, mkdirSync } from 'node:fs';
import puppeteer from 'puppeteer';

const baseURL = process.env.MY_TEAMS_TEST_URL || 'http://127.0.0.1:4322';
const artifacts = process.env.MY_TEAMS_ARTIFACTS || '/tmp/playoffs-picture-my-teams';
mkdirSync(artifacts, { recursive: true });
const html = readFileSync(new URL('../dist/index.html', import.meta.url), 'utf8');
assert.ok(!html.includes('id="my-teams-data"'), 'dashboard JSON must not be embedded in the homepage');
const browser = await puppeteer.launch({ headless: true });
const errors = [];
const results = [];
const frame = page => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
const geometry = page => page.evaluate(() => ({
    height: document.getElementById('my-teams-root').getBoundingClientRect().height,
    scheduleTop: document.getElementById('schedule').getBoundingClientRect().top + scrollY,
}));
const ready = page => page.waitForFunction(() => document.querySelector('#my-teams-root')?.getAttribute('aria-busy') === 'false' && !document.getElementById('mt-dashboard').hidden);
async function setup(mode = 'standalone', favorites = '["Buffalo","Minnesota"]', width = 390) {
    const context = await browser.createBrowserContext();
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    await page.setViewport({ width, height: 900 });
    await page.evaluateOnNewDocument((mode, favorites) => {
        if (mode === 'standalone') {
            const original = window.matchMedia.bind(window);
            window.matchMedia = query => {
                const media = original(query);
                if (query === '(display-mode: standalone)') Object.defineProperty(media, 'matches', { value: true });
                return media;
            };
        } else if (mode === 'ios') Object.defineProperty(navigator, 'standalone', { value: true });
        if (!sessionStorage.getItem('my-teams-test-seeded')) {
            localStorage.setItem('nfl-favorites', favorites);
            sessionStorage.setItem('my-teams-test-seeded', 'true');
        }
        window.__shifts = [];
        new PerformanceObserver(list => {
            for (const entry of list.getEntries()) if (!entry.hadRecentInput) window.__shifts.push({ value: entry.value, time: entry.startTime });
        }).observe({ type: 'layout-shift', buffered: true });
    }, mode, favorites);
    return { context, page };
}
try {
    const normal = await setup('browser');
    const requests = [];
    normal.page.on('request', r => requests.push(r.url()));
    await normal.page.goto(baseURL, { waitUntil: 'networkidle0' });
    await normal.page.evaluate(() => navigator.serviceWorker.ready);
    await normal.page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
    assert.equal(await normal.page.$eval('#my-teams-root', el => getComputedStyle(el).display), 'none');
    assert.equal(requests.filter(url => /\/(?:_astro\/)?my-teams[.-]/.test(url)).length, 0);
    const cached = await normal.page.evaluate(async () => (await Promise.all((await caches.keys()).map(async name => (await (await caches.open(name)).keys()).map(r => r.url)))).flat());
    assert.ok(!cached.some(url => /\/(?:_astro\/)?my-teams[.-]/.test(url)), 'service worker must not precache PWA-only resources');
    await normal.page.evaluate(() => dispatchEvent(new Event('appinstalled')));
    await frame(normal.page);
    assert.equal(await normal.page.$eval('#my-teams-root', el => getComputedStyle(el).display), 'none', 'installing does not turn the browser tab into standalone');
    await normal.context.close();
    console.log('Passed: no My Teams JSON, module or stylesheet requested/cached in browser mode.');

    // Repeat on two fresh installations, measuring the reserved space with data held back.
    for (let run = 1; run <= 2; run++) {
        const { context, page } = await setup();
        let release;
        let started;
        const gate = new Promise(resolve => { release = resolve; });
        const requestStarted = new Promise(resolve => { started = resolve; });
        await page.setRequestInterception(true);
        page.on('request', async request => {
            if (new URL(request.url()).pathname === '/my-teams.json') { started(); await gate; }
            await request.continue();
        });
        await page.goto(baseURL, { waitUntil: 'domcontentloaded' });
        await requestStarted;
        await frame(page);
        const before = await geometry(page);
        assert.ok(before.height > 200, 'standalone reserves a full row before data arrives');
        assert.equal(await page.$eval('#mt-loading', el => el.hidden), false);
        const loadStart = await page.evaluate(() => performance.now());
        if (run === 1) await page.screenshot({ path: `${artifacts}/loading.png` });
        release();
        await ready(page);
        await frame(page);
        assert.deepEqual(await geometry(page), before, 'loading the cards must not move the calendar');
        assert.equal(await page.$$eval('.favorite-team-card', els => els.length), 2);
        const shifts = await page.evaluate(() => window.__shifts);
        const cls = shifts.reduce((sum, entry) => sum + entry.value, 0);
        const loadingCLS = shifts.filter(e => e.time >= loadStart).reduce((sum, entry) => sum + entry.value, 0);
        assert.equal(loadingCLS, 0, 'My Teams must not cause layout shifts when replacing its skeleton');
        assert.ok(cls < 0.02, `Initial page CLS too high: ${cls}`);
        results.push({ run, cls, loadingCLS, height: before.height });
        if (run === 2) { await context.close(); continue; }

        for (const width of [320, 390, 1440]) {
            await page.setViewport({ width, height: 900 });
            for (const theme of ['dark', 'light']) {
                await page.evaluate(theme => document.documentElement.dataset.theme = theme, theme);
                await page.screenshot({ path: `${artifacts}/${width}-${theme}.png` });
                assert.equal(await page.$eval('#my-teams-root', el => el.getBoundingClientRect().right <= innerWidth), true);
                if (width >= 390) assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
                const box = await page.$eval('.my-teams__viewport', el => ({ height: el.clientHeight, scroll: el.scrollHeight }));
                assert.equal(box.height, box.scroll, 'cards stay inside the reserved row');
            }
        }
        await page.setViewport({ width: 390, height: 900 });
        await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
        await page.click('#mt-next');
        await page.waitForFunction(() => document.getElementById('mt-dashboard').scrollLeft > 0);
        await page.focus('#mt-dashboard');
        await page.keyboard.press('Home');
        await page.waitForFunction(() => document.getElementById('mt-dashboard').scrollLeft === 0);
        await page.click('.favorite-team-card');
        await page.waitForSelector('#schedule-modal[open]');
        assert.equal(await page.$eval('#modal-team-name', el => el.textContent), 'Buffalo');
        assert.ok(await page.$$eval('#schedule-list .game-item', els => els.length) > 0);
        await page.keyboard.press('Escape');

        const fixed = await geometry(page);
        await page.click('#btn-edit-teams');
        await page.waitForSelector('#mt-selector-modal[open]');
        assert.equal(await page.$$eval('.select-card', els => els.length), 32);
        await page.$$eval('.select-card', els => els.forEach(el => { if (el.getAttribute('aria-pressed') === 'false') el.click(); }));
        await page.click('#btn-save-teams');
        assert.equal(await page.$$eval('.favorite-team-card', els => els.length), 32);
        assert.deepEqual(await geometry(page), fixed, '32 favorites still occupy one row');
        assert.equal(await page.$$eval('.my-teams__slide', els => new Set(els.map(el => el.getBoundingClientRect().top)).size), 1);
        await page.click('#btn-edit-teams');
        await page.$$eval('.select-card', els => els.forEach(el => el.click()));
        await page.click('#btn-save-teams');
        assert.ok(await page.$('.my-teams__empty-action'));
        assert.deepEqual(await geometry(page), fixed, 'empty state retains the row height');
        await page.click('.my-teams__empty-action');
        await page.click('.select-card[aria-label="Tampa Bay"]');
        await page.click('#btn-save-teams');
        assert.equal(await page.$eval('.favorite-team-card use', el => el.getAttribute('href')), '/sprites.svg#buccaneers');
        assert.deepEqual(await geometry(page), fixed, 'one favorite retains the row height');
        assert.deepEqual(await page.evaluate(() => JSON.parse(localStorage.getItem('nfl-favorites'))), ['Tampa Bay']);

        // Resources from the very first standalone visit must enter the runtime cache.
        await page.waitForFunction(async () => {
            const names = await caches.keys();
            if (!names.includes('my-teams-code-v1')) return false;
            const urls = (await (await caches.open('my-teams-code-v1')).keys()).map(r => r.url);
            return urls.some(url => url.endsWith('.js')) && Boolean(await caches.match('/my-teams.json'));
        });
        // Navigation caching is NetworkFirst; revisit once under the active controller.
        await page.reload({ waitUntil: 'networkidle0' });
        await ready(page);
        await page.setOfflineMode(true);
        await page.reload({ waitUntil: 'networkidle0' });
        await ready(page);
        assert.equal(await page.$$eval('.favorite-team-card', els => els.length), 1);
        await page.click('#btn-edit-teams');
        await page.click('.select-card[aria-label="Buffalo"]');
        await page.click('#btn-save-teams');
        assert.equal(await page.$$eval('.favorite-team-card', els => els.length), 2);
        await context.close();
        console.log('Passed: carousel, keyboard, selector, 0/1/2/32 favorites, themes, responsive layout and offline reload/edit.');
    }

    const failure = await setup('ios', '{invalid json');
    await failure.page.setBypassServiceWorker(true);
    let fail = true;
    await failure.page.setRequestInterception(true);
    failure.page.on('request', request => {
        if (new URL(request.url()).pathname === '/my-teams.json' && fail) request.respond({ status: 503, body: 'Unavailable' });
        else request.continue();
    });
    await failure.page.goto(baseURL, { waitUntil: 'networkidle0' });
    await failure.page.waitForSelector('#mt-retry:not([hidden])');
    const failed = await geometry(failure.page);
    fail = false;
    await failure.page.click('#mt-retry');
    await ready(failure.page);
    assert.deepEqual(await geometry(failure.page), failed);
    assert.ok(await failure.page.$('.my-teams__empty-action'), 'invalid saved favorites fall back to the empty state');
    await failure.context.close();
    assert.deepEqual(errors, []);
    console.log('Passed: iOS standalone detection, HTTP failure/retry and invalid saved favorites.');
    console.log(JSON.stringify(results, null, 2));
} finally { await browser.close(); }
