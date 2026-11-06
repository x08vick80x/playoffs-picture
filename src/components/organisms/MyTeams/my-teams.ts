import { getScheduleWeekNumber } from '@scraper/config.ts';
import { FAVORITES_KEY, readFavorites, saveFavorites } from '@/utils/favorites.ts';
import { loadMyTeams } from '@/utils/load-my-teams.ts';
import { initCardCarousel } from '@/utils/card-carousel.ts';
import { initFavoritesSelector } from '@/components/molecules/FavoritesSelector/FavoritesSelector.ts';
import { createFavoriteTeamCard } from '@/components/molecules/FavoriteTeamCard/FavoriteTeamCard.ts';
import styles from './my-teams-content.scss?inline';

// Astro hoists imported stylesheets into the page, even for a dynamic import.
// Inline the compiled CSS in this lazy module so browser tabs load neither.
const stylesheet = document.createElement('style');
stylesheet.textContent = styles;
document.head.append(stylesheet);

export async function initMyTeams() {
    const teams = await loadMyTeams();

    // The first visit can start before the service worker claims the page.
    // Cache only resources actually used in standalone, including that first visit.
    if ('serviceWorker' in navigator) {
        void navigator.serviceWorker.ready.then(async () => {
            if (!navigator.serviceWorker.controller) {
                await new Promise(resolve => navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true }));
            }
            await Promise.all([import.meta.url, '/my-teams.json'].map(async url => {
                if (!await caches.match(url)) await fetch(url);
            }));
        }).catch(() => { /* Offline caching may be unavailable in private browsing. */ });
    }

    const dashboard = document.querySelector<HTMLElement>('#mt-dashboard')!;
    const modal = document.querySelector<HTMLDialogElement>('#mt-selector-modal')!;
    const edit = document.querySelector<HTMLButtonElement>('#btn-edit-teams')!;
    const status = document.querySelector<HTMLElement>('#mt-status')!;
    const previous = document.querySelector<HTMLButtonElement>('#mt-previous')!;
    const next = document.querySelector<HTMLButtonElement>('#mt-next')!;
    let displayedWeek = getScheduleWeekNumber();
    const readKnownFavorites = () => readFavorites().filter(name => Object.hasOwn(teams, name));
    let favorites = readKnownFavorites();
    const carousel = initCardCarousel(dashboard, previous, next);
    const selector = initFavoritesSelector(modal, teams, selection => {
        favorites = selection;
        const saved = saveFavorites(favorites);
        renderDashboard();
        if (!saved) status.textContent = 'Your selection could not be saved on this device.';
        window.dispatchEvent(new Event('my-teams-updated'));
    });
    const openSelector = () => selector.open(favorites);

    function renderDashboard() {
        dashboard.replaceChildren();
        if (favorites.length === 0) {
            const item = document.createElement('li');
            item.className = 'my-teams__empty';
            const button = document.createElement('button');
            button.className = 'my-teams__empty-action';
            button.textContent = 'Select Teams +';
            button.addEventListener('click', openSelector);
            item.append(button);
            dashboard.append(item);
        } else {
            for (const name of favorites) {
                const item = document.createElement('li');
                item.className = 'my-teams__slide';
                item.append(createFavoriteTeamCard(name, teams[name], displayedWeek));
                dashboard.append(item);
            }
        }
        dashboard.hidden = false;
        document.querySelector<HTMLElement>('#mt-loading')!.hidden = true;
        carousel.reset();
        status.textContent = favorites.length ? `${favorites.length} favorite teams` : 'No favorite teams selected.';
    }

    edit.disabled = false;
    edit.addEventListener('click', openSelector);
    window.addEventListener('storage', event => {
        if (event.key !== FAVORITES_KEY && event.key !== null) return;
        favorites = readKnownFavorites();
        renderDashboard();
        window.dispatchEvent(new Event('my-teams-updated'));
    });

    function refreshWeek() {
        const week = getScheduleWeekNumber();
        if (week === displayedWeek) return;
        displayedWeek = week;
        renderDashboard();
    }
    window.addEventListener('pageshow', refreshWeek);
    window.addEventListener('focus', refreshWeek);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshWeek(); });
    window.setInterval(refreshWeek, 60_000);
    renderDashboard();
}
