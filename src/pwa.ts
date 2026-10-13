import { registerSW } from 'virtual:pwa-register';

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
