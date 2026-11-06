import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DIVISIONS, getDivisionTeams, rankLeague, winPercentage } from '@/utils/standings.ts';
import { getTeamId } from '@/utils/team-mapping.ts';

test('winPercentage counts a tie as half a win', () => {
    assert.equal(winPercentage('10-5-0'), 10 / 15);
    assert.equal(winPercentage('4-2-1'), 4.5 / 7);
    assert.equal(winPercentage('0-0-0'), 0);
});

test('rankLeague sorts by win percentage and shares rank on equal records', () => {
    const ranked = rankLeague([
        { team: 'Denver', record: '6-2-0' },
        { team: 'Buffalo', record: '7-1-0' },
        { team: 'Pittsburgh', record: '6-2-0' },
        { team: 'Houston', record: '2-6-0' },
    ]);
    assert.deepEqual(ranked.map(t => [t.team, t.rank]), [
        ['Buffalo', 1], ['Denver', 2], ['Pittsburgh', 2], ['Houston', 4],
    ]);
});

test('rankLeague compares percentages, not wins, when games played differ', () => {
    const ranked = rankLeague([
        { team: 'Chicago', record: '5-2-0' },
        { team: 'Detroit', record: '5-3-0' },
    ]);
    assert.equal(ranked[0].team, 'Chicago');
});

test('rankLeague does not mutate its input', () => {
    const teams = [{ team: 'B', record: '1-0-0' }, { team: 'A', record: '0-1-0' }];
    rankLeague(teams);
    assert.equal(teams[0].team, 'B');
});

test('getDivisionTeams matches city names', () => {
    const south = DIVISIONS.find(d => d.name === 'NFC South')!;
    const teams = getDivisionTeams([
        { team: 'Tampa Bay' }, { team: 'Atlanta' }, { team: 'Dallas' },
    ], south);
    assert.deepEqual(teams.map(t => t.team), ['Tampa Bay', 'Atlanta']);
});

test('every team belongs to exactly one division', () => {
    const all = DIVISIONS.flatMap(d => d.teams);
    assert.equal(new Set(all).size, 32);
    assert.equal(DIVISIONS.every(d => d.teams.length === 4), true);
});

test('getTeamId resolves cities, full names and nicknames to the same sprite id', () => {
    assert.equal(getTeamId('Kansas City'), 'chiefs');
    assert.equal(getTeamId('Kansas City Chiefs'), 'chiefs');
    assert.equal(getTeamId('Chiefs'), 'chiefs');
    assert.equal(getTeamId('L.A. Rams'), 'rams');
    assert.equal(getTeamId('Los Angeles Rams'), 'rams');
    assert.equal(getTeamId('N.Y. Giants'), 'giants');
});

test('getTeamId resolves both Buccaneers names to the existing logo file', () => {
    assert.equal(getTeamId('Tampa Bay Buccaneers'), 'buccaneers');
    assert.equal(getTeamId('Tampa Bay'), 'buccaneers');
});

test('getTeamId falls back to the nfl logo without a name', () => {
    assert.equal(getTeamId(''), 'nfl');
    assert.equal(getTeamId(undefined), 'nfl');
});
