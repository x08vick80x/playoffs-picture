import type { Standings, ClinchStatus, Conferences, PlayoffTeam, TeamGame } from '@/types/football.ts';
import { DIVISIONS } from '@/utils/standings.ts';
import { getTeamId } from '@/utils/team-mapping.ts';

const PLAYOFF_SPOTS = 7;
const SEASON_GAMES = 17;

const teamKey = (team: string) => getTeamId(team);

function parseRecord(record: string) {
    const [wins = 0, losses = 0, ties = 0] = record.split('-').map(Number);
    return { points: wins + ties / 2, remaining: Math.max(0, SEASON_GAMES - wins - losses - ties) };
}

// Bounds only (best/worst final record, no tiebreakers): a status is returned only when it is
// certain, so a tie on record always stays "alive". teams: { team, division, points, remaining }.
export function evaluateConference(teams: { team: string; division?: string; points: number; remaining: number }[]): Record<string, ClinchStatus> {
    const bounded = teams.map(t => ({ ...t, min: t.points, max: t.points + t.remaining }));
    const rivalsOf = (t: typeof bounded[number]) => bounded.filter(o => o !== t && o.division === t.division);
    const canWinDivision = (t: typeof bounded[number]) => !rivalsOf(t).some(r => r.min > t.max);

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
export function getClinchStatuses(standings: Standings): Record<string, ClinchStatus> {
    return Object.assign({}, ...(['AFC', 'NFC'] as const).map(conf => evaluateConference(
        standings[conf].map(({ team, record }) => ({
            team,
            division: DIVISIONS.find(d => d.teams.includes(teamKey(team)))?.name,
            ...parseRecord(record),
        })),
    )));
}

const toNickname = (team: string) => {
    const id = teamKey(team);
    return id.charAt(0).toUpperCase() + id.slice(1);
};

// Scraped entries win (they carry probabilities); computed ones fill the gaps.
export function mergeEliminated(scraped: Conferences<PlayoffTeam>, standings: Standings, statuses: Record<string, ClinchStatus>, teamSchedules: Record<string, TeamGame[]> = {}): Conferences<PlayoffTeam> {
    const entries = Object.fromEntries((['AFC', 'NFC'] as const).map(conf => {
        const known = new Set(scraped[conf].map(t => teamKey(t.name)));
        const computed = standings[conf]
            .filter(t => statuses[t.team] === 'eliminated' && !known.has(teamKey(t.team)))
            .map(t => {
                const name = toNickname(t.team);
                return { name, conf, record: t.record.replace(/-0$/, ''), remainingSchedule: teamSchedules[name] || [] };
            });
        const teams: PlayoffTeam[] = [...scraped[conf], ...computed];
        return [conf, teams] as const;
    }));
    return { AFC: entries.AFC, NFC: entries.NFC };
}
