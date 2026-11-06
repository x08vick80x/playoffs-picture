import type { Standings, PlayoffPicture, ScheduleData } from '@/types/football.ts';
import { readFileSync } from 'node:fs';
import { buildMyTeamsData } from '@/utils/my-teams-data.ts';

export const GET = () => {
    const read = <T>(name: string): T => JSON.parse(readFileSync(`./src/data/${name}.json`, 'utf8'));
    const data = buildMyTeamsData(read<Standings>('standings'), read<PlayoffPicture>('playoff-picture'), read<ScheduleData>('schedule').teamSchedules);
    return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } });
};
