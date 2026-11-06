export function initHeader(): void {
    const root = document.documentElement;
    const toggle = document.querySelector<HTMLButtonElement>(".theme-toggle");
    const themeColor = document.querySelector('meta[name="theme-color"]');
    const THEME_COLORS = { dark: "#252525", light: "#eef1f8" } as const;

    function syncToggle() {
        const isLight = root.dataset.theme === "light";
        toggle?.setAttribute("aria-label", isLight ? "Switch to dark theme" : "Switch to light theme");
        themeColor?.setAttribute("content", isLight ? THEME_COLORS.light : THEME_COLORS.dark);
    }

    toggle?.addEventListener("click", () => {
        const next = root.dataset.theme === "light" ? "dark" : "light";
        root.dataset.theme = next;
        try {
            localStorage.setItem("nfl-theme", next);
        } catch {
            // Storage can be unavailable (private mode); the choice then lasts for the session only.
        }
        syncToggle();
    });

    syncToggle();

    const nav = document.querySelector<HTMLElement>(".main-nav");
    const navLinks = Array.from(
        document.querySelectorAll<HTMLAnchorElement>('.main-nav__link[href^="#"]'),
    );
    // Just under the sticky header.
    const SPY_OFFSET = 140;

    function updateActiveLink() {
        let current: HTMLAnchorElement | null = null;
        for (const link of navLinks) {
            const target = document.querySelector(link.getAttribute("href") ?? "");
            const rect = target?.getBoundingClientRect();
            if (rect && rect.height > 0 && rect.top <= SPY_OFFSET) current = link;
        }
        const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
        if (atBottom) current = navLinks[navLinks.length - 1] ?? current;
        for (const link of navLinks) {
            if (link === current) link.setAttribute("aria-current", "true");
            else link.removeAttribute("aria-current");
        }
        if (current && nav && nav.scrollWidth > nav.clientWidth) {
            nav.scrollLeft = current.offsetLeft - (nav.clientWidth - current.offsetWidth) / 2;
        }
    }

    let spyFrame = 0;
    window.addEventListener(
        "scroll",
        () => {
            cancelAnimationFrame(spyFrame);
            spyFrame = requestAnimationFrame(updateActiveLink);
        },
        { passive: true },
    );
    updateActiveLink();
}
