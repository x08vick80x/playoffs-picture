import { readFileSync } from 'node:fs';
import { buildMyTeamsData } from '@/utils/my-teams-data.js';

export const GET = () => {
    const read = (name: string) => JSON.parse(readFileSync(`./src/data/${name}.json`, 'utf8'));
    const data = buildMyTeamsData(read('standings'), read('playoff-picture'), read('schedule').teamSchedules);
    return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } });
};
