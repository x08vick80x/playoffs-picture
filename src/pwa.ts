import { registerSW } from 'virtual:pwa-register';

const currentVersion = document.querySelector<HTMLMetaElement>('meta[name="data-version"]')?.content;
let checkingData = false;

async function checkDataVersion() {
    if (!currentVersion || checkingData || !navigator.onLine || document.visibilityState !== 'visible') return;
    checkingData = true;
    try {
        const response = await fetch('/data-version.json', {
            cache: 'no-store',
            signal: AbortSignal.timeout(10000),
        });
        if (!response.ok) return;
        const { version } = await response.json();
        if (typeof version !== 'string' || !/^[a-f0-9]{64}$/.test(version) || version === currentVersion) return;

        // Prevent a reload loop if a rollout or slow network still serves old HTML.
        const retryKey = `data-refresh:${currentVersion}:${version}`;
        const previousAttempt = Number(sessionStorage.getItem(retryKey) || 0);
        if (Date.now() - previousAttempt < 60000) return;
        sessionStorage.setItem(retryKey, String(Date.now()));
        window.location.reload();
    } catch {
        // Keep the current page usable while offline or during a deployment.
    } finally {
        checkingData = false;
    }
}

void checkDataVersion();
document.addEventListener('visibilitychange', checkDataVersion);
window.addEventListener('online', checkDataVersion);
window.addEventListener('pageshow', checkDataVersion);
window.setInterval(checkDataVersion, 5 * 60 * 1000);

registerSW({
    immediate: true,
    onRegisteredSW(_url, registration) {
        if (!registration) return;

        let checking = false;
        const checkForUpdate = async () => {
            if (checking || !navigator.onLine || document.visibilityState !== 'visible') return;
            checking = true;
            try {
                await registration.update();
            } catch (error) {
                // Connectivity can disappear even when navigator.onLine is true.
                console.warn('Unable to check for a PWA update', error);
            } finally {
                checking = false;
            }
        };

        void checkForUpdate();
        document.addEventListener('visibilitychange', checkForUpdate);
        window.addEventListener('online', checkForUpdate);
        window.setInterval(checkForUpdate, 60 * 60 * 1000);
    },
});
