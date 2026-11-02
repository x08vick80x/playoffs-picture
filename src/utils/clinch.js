import { DIVISIONS } from '@/utils/standings.js';
import { getTeamId } from '@/utils/team-mapping.js';

const PLAYOFF_SPOTS = 7;
const SEASON_GAMES = 17;

const teamKey = team => getTeamId(team).replace('buccaners', 'buccaneers');

function parseRecord(record) {
    const [wins = 0, losses = 0, ties = 0] = record.split('-').map(Number);
    return { points: wins + ties / 2, remaining: Math.max(0, SEASON_GAMES - wins - losses - ties) };
}

// Bounds only (best/worst final record, no tiebreakers): a status is returned only when it is
// certain, so a tie on record always stays "alive". teams: { team, division, points, remaining }.
export function evaluateConference(teams) {
    const bounded = teams.map(t => ({ ...t, min: t.points, max: t.points + t.remaining }));
    const rivalsOf = t => bounded.filter(o => o !== t && o.division === t.division);
    const canWinDivision = t => !rivalsOf(t).some(r => r.min > t.max);

    return Object.fromEntries(bounded.map(t => {
        const rivals = rivalsOf(t);
        if (rivals.every(r => r.max < t.min)) return [t.team, 'division'];

        // Only teams that can still outrank t in seeding (better-or-equal record, or a division winner).
        const contenders = bounded.filter(o => o !== t && (o.max >= t.min || canWinDivision(o)));
        if (contenders.length < PLAYOFF_SPOTS) return [t.team, 'playoff'];

        const ahead = bounded.filter(o => o.min > t.max);
        if (!canWinDivision(t) && ahead.length >= PLAYOFF_SPOTS) return [t.team, 'eliminated'];

        return [t.team, 'alive'];
    }));
}

// Statuses keyed by the team name used in standings.json: 'division' | 'playoff' | 'eliminated' | 'alive'.
export function getClinchStatuses(standings) {
    return Object.assign({}, ...['AFC', 'NFC'].map(conf => evaluateConference(
        standings[conf].map(({ team, record }) => ({
            team,
            division: DIVISIONS.find(d => d.teams.includes(teamKey(team)))?.name,
            ...parseRecord(record),
        })),
    )));
}

const toNickname = team => {
    const id = teamKey(team);
    return id.charAt(0).toUpperCase() + id.slice(1);
};

// Scraped entries win (they carry probabilities); computed ones fill the gaps.
export function mergeEliminated(scraped, standings, statuses, teamSchedules = {}) {
    return Object.fromEntries(['AFC', 'NFC'].map(conf => {
        const known = new Set(scraped[conf].map(t => teamKey(t.name)));
        const computed = standings[conf]
            .filter(t => statuses[t.team] === 'eliminated' && !known.has(teamKey(t.team)))
            .map(t => {
                const name = toNickname(t.team);
                return { name, conf, record: t.record.replace(/-0$/, ''), remainingSchedule: teamSchedules[name] || [] };
            });
        return [conf, [...scraped[conf], ...computed]];
    }));
}
