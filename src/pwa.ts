import { registerSW } from 'virtual:pwa-register';

const currentVersion = document.querySelector<HTMLMetaElement>('meta[name="data-version"]')?.content;
let checkingData = false;
let notifiedVersion: string | null = null;

const toast = document.querySelector<HTMLElement>('.toast');

function showUpdateToast(message: string) {
    if (!toast) return;
    const text = toast.querySelector<HTMLElement>('.toast__text');
    if (text) text.textContent = message;
    toast.hidden = false;
}

toast?.querySelector('.toast__action')?.addEventListener('click', () => window.location.reload());
toast?.querySelector('.toast__close')?.addEventListener('click', () => { toast.hidden = true; });

if ('serviceWorker' in navigator) {
    // A controller change on a page that already had one means a new version took over.
    const hadController = Boolean(navigator.serviceWorker.controller);
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (hadController) showUpdateToast('New version available');
    });
}

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

        if (notifiedVersion === version) return;
        notifiedVersion = version;
        showUpdateToast('New data available');
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
