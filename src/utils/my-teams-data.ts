import type { Standings, PlayoffPicture, TeamGame, MyTeamsData } from '@/types/football.ts';
import { getTeamId, getTeamAbbreviation } from '@/utils/team-mapping.ts';

// Project only the fields used by the dashboard; schedules occur once, without
// duplicated playoff schedules, scraper metadata or power-ranking articles.
export function buildMyTeamsData(standings: Standings, playoffPicture: PlayoffPicture, teamSchedules: Record<string, TeamGame[]>): MyTeamsData {
    const schedules = Object.fromEntries(Object.entries(teamSchedules).map(([name, games]) => [getTeamId(name), games]));
    const rankings = new Map((playoffPicture.powerRankings || []).map(row => [getTeamId(row.team), row]));
    return Object.fromEntries((['AFC', 'NFC'] as const).flatMap(conf => standings[conf].map(row => {
        const name = row.team.trim();
        const id = getTeamId(name);
        const find = (group: 'seeds' | 'bubble' | 'eliminated') => playoffPicture[group]?.[conf]?.find(team => getTeamId(team.name) === id);
        const seed = find('seeds');
        const bubble = find('bubble');
        const eliminated = find('eliminated');
        const ranking = rankings.get(id);
        return [name, {
            id, abbr: getTeamAbbreviation(name), record: row.record,
            seed: seed?.seed ?? null,
            status: seed ? 'projected' : bubble ? 'bubble' : eliminated ? 'eliminated' : null,
            probability: (seed || bubble || eliminated)?.probability ?? 'N/A',
            powerRank: ranking?.rank ?? null,
            powerTrend: ranking?.trend ?? '',
            schedule: (schedules[id] || []).map(({ opponent, location, week, date, time, opponentRecord }) =>
                ({ opponent, location, week, date, time, opponentRecord })),
        }];
    })));
}
