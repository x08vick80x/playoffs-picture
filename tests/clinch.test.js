import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateConference } from '@/utils/clinch.js';

// Four divisions of four teams, two games left, wins per division in descending order.
const WINS = { A: [13, 8, 6, 3], B: [12, 9, 5, 2], C: [11, 9, 4, 2], D: [10, 9, 5, 1] };
const conference = (remaining = 2, wins = WINS) => Object.entries(wins).flatMap(([division, list]) =>
    list.map((points, i) => ({ team: `${division}${i}`, division, points, remaining })));

test('everyone is alive early in the season', () => {
    const statuses = evaluateConference(conference(14, { A: [2, 2, 2, 2], B: [2, 2, 2, 2], C: [2, 2, 2, 2], D: [2, 2, 2, 2] }));
    assert.equal(Object.values(statuses).every(s => s === 'alive'), true);
});

test('a team clinches its division once no rival can catch it', () => {
    const statuses = evaluateConference(conference());
    assert.equal(statuses.A0, 'division');
    assert.equal(statuses.B0, 'division');
});

test('a team clinches a berth when too few teams can still outrank it', () => {
    assert.equal(evaluateConference(conference()).C0, 'playoff');
});

test('a team is eliminated when seven teams are out of reach and its division is lost', () => {
    const statuses = evaluateConference(conference());
    assert.equal(statuses.D2, 'eliminated');
    assert.equal(statuses.A3, 'eliminated');
});

test('a tie on record never awards the division or eliminates a team', () => {
    const statuses = evaluateConference([
        { team: 'X', division: 'A', points: 10, remaining: 0 },
        { team: 'Y', division: 'A', points: 10, remaining: 0 },
    ]);
    assert.equal(statuses.X, 'playoff');
    assert.equal(statuses.Y, 'playoff');
});
