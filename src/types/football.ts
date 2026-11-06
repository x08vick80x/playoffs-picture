export type Conference = 'AFC' | 'NFC';
export type Conferences<T> = Record<Conference, T[]>;
export interface StandingTeam { team: string; record: string; seed: string; status?: string }
export type Standings = Conferences<StandingTeam> & { lastUpdated?: string };
export interface TeamGame {
    opponent: string; location: string; week: string;
    date?: string | null; time?: string | null; opponentRecord?: string;
}
export interface ScheduleMatch {
    home: string; away: string; date?: string | null; time?: string | null;
    final?: boolean; homeScore?: number | null; awayScore?: number | null;
}
export interface ScheduleWeek { week: string; matches: ScheduleMatch[] }
export interface ScheduleData {
    season: number; currentWeek: number; weeks: ScheduleWeek[];
    teamSchedules: Record<string, TeamGame[]>;
}
export interface PlayoffTeam {
    name: string; record: string; seed?: number; conf?: Conference;
    probability?: string; trend?: string; trendDirection?: string;
    remainingSchedule?: TeamGame[]; nextOpponent?: Omit<TeamGame, 'week'> | null;
}
export interface Ranking { rank: number; team: string; trend?: string; blurb: string }
export interface PlayoffPicture {
    seeds: Conferences<PlayoffTeam>; bubble: Conferences<PlayoffTeam>; eliminated: Conferences<PlayoffTeam>;
    powerRankings?: Ranking[]; powerRankingsSource?: { url: string; week: number; season: number };
}
export interface FavoriteTeam {
    id: string; abbr: string; record: string; seed: number | null;
    status: 'projected' | 'bubble' | 'eliminated' | null; probability: string;
    powerRank: number | null; powerTrend: string; schedule: TeamGame[];
}
export type MyTeamsData = Record<string, FavoriteTeam>;
export type ClinchStatus = 'division' | 'playoff' | 'eliminated' | 'alive';
export interface ScheduleModalDetail { teamName: string; schedule: TeamGame[] }
