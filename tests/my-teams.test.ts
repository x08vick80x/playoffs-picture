import type { Standings, PlayoffPicture, ScheduleData } from '@/types/football.ts';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildMyTeamsData } from '@/utils/my-teams-data.ts';

const read = <T>(name: string): T => JSON.parse(readFileSync(new URL(`../src/data/${name}.json`, import.meta.url), 'utf8'));
const standings = read<Standings>('standings');
const picture = read<PlayoffPicture>('playoff-picture');
const { teamSchedules } = read<ScheduleData>('schedule');

test('My Teams projects all 32 teams without articles or duplicated schedules', () => {
    const data = buildMyTeamsData(standings, picture, teamSchedules);
    assert.equal(Object.keys(data).length, 32);
    assert.equal(data['Tampa Bay'].id, 'buccaneers');
    assert.deepEqual(data.Buffalo.schedule, teamSchedules.Bills);
    assert.equal(data.Buffalo.record, standings.AFC.find(t => t.team === 'Buffalo')!.record);
    assert.equal(data.Buffalo.powerRank, picture.powerRankings!.find(t => t.team === 'Bills')!.rank);
    const serialized = JSON.stringify(data);
    for (const key of ['remainingSchedule', 'nextOpponent', 'blurb', 'masterMap']) assert.ok(!serialized.includes(`"${key}"`));
    assert.ok(serialized.length < JSON.stringify({ standings, playoffPicture: picture, teamSchedules }).length / 2);
});

test('My Teams retains schedules before playoff projections are available', () => {
    const data = buildMyTeamsData(standings, {
        seeds: { AFC: [], NFC: [] }, bubble: { AFC: [], NFC: [] }, eliminated: { AFC: [], NFC: [] },
    }, teamSchedules);
    assert.equal(data.Buffalo.status, null);
    assert.equal(data.Buffalo.probability, 'N/A');
    assert.deepEqual(data.Buffalo.schedule, teamSchedules.Bills);
});
