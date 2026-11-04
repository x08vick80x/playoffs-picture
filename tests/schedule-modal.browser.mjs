// Requires: npm run build && npm run preview -- --port 4322
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer';

const baseURL = process.env.SCHEDULE_TEST_URL || 'http://127.0.0.1:4322';
const browser = await puppeteer.launch({ headless: true });
const errors = [];
try {
    const page = await browser.newPage();
    page.on('pageerror', error => errors.push(error.message));
    await page.setBypassServiceWorker(true);
    await page.setViewport({ width: 390, height: 900 });
    await page.evaluateOnNewDocument(() => {
        window.__scheduleOpens = [];
        window.__scheduleShows = 0;
        window.addEventListener('open-schedule-modal', event => window.__scheduleOpens.push(event.detail));
        const original = HTMLDialogElement.prototype.showModal;
        HTMLDialogElement.prototype.showModal = function (...args) {
            if (this.id === 'schedule-modal') window.__scheduleShows++;
            return original.apply(this, args);
        };
    });
    await page.goto(baseURL, { waitUntil: 'networkidle0' });
    for (const selector of [
        '.matchup-card--bye .team-row__name',
        '.matchup-card:not(.matchup-card--bye) .matchup-card__team:first-child svg',
        '.matchup-card:not(.matchup-card--bye) .matchup-card__team:last-child .matchup-card__btn',
        '#bubble .bubble-card .team-row__name',
        '#bubble .bubble-card__btn',
    ]) {
        const expected = await page.$eval(selector, el => {
            const trigger = el.closest('.team-card-trigger');
            return { teamName: trigger.dataset.team, schedule: JSON.parse(trigger.dataset.schedule) };
        });
        await page.evaluate(() => { window.__scheduleOpens = []; window.__scheduleShows = 0; });
        await page.click(selector);
        await page.waitForSelector('#schedule-modal[open]');
        assert.equal(await page.evaluate(() => window.__scheduleOpens.length), 1, `${selector}: one click must dispatch exactly one event`);
        assert.deepEqual(await page.evaluate(() => window.__scheduleOpens[0]), expected);
        assert.equal(await page.evaluate(() => window.__scheduleShows), 1, `${selector}: render/open only once`);
        assert.equal(await page.$eval('#modal-team-name', el => el.textContent), expected.teamName);
        assert.equal(await page.$$eval('#schedule-list .game-item', els => els.length), expected.schedule.length);
        await page.keyboard.press('Escape');
        await page.waitForSelector('#schedule-modal[open]', { hidden: true });
    }
    // Elimination can be empty early in the season; exercise a dynamically added card too.
    await page.evaluate(() => {
        const card = document.createElement('div');
        card.id = 'test-eliminated';
        card.className = 'bubble-card bubble-card--eliminated team-card-trigger';
        card.dataset.team = 'Tampa Bay Buccaneers';
        card.dataset.schedule = '[]';
        card.innerHTML = '<span>Eliminated team</span>';
        document.getElementById('eliminated').append(card);
        window.__scheduleOpens = [];
        window.__scheduleShows = 0;
    });
    await page.click('#test-eliminated span');
    await page.waitForSelector('#schedule-modal[open]');
    assert.equal(await page.evaluate(() => window.__scheduleOpens.length), 1);
    assert.equal(await page.evaluate(() => window.__scheduleShows), 1);
    assert.equal(await page.$eval('#modal-games-left', el => el.textContent), '0 games left');
    await page.click('#close-modal');
    await page.waitForSelector('#schedule-modal[open]', { hidden: true });
    await page.click('#test-eliminated span');
    await page.waitForSelector('#schedule-modal[open]');
    assert.equal(await page.evaluate(() => window.__scheduleShows), 2, 'closing and reopening works');
    await page.keyboard.press('Escape');
    await page.evaluate(() => { window.__scheduleOpens = []; window.__scheduleShows = 0; });
    await page.click('.section-title');
    assert.equal(await page.evaluate(() => window.__scheduleOpens.length), 0);
    assert.equal(await page.evaluate(() => window.__scheduleShows), 0);
    assert.deepEqual(errors, []);
    console.log('Passed: one event/open per click on bye, both matchup sides, nested SVG, bubble button and dynamically inserted eliminated card; close/reopen and unrelated clicks.');
} finally { await browser.close(); }
