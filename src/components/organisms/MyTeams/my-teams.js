import { getScheduleWeekNumber } from '@scraper/config.js';
import { createFavoriteTeamCard } from '@/components/molecules/FavoriteTeamCard/FavoriteTeamCard.js';
import styles from './my-teams-content.scss?inline';

// Astro hoists imported stylesheets into the page, even for a dynamic import.
// Inline the compiled CSS in this lazy module so browser tabs load neither.
const stylesheet = document.createElement('style');
stylesheet.textContent = styles;
document.head.append(stylesheet);

export async function initMyTeams() {
    const response = await fetch('/my-teams.json', { signal: AbortSignal.timeout(10_000) });
    if (!response.ok) throw new Error(`My Teams: ${response.status}`);
    const teams = await response.json();
    if (!teams || typeof teams !== 'object' || Array.isArray(teams) || !Object.keys(teams).length) {
        throw new Error('Invalid My Teams data');
    }

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

    const dashboard = document.getElementById('mt-dashboard');
    const modal = document.getElementById('mt-selector-modal');
    const checklist = document.getElementById('team-checklist');
    const edit = document.getElementById('btn-edit-teams');
    const status = document.getElementById('mt-status');
    const previous = document.getElementById('mt-previous');
    const next = document.getElementById('mt-next');
    const storageKey = 'nfl-favorites';
    let displayedWeek = getScheduleWeekNumber();
    const readFavorites = () => {
        try {
            const value = JSON.parse(localStorage.getItem(storageKey) || '[]');
            return Array.isArray(value) ? [...new Set(value.filter(name => typeof name === 'string' && Object.hasOwn(teams, name)))] : [];
        } catch { return []; }
    };
    let favorites = readFavorites();
    let selection = new Set(favorites);

    function updateArrows() {
        previous.disabled = dashboard.scrollLeft <= 1;
        next.disabled = dashboard.scrollLeft + dashboard.clientWidth >= dashboard.scrollWidth - 1;
    }
    function scrollCards(direction) {
        const card = dashboard.firstElementChild;
        if (!card) return;
        const step = card.getBoundingClientRect().width + parseFloat(getComputedStyle(dashboard).columnGap);
        dashboard.scrollBy({ left: direction * step, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
    }
    previous.addEventListener('click', () => scrollCards(-1));
    next.addEventListener('click', () => scrollCards(1));
    dashboard.addEventListener('scroll', updateArrows, { passive: true });
    dashboard.addEventListener('keydown', event => {
        if (event.target !== dashboard || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        if (event.key === 'Home' || event.key === 'End') dashboard.scrollTo({ left: event.key === 'Home' ? 0 : dashboard.scrollWidth });
        else scrollCards(event.key === 'ArrowLeft' ? -1 : 1);
    });
    new ResizeObserver(updateArrows).observe(dashboard);

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
        document.getElementById('mt-loading').hidden = true;
        dashboard.scrollLeft = 0;
        updateArrows();
        status.textContent = favorites.length ? `${favorites.length} favorite teams` : 'No favorite teams selected.';
    }

    function openSelector() {
        selection = new Set(favorites);
        checklist.replaceChildren();
        for (const name of Object.keys(teams).sort()) {
            const team = teams[name];
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'select-card';
            button.classList.toggle('select-card--selected', selection.has(name));
            button.setAttribute('aria-label', name);
            button.setAttribute('aria-pressed', String(selection.has(name)));
            button.innerHTML = `<span class="select-card__content"><svg class="select-card__logo" width="48" height="48" aria-hidden="true"><use href="/sprites.svg#${team.id}"></use></svg><span class="select-card__abbr">${team.abbr}</span></span><span class="select-card__check" aria-hidden="true">✓</span>`;
            button.addEventListener('click', () => {
                if (selection.has(name)) selection.delete(name);
                else selection.add(name);
                button.classList.toggle('select-card--selected', selection.has(name));
                button.setAttribute('aria-pressed', String(selection.has(name)));
            });
            checklist.append(button);
        }
        modal.showModal();
    }
    edit.disabled = false;
    edit.addEventListener('click', openSelector);
    document.getElementById('btn-close-modal').addEventListener('click', () => modal.close());
    modal.addEventListener('click', event => { if (event.target === modal) modal.close(); });
    document.getElementById('btn-save-teams').addEventListener('click', () => {
        favorites = [...selection];
        let saved = true;
        try { localStorage.setItem(storageKey, JSON.stringify(favorites)); } catch { saved = false; }
        renderDashboard();
        if (!saved) status.textContent = 'Your selection could not be saved on this device.';
        window.dispatchEvent(new Event('my-teams-updated'));
        modal.close();
    });
    window.addEventListener('storage', event => {
        if (event.key !== storageKey && event.key !== null) return;
        favorites = readFavorites();
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
