import { getTeamId } from '@/utils/team-mapping.js';

export const DIVISIONS = [
    { name: 'AFC East', conference: 'AFC', teams: ['bills', 'dolphins', 'patriots', 'jets'] },
    { name: 'AFC North', conference: 'AFC', teams: ['ravens', 'bengals', 'browns', 'steelers'] },
    { name: 'AFC South', conference: 'AFC', teams: ['texans', 'colts', 'jaguars', 'titans'] },
    { name: 'AFC West', conference: 'AFC', teams: ['broncos', 'chiefs', 'raiders', 'chargers'] },
    { name: 'NFC East', conference: 'NFC', teams: ['cowboys', 'giants', 'eagles', 'commanders'] },
    { name: 'NFC North', conference: 'NFC', teams: ['bears', 'lions', 'packers', 'vikings'] },
    { name: 'NFC South', conference: 'NFC', teams: ['falcons', 'panthers', 'saints', 'buccaneers'] },
    { name: 'NFC West', conference: 'NFC', teams: ['cardinals', 'rams', '49ers', 'seahawks'] },
];

export function getDivisionTeams(teams, division) {
    return teams.filter(team => division.teams.includes(getTeamId(team.team).replace('buccaners', 'buccaneers')));
}

export function winPercentage(record) {
    const [wins = 0, losses = 0, ties = 0] = record.split('-').map(Number);
    const games = wins + losses + ties;
    return games ? (wins + ties / 2) / games : 0;
}

// League view compares records, not playoff seeds from separate conferences.
// Equal records share a rank; alphabetical ordering only stabilizes their display.
export function rankLeague(teams) {
    const sorted = [...teams].sort((a, b) =>
        winPercentage(b.record) - winPercentage(a.record) || a.team.localeCompare(b.team));
    let rank = 1;
    return sorted.map((team, index) => {
        if (index > 0 && winPercentage(team.record) !== winPercentage(sorted[index - 1].record)) rank = index + 1;
        return { ...team, rank };
    });
}
