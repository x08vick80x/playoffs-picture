import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getTeamId } from '../src/utils/team-mapping.js';

const LOGOS_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src/images/logos');
const TEAMS_PER_CONFERENCE = 16;
const PLAYOFF_SEEDS = 7;
const MIN_GAMES_PER_WEEK = 13; // 16 games minus up to 3 bye-week pairs
const WEEKS = 18;

const RECORD = /^(\d+)-(\d+)(?:-(\d+))?$/;

export function assertValid(label, problems) {
    if (problems.length) {
        throw new Error(`${label} validation failed:\n - ${problems.join('\n - ')}`);
    }
}

export function validateStandings(standings) {
    const problems = [];
    const ids = new Set();

    for (const conf of ['AFC', 'NFC']) {
        const teams = standings?.[conf];
        if (!Array.isArray(teams) || teams.length !== TEAMS_PER_CONFERENCE) {
            problems.push(`${conf}: expected ${TEAMS_PER_CONFERENCE} teams, got ${teams?.length ?? 'none'}`);
            continue;
        }
        for (const { team, record } of teams) {
            const match = RECORD.exec(record ?? '');
            if (!match) {
                problems.push(`${conf} ${team}: invalid record "${record}"`);
            } else if (match.slice(1).reduce((sum, n) => sum + Number(n || 0), 0) > WEEKS) {
                problems.push(`${conf} ${team}: record "${record}" has more games than the season`);
            }
            const id = getTeamId(team);
            if (!fs.existsSync(path.join(LOGOS_DIR, `${id}.svg`))) problems.push(`${conf}: unknown team "${team}"`);
            if (ids.has(id)) problems.push(`${conf}: duplicate team "${team}"`);
            ids.add(id);
        }
    }
    return problems;
}

// Later weeks may legitimately be unpublished or partial, so only weeks up to currentWeek must be complete.
export function validateSchedule(weeks, currentWeek) {
    const problems = [];
    if (!Array.isArray(weeks) || weeks.length !== WEEKS) {
        return [`expected ${WEEKS} weeks, got ${weeks?.length ?? 'none'}`];
    }

    const games = new Map();
    weeks.forEach(({ week, matches }, index) => {
        if (index < currentWeek && matches.length < MIN_GAMES_PER_WEEK) {
            problems.push(`${week}: expected at least ${MIN_GAMES_PER_WEEK} games, got ${matches.length}`);
        }
        for (const { home, away, final, homeScore, awayScore } of matches) {
            if (!home || !away || home === away) problems.push(`${week}: invalid match ${away} @ ${home}`);
            if (final && (!Number.isInteger(homeScore) || !Number.isInteger(awayScore))) {
                problems.push(`${week}: final game ${away} @ ${home} has no score`);
            }
            for (const team of [home, away]) games.set(team, (games.get(team) ?? 0) + 1);
        }
    });

    if (games.size !== TEAMS_PER_CONFERENCE * 2) problems.push(`expected 32 teams in the schedule, got ${games.size}`);
    return problems;
}

// Only meaningful once the playoff picture is scraped (see PLAYOFF_PICTURE_MIN_WEEK).
export function validatePlayoffPicture(picture) {
    const problems = [];
    for (const conf of ['AFC', 'NFC']) {
        const seeds = picture?.seeds?.[conf];
        if (!Array.isArray(seeds) || seeds.length !== PLAYOFF_SEEDS) {
            problems.push(`${conf}: expected ${PLAYOFF_SEEDS} seeds, got ${seeds?.length ?? 'none'}`);
            continue;
        }
        if (new Set(seeds.map(seed => seed.name)).size !== PLAYOFF_SEEDS) problems.push(`${conf}: duplicate seeds`);
        for (const seed of seeds) {
            if (!seed.name || !RECORD.test(seed.record ?? '')) problems.push(`${conf}: incomplete seed ${JSON.stringify(seed.name)}`);
        }
    }
    return problems;
}
