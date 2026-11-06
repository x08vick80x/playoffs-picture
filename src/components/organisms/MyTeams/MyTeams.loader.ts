export function initMyTeamsLoader(): void {
    const root = document.getElementById('my-teams-root')!;
    const media = matchMedia('(display-mode: standalone)');
    const retry = document.getElementById('mt-retry')!;
    const message = document.getElementById('mt-message')!;
    const skeleton = document.getElementById('mt-loading')!;
    const status = document.getElementById('mt-status')!;
    let initialized = false;
    let loading = false;

    async function activate() {
        const standalone = media.matches || navigator.standalone === true;
        document.documentElement.dataset.standalone = String(standalone);
        if (!standalone || initialized || loading) return;
        loading = true;
        root.setAttribute('aria-busy', 'true');
        skeleton.hidden = false;
        message.hidden = true;
        status.textContent = 'Loading favorite teams…';
        try {
            const { initMyTeams } = await import('./my-teams.ts');
            await initMyTeams();
            initialized = true;
        } catch {
            skeleton.hidden = true;
            message.hidden = false;
            retry.hidden = false;
            document.getElementById('mt-message-text')!.textContent = 'Favorite teams could not be loaded.';
            status.textContent = 'Favorite teams could not be loaded. Try again.';
        } finally {
            loading = false;
            root.setAttribute('aria-busy', 'false');
        }
    }

    retry.addEventListener('click', activate);
    media.addEventListener('change', activate);
    window.addEventListener('pageshow', activate);
    // Installing from a browser tab does not make that tab standalone.
    void activate();
}
