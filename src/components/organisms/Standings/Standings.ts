import { FAVORITES_KEY, readFavorites } from '@/utils/favorites.ts';

export function initStandings(): void {
    document.querySelectorAll<HTMLElement>('[data-standings]').forEach(container => {
        const links = container.querySelectorAll<HTMLAnchorElement>('[data-standings-filter]');
        const panels = container.querySelectorAll<HTMLElement>('[data-standings-panel]');
        const mineLink = container.querySelector<HTMLAnchorElement>('[data-standings-filter="mine"]');
        const mineHost = container.querySelector<HTMLElement>('[data-standings-mine]');
        const leagueTable = container.querySelector<HTMLTableElement>('[data-standings-panel="league"] table');
        let current = 'divisions';

        function activate(filter: string) {
            if (filter === 'mine' && mineLink?.hidden) filter = 'divisions';
            current = filter;
            panels.forEach(panel => { panel.hidden = panel.dataset.standingsPanel !== filter; });
            links.forEach(link => {
                if (link.dataset.standingsFilter === filter) link.setAttribute('aria-current', 'true');
                else link.removeAttribute('aria-current');
            });
        }

        function syncFavorites() {
            const favorites = new Set(readFavorites());
            container.querySelectorAll<HTMLElement>('tr[data-team]').forEach(row => {
                row.classList.toggle('standings-table__row--favorite', favorites.has(row.dataset.team!));
            });

            if (mineHost && leagueTable) {
                const table = leagueTable.cloneNode(true) as HTMLTableElement;
                table.querySelector('caption')!.textContent = 'My Teams';
                table.querySelectorAll<HTMLElement>('tbody tr').forEach(row => {
                    if (!favorites.has(row.dataset.team!)) row.remove();
                });
                const hasFavorites = table.querySelector('tbody tr') !== null;
                mineHost.replaceChildren(...(hasFavorites ? [table] : []));
                if (mineLink) mineLink.hidden = !hasFavorites;
            }

            if (current === 'mine' && mineLink?.hidden) activate('divisions');
        }

        function syncHash() {
            const link = Array.from(links).find(link => link.hash === window.location.hash);
            activate(link?.dataset.standingsFilter || 'divisions');
        }

        links.forEach(link => link.addEventListener('click', event => {
            if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
            activate(link.dataset.standingsFilter!);
        }));
        window.addEventListener('hashchange', syncHash);
        window.addEventListener('my-teams-updated', syncFavorites);
        window.addEventListener('storage', event => { if (event.key === FAVORITES_KEY) syncFavorites(); });
        syncFavorites();
        syncHash();
    });
}
