import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getTeamId } from '../src/utils/team-mapping.ts';

function asRecord(value: unknown): Record<string, unknown> {
    return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

const LOGOS_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src/images/logos');
const TEAMS_PER_CONFERENCE = 16;
const PLAYOFF_SEEDS = 7;
const SEASON_GAMES = 17;
const WEEKS = 18;

const RECORD = /^(\d+)-(\d+)(?:-(\d+))?$/;

export function assertValid(label: string, problems: string[]) {
    if (problems.length) {
        throw new Error(`${label} validation failed:\n - ${problems.join('\n - ')}`);
    }
}

export function validateStandings(standings: unknown) {
    const problems = [];
    const ids = new Set<string>();

    for (const conf of ['AFC', 'NFC']) {
        const teams = asRecord(standings)[conf];
        if (!Array.isArray(teams) || teams.length !== TEAMS_PER_CONFERENCE) {
            problems.push(`${conf}: expected ${TEAMS_PER_CONFERENCE} teams, got ${(Array.isArray(teams) ? teams.length : 'none')}`);
            continue;
        }
        for (const entry of teams) {
            const { team, record } = asRecord(entry);
            const match = RECORD.exec(typeof record === 'string' ? record : '');
            if (!match) {
                problems.push(`${conf} ${team}: invalid record "${record}"`);
            } else if (match.slice(1).reduce((sum, n) => sum + Number(n || 0), 0) > WEEKS) {
                problems.push(`${conf} ${team}: record "${record}" has more games than the season`);
            }
            const id = getTeamId(typeof team === 'string' ? team : '');
            if (!fs.existsSync(path.join(LOGOS_DIR, `${id}.svg`))) problems.push(`${conf}: unknown team "${team}"`);
            if (ids.has(id)) problems.push(`${conf}: duplicate team "${team}"`);
            ids.add(id);
        }
    }
    return problems;
}

// nfl.com publishes the whole season up front, so every team must have its 17 games, undated ones included.
export function validateSchedule(weeks: unknown) {
    const problems = [];
    if (!Array.isArray(weeks) || weeks.length !== WEEKS) {
        return [`expected ${WEEKS} weeks, got ${(Array.isArray(weeks) ? weeks.length : 'none')}`];
    }

    const games = new Map<string, number>();
    weeks.forEach(entry => {
        const { week, matches } = asRecord(entry);
        if (!Array.isArray(matches)) { problems.push(`${week}: missing matches`); return; }
        for (const match of matches) {
            const { home, away, final, homeScore, awayScore } = asRecord(match);
            if (!home || !away || home === away) problems.push(`${week}: invalid match ${away} @ ${home}`);
            if (final && (!Number.isInteger(homeScore) || !Number.isInteger(awayScore))) {
                problems.push(`${week}: final game ${away} @ ${home} has no score`);
            }
            for (const team of [home, away]) {
                if (typeof team !== 'string' || !team) { problems.push(`${week}: invalid team`); continue; }
                games.set(team, (games.get(team) ?? 0) + 1);
            }
        }
    });

    if (games.size !== TEAMS_PER_CONFERENCE * 2) problems.push(`expected 32 teams in the schedule, got ${games.size}`);
    for (const [team, count] of games) {
        if (count !== SEASON_GAMES) problems.push(`${team}: expected ${SEASON_GAMES} games, got ${count}`);
    }
    return problems;
}

// Only meaningful once the playoff picture is scraped (see PLAYOFF_PICTURE_MIN_WEEK).
export function validatePlayoffPicture(picture: unknown) {
    const problems = [];
    for (const conf of ['AFC', 'NFC']) {
        const seeds = asRecord(asRecord(picture).seeds)[conf];
        if (!Array.isArray(seeds) || seeds.length !== PLAYOFF_SEEDS) {
            problems.push(`${conf}: expected ${PLAYOFF_SEEDS} seeds, got ${(Array.isArray(seeds) ? seeds.length : 'none')}`);
            continue;
        }
        if (new Set(seeds.map(seed => asRecord(seed).name)).size !== PLAYOFF_SEEDS) problems.push(`${conf}: duplicate seeds`);
        for (const entry of seeds) {
            const seed = asRecord(entry);
            if (!seed.name || !RECORD.test(typeof seed.record === 'string' ? seed.record : '')) problems.push(`${conf}: incomplete seed ${JSON.stringify(seed.name)}`);
        }
    }
    return problems;
}
