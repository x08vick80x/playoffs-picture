import type { MyTeamsData } from '@/types/football.ts';
// Imported only by the standalone dashboard, never by the regular page.
export async function loadMyTeams(): Promise<MyTeamsData> {
    const response = await fetch('/my-teams.json', { signal: AbortSignal.timeout(10_000) });
    if (!response.ok) throw new Error(`My Teams: ${response.status}`);
    const teams: unknown = await response.json();
    if (!teams || typeof teams !== 'object' || Array.isArray(teams) || !Object.keys(teams).length) {
        throw new Error('Invalid My Teams data');
    }
    return teams as MyTeamsData;
}
