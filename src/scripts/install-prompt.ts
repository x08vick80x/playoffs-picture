window.deferredPrompt = null;
window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    window.deferredPrompt = event;
    window.dispatchEvent(new Event('pwa-install-available'));
});
window.addEventListener('appinstalled', () => { window.deferredPrompt = null; });
