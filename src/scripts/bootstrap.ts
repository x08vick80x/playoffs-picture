// Self-contained: Astro serializes the compiled function into <head> so these
// attributes are set synchronously before the first paint, without a request.
export function initializeAppearance(): void {
    let theme: string | null = null;
    try { theme = localStorage.getItem('nfl-theme'); } catch { /* Storage may be unavailable. */ }
    if (theme !== 'light' && theme !== 'dark') {
        theme = matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    }
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.standalone = String(
        matchMedia('(display-mode: standalone)').matches || navigator.standalone === true,
    );
}
