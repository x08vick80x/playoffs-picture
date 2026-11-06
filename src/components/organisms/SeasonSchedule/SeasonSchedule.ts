import { getScheduleWeekNumber } from "@scraper/config.ts";
import { getTeamId } from "@/utils/team-mapping.ts";
import { FAVORITES_KEY, readFavorites } from '@/utils/favorites.ts';

export function initSeasonSchedule(): void {
    const tabsContainer = document.getElementById("week-tabs")!;
    const host = document.getElementById("schedule-week")!;
    const statusContainer = document.querySelector<HTMLElement>(".season-schedule__status")!;
    const statusText = statusContainer.querySelector<HTMLElement>("[data-schedule-status]")!;
    const retryButton = statusContainer.querySelector<HTMLButtonElement>(".season-schedule__retry")!;
    const tabs = Array.from(tabsContainer.querySelectorAll<HTMLButtonElement>(".season-schedule__tab"));
    const initialPanel = host.querySelector<HTMLElement>("[data-week-panel]");
    // Cache markup, not mounted panels: browsing all weeks must not grow the DOM.
    const panels = new Map<string, string>();
    if (initialPanel) panels.set(initialPanel.dataset.weekPanel!, initialPanel.outerHTML);
    const pending = new Map<string, Promise<string>>();
    let requestedWeek = initialPanel?.dataset.weekPanel || "";

    function highlightFavorites() {
        const favorites = new Set(readFavorites().map(team => getTeamId(team)));
        host.querySelectorAll<HTMLElement>(".schedule-row[data-home-team]").forEach(row => {
            const isFavorite = favorites.has(row.dataset.homeTeam!) || favorites.has(row.dataset.awayTeam!);
            row.classList.toggle("schedule-row--favorite", isFavorite);
        });
    }

    highlightFavorites();
    window.addEventListener("my-teams-updated", highlightFavorites);
    window.addEventListener("pageshow", highlightFavorites);
    window.addEventListener("storage", event => {
        if (event.key === FAVORITES_KEY || event.key === null) highlightFavorites();
    });

    function syncTabs(week: string) {
        tabs.forEach(tab => {
            const selected = tab.dataset.week === week;
            tab.classList.toggle("season-schedule__tab--active", selected);
            tab.setAttribute("aria-pressed", String(selected));
        });
    }

    async function loadWeek(week: string, url: string) {
        const cached = panels.get(week);
        if (cached !== undefined) return cached;
        let request = pending.get(week);
        if (!request) {
            request = (async () => {
                const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
                if (!response.ok) throw new Error(`Unable to load ${week}`);
                const html = await response.text();
                const template = document.createElement("template");
                template.innerHTML = html;
                const panel = template.content.querySelector<HTMLElement>(".season-schedule__panel");
                if (!panel || panel.dataset.weekPanel !== week) throw new Error("Invalid schedule response");
                panels.set(week, panel.outerHTML);
                return panel.outerHTML;
            })();
            pending.set(week, request);
        }
        try {
            return await request;
        } finally {
            pending.delete(week);
        }
    }

    function setLoading(loading: boolean) {
        host.setAttribute("aria-busy", String(loading));
        // Keep the current cards in flow so the skeleton has exactly their dimensions.
        host.querySelectorAll(".schedule-row").forEach(row => {
            row.classList.toggle("schedule-row--loading", loading);
        });
        statusContainer.classList.toggle("season-schedule__status--loading", loading);
    }

    async function selectWeek(week: string) {
        const tab = tabs.find(tab => tab.dataset.week === week);
        if (!tab?.dataset.url) return;
        requestedWeek = week;
        retryButton.hidden = true;
        statusContainer.hidden = true;
        if (host.querySelector<HTMLElement>("[data-week-panel]")?.dataset.weekPanel === week) {
            setLoading(false);
            syncTabs(week);
            return;
        }
        setLoading(true);
        statusText.textContent = `Loading Week ${week.replace("REG", "")}…`;
        statusContainer.hidden = false;
        try {
            const html = await loadWeek(week, tab.dataset.url);
            // A slower response must never replace a more recently selected week.
            if (requestedWeek !== week) return;
            host.innerHTML = html;
            highlightFavorites();
            syncTabs(week);
            statusContainer.hidden = true;
        } catch {
            if (requestedWeek !== week) return;
            // Keep the previous schedule and its active tab when loading fails.
            statusText.textContent = `Week ${week.replace("REG", "")} could not be loaded. Please try again.`;
            retryButton.hidden = false;
        } finally {
            if (requestedWeek === week) setLoading(false);
        }
    }

    retryButton.addEventListener("click", () => { void selectWeek(requestedWeek); });

    function centerTab(tab: HTMLElement, behavior: ScrollBehavior = 'smooth') {
        const containerBounds = tabsContainer.getBoundingClientRect();
        const tabBounds = tab.getBoundingClientRect();
        // Scroll only the tab strip: scrollIntoView also moves the page horizontally
        // and vertically, which can shift the calendar and a pending Retry click.
        tabsContainer.scrollTo({
            left: tabsContainer.scrollLeft + tabBounds.left - containerBounds.left -
                (tabsContainer.clientWidth - tabBounds.width) / 2,
            behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : behavior,
        });
    }

    // The cached page/build can precede the current week.
    void selectWeek(`REG${getScheduleWeekNumber()}`).then(() => {
        const activeTab = tabsContainer.querySelector<HTMLElement>(".season-schedule__tab--active");
        if (!activeTab) return;
        const containerBounds = tabsContainer.getBoundingClientRect();
        const tabBounds = activeTab.getBoundingClientRect();
        if (tabBounds.left < containerBounds.left || tabBounds.right > containerBounds.right) {
            centerTab(activeTab, 'instant');
        }
    });

    tabsContainer.addEventListener("click", (event) => {
        const button = (event.target as HTMLElement).closest<HTMLButtonElement>(".season-schedule__tab");
        if (!button?.dataset.week) return;
        void selectWeek(button.dataset.week);
        centerTab(button);
    });
}
