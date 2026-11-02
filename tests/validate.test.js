import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { assertValid, validatePlayoffPicture, validateSchedule, validateStandings } from '../scraper/validate.js';
import { DIVISIONS } from '@/utils/standings.js';

const NICKNAMES = DIVISIONS.flatMap(d => d.teams);
const LOGO_NAMES = { buccaneers: 'Tampa Bay' };

const standingsFixture = () => {
    const teamsOf = conf => DIVISIONS.filter(d => d.conference === conf).flatMap(d => d.teams)
        .map((id, i) => ({ seed: String(i + 1), team: LOGO_NAMES[id] ?? id, record: '4-3-0', status: '' }));
    return { AFC: teamsOf('AFC'), NFC: teamsOf('NFC') };
};

test('valid standings pass', () => {
    assert.deepEqual(validateStandings(standingsFixture()), []);
});

test('standings with a missing team are rejected', () => {
    const standings = standingsFixture();
    standings.NFC.pop();
    assert.match(validateStandings(standings)[0], /NFC: expected 16 teams, got 15/);
});

test('standings with an invalid record, unknown or duplicate team are rejected', () => {
    const standings = standingsFixture();
    standings.AFC[0].record = '0-0';
    standings.AFC[1].record = 'TBD';
    standings.AFC[2].team = 'Atlantis';
    standings.AFC[3] = { ...standings.AFC[4] };
    const problems = validateStandings(standings).join('\n');
    assert.match(problems, /invalid record "TBD"/);
    assert.match(problems, /unknown team "Atlantis"/);
    assert.match(problems, /duplicate team/);
});

test('empty scrape output is rejected', () => {
    assert.equal(validateStandings({ AFC: [], NFC: [] }).length, 2);
    assert.throws(() => assertValid('Standings', validateStandings({})), /Standings validation failed/);
});

const scheduleFixture = () => Array.from({ length: 18 }, (_, i) => ({
    week: `REG${i + 1}`,
    matches: i === 17 ? [] : Array.from({ length: 16 }, (__, m) => ({
        home: NICKNAMES[m * 2], away: NICKNAMES[m * 2 + 1], final: true, homeScore: 20, awayScore: 17,
    })),
}));

test('a complete schedule passes', () => {
    assert.deepEqual(validateSchedule(scheduleFixture()), []);
});

test('a team with missing games is rejected', () => {
    const weeks = scheduleFixture();
    weeks[2].matches = weeks[2].matches.slice(0, 5);
    assert.match(validateSchedule(weeks)[0], /expected 17 games, got 16/);
});

test('a final game without a score is rejected', () => {
    const weeks = scheduleFixture();
    weeks[0].matches[0].homeScore = null;
    assert.match(validateSchedule(weeks)[0], /has no score/);
});

test('a schedule that is not 18 weeks long is rejected', () => {
    assert.equal(validateSchedule([]).length, 1);
});

test('playoff picture needs 7 distinct seeds per conference', () => {
    const seeds = Array.from({ length: 7 }, (_, i) => ({ name: `Team${i}`, record: '5-2' }));
    assert.deepEqual(validatePlayoffPicture({ seeds: { AFC: seeds, NFC: seeds } }), []);
    assert.equal(validatePlayoffPicture({ seeds: { AFC: [], NFC: seeds } }).length, 1);
    assert.match(validatePlayoffPicture({ seeds: { AFC: [...seeds.slice(1), seeds[1]], NFC: seeds } })[0], /duplicate/);
});

test('the committed data files satisfy their own validators', () => {
    const read = name => JSON.parse(fs.readFileSync(path.resolve(import.meta.dirname, '../src/data', name), 'utf8'));
    const schedule = read('schedule.json');
    assert.deepEqual(validateStandings(read('standings.json')), []);
    assert.deepEqual(validateSchedule(schedule.weeks), []);
});
