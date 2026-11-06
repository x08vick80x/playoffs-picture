import type { Page } from 'puppeteer';
import type { ScheduleData } from '@/types/football.ts';
// Requires: npm run build && npm run preview -- --port 4322
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import puppeteer from 'puppeteer';
import { getScheduleWeekNumber } from '../scraper/config.ts';

const baseURL = process.env.SCHEDULE_TEST_URL || 'http://127.0.0.1:4322';
const schedule: ScheduleData = JSON.parse(readFileSync(new URL('../src/data/schedule.json', import.meta.url), 'utf8'));
const current = `REG${getScheduleWeekNumber()}`;
const others = schedule.weeks.map(w => w.week).filter(w => w !== current);
const browser = await puppeteer.launch({ headless: true });
const errors: string[] = [];
const clickWeek = (page: Page, week: string) => page.$eval(`[data-week="${week}"]`, el => (el as HTMLButtonElement).click());
const waitForWeek = (page: Page, week: string) => page.waitForFunction(
    id => document.querySelector<HTMLElement>('#schedule-week [data-week-panel]')?.dataset.weekPanel === id &&
        document.querySelector('#schedule-week')!.getAttribute('aria-busy') === 'false', {}, week,
);

try {
    const context = await browser.createBrowserContext();
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error instanceof Error ? error.message : String(error)));
    await page.setBypassServiceWorker(true);
    await page.setViewport({ width: 390, height: 844 });
    await page.evaluateOnNewDocument(() => localStorage.setItem('nfl-favorites', '["Buffalo"]'));
    const requests: string[] = [];
    page.on('request', request => {
        if (new URL(request.url()).pathname.startsWith('/schedule/')) requests.push(request.url());
    });
    await page.goto(baseURL, { waitUntil: 'networkidle0' });
    await waitForWeek(page, current);
    assert.equal(await page.$$eval('.season-schedule__panel', panels => panels.length), 1);
    assert.equal(requests.length, 0, 'no week fragment requested by the page before selection');

    console.log('Passed: initial week without fragment fetch.');
    // Fetch once, reuse cached markup, and keep a single mounted panel.
    await clickWeek(page, others[0]);
    await waitForWeek(page, others[0]);
    assert.equal(requests.length, 1);
    assert.equal(await page.$$eval('.schedule-row', rows => rows.length), schedule.weeks.find(w => w.week === others[0])!.matches.length);
    assert.equal(await page.$$eval('.schedule-row--favorite', rows => rows.length), 1);
    await clickWeek(page, current);
    await waitForWeek(page, current);
    await clickWeek(page, others[0]);
    await waitForWeek(page, others[0]);
    assert.equal(requests.length, 1, 'returning to a loaded week must not fetch again');

    console.log('Passed: lazy fetch and memory cache.');
    // Delayed response, rapid consecutive selections, and recoverable HTTP errors.
    let releaseSlow!: () => void;
    let markSlowStarted!: () => void;
    const slowStarted = new Promise<void>(resolve => { markSlowStarted = resolve; });
    let fail = true;
    const slow = new Promise<void>(resolve => { releaseSlow = resolve; });
    await page.setRequestInterception(true);
    page.on('request', async request => {
        const path = new URL(request.url()).pathname;
        if (path === `/schedule/${others[1]}`) { markSlowStarted(); await slow; }
        if (path === `/schedule/${others[3]}` && fail) {
            await request.respond({ status: 503, body: 'Unavailable' });
        } else {
            await request.continue();
        }
    });
    const calendarBounds = () => page.$eval('#schedule-week', host => ({
        top: host.getBoundingClientRect().top + scrollY,
        height: host.getBoundingClientRect().height,
    }));
    const beforeLoading = await calendarBounds();
    await clickWeek(page, others[1]);
    await slowStarted;
    assert.deepEqual(await calendarBounds(), beforeLoading, 'skeleton must not move or resize the calendar');
    assert.ok(await page.$$eval('.schedule-row--loading', rows => rows.length) > 0);
    assert.equal(await page.$eval('.schedule-row__teams', el => getComputedStyle(el).visibility), 'hidden');
    assert.equal(await page.$eval('.schedule-row--loading', el => getComputedStyle(el, '::before').animationName), 'schedule-row-pulse');
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
    assert.equal(await page.$eval('.schedule-row--loading', el => getComputedStyle(el, '::before').animationName), 'none');
    await page.emulateMediaFeatures([]);
    await clickWeek(page, others[2]);
    await waitForWeek(page, others[2]);
    assert.equal(await page.$$eval('.schedule-row--loading', rows => rows.length), 0);
    const slowResponse = page.waitForResponse(r => new URL(r.url()).pathname === `/schedule/${others[1]}`);
    releaseSlow();
    await slowResponse;
    await page.waitForNetworkIdle();
    assert.equal(await page.$eval('.season-schedule__panel', el => (el as HTMLElement).dataset.weekPanel), others[2]);

    await clickWeek(page, others[3]);
    await page.waitForSelector('.season-schedule__retry:not([hidden])');
    assert.equal(await page.$$eval('.schedule-row--loading', rows => rows.length), 0, 'failed loads restore the previous cards');
    assert.equal(await page.$eval('.season-schedule__panel', el => (el as HTMLElement).dataset.weekPanel), others[2]);
    assert.equal(await page.$eval('.season-schedule__tab--active', el => (el as HTMLElement).dataset.week), others[2]);
    fail = false;
    await page.click('.season-schedule__retry');
    await waitForWeek(page, others[3]);

    for (const week of schedule.weeks) {
        await clickWeek(page, week.week);
        await waitForWeek(page, week.week);
        assert.equal(await page.$$eval('.season-schedule__panel', panels => panels.length), 1);
        assert.equal(await page.$$eval('.schedule-row', rows => rows.length), week.matches.length);
        const scores = await page.$$eval('.schedule-row__score', nodes => nodes.map(n => n.textContent.trim()));
        const expected = week.matches.flatMap(m => m.final ? [m.awayScore, m.homeScore].filter(n => n != null).map(String) : []);
        assert.deepEqual(scores, expected);
    }
    for (const width of [390, 1440]) {
        await page.setViewport({ width, height: 900 });
        for (const theme of ['dark', 'light']) {
            await page.evaluate(value => { document.documentElement.dataset.theme = value; }, theme);
            assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
        }
    }
    console.log('Passed: lazy fetch, cache, races, retry, all weeks/scores, themes.');
    await context.close();

    // The SSR week is usable without JavaScript.
    const noJS = await browser.newPage();
    await noJS.setJavaScriptEnabled(false);
    await noJS.goto(baseURL);
    assert.equal(await noJS.$$eval('.season-schedule__panel', panels => panels.length), 1);
    assert.ok(await noJS.$$eval('.schedule-row', rows => rows.length) > 0);
    await noJS.close();

    // A stale build still selects the week at the user's current date.
    const future = await browser.newPage();
    const timestamp = Date.parse('2026-12-10T12:00:00Z');
    await future.evaluateOnNewDocument(time => {
        window.Date = new Proxy(Date, {
            construct(target, args) { return Reflect.construct(target, args.length ? args : [time]); },
            get(target, property, receiver) { return property === 'now' ? () => time : Reflect.get(target, property, receiver); },
        });
    }, timestamp);
    await future.goto(baseURL, { waitUntil: 'networkidle0' });
    await waitForWeek(future, `REG${getScheduleWeekNumber(new Date(timestamp))}`);
    await future.close();
    console.log('Passed: no-JS rendering and runtime week selection.');

    // Previously unvisited weeks must work offline once precaching completes.
    const offlineContext = await browser.createBrowserContext();
    const offline = await offlineContext.newPage();
    offline.on('pageerror', error => errors.push(error instanceof Error ? error.message : String(error)));
    await offline.goto(baseURL, { waitUntil: 'networkidle0' });
    await offline.evaluate(async () => {
        await Promise.race([navigator.serviceWorker.ready, new Promise((_, reject) => setTimeout(() => reject(new Error('Service worker did not become ready')), 15000))]);
    });
    await offline.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
    await offline.waitForFunction(async () => {
        const cache = await caches.open((await caches.keys()).find(key => key.includes('precache'))!);
        return (await cache.keys()).filter(r => new URL(r.url).pathname.startsWith('/schedule/')).length === 18;
    });
    await offline.setOfflineMode(true);
    await clickWeek(offline, others[0]);
    await waitForWeek(offline, others[0]);
    await clickWeek(offline, others.at(-1)!);
    await waitForWeek(offline, others.at(-1)!);
    await offlineContext.close();
    assert.deepEqual(errors, []);
    console.log('Schedule browser checks passed: lazy fetch, cache, race, retry, all weeks/scores, themes, no-JS, date rollover and offline.');
} finally {
    await browser.close();
}
