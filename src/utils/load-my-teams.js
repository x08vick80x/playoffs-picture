// Imported only by the standalone dashboard, never by the regular page.
export async function loadMyTeams() {
    const response = await fetch('/my-teams.json', { signal: AbortSignal.timeout(10_000) });
    if (!response.ok) throw new Error(`My Teams: ${response.status}`);
    const teams = await response.json();
    if (!teams || typeof teams !== 'object' || Array.isArray(teams) || !Object.keys(teams).length) {
        throw new Error('Invalid My Teams data');
    }
    return teams;
}
