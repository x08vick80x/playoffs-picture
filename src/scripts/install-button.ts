export function initInstallButton(): void {
    const installContainer =
        document.getElementById("install-container");
    const installBtn = document.getElementById("install-pwa");

    // Check if app is already installed/running in standalone mode
    const isStandalone = window.matchMedia(
        "(display-mode: standalone)",
    ).matches || navigator.standalone === true;

    if (isStandalone) {
        // Standalone: hide the installation prompt.
        if (installContainer) installContainer.hidden = true;
    } else {

        // Check if event already fired before this script ran
        if (window.deferredPrompt) {
            installContainer?.removeAttribute("hidden");
        }

        // Listen for event
        window.addEventListener("pwa-install-available", () => {
            installContainer?.removeAttribute("hidden");
        });
    }

    // Installing from a browser tab hides the prompt; My Teams opens in standalone.
    window.addEventListener("appinstalled", () => {
        installContainer?.setAttribute("hidden", "");
        window.deferredPrompt = null;
    });

    installBtn?.addEventListener("click", async () => {
        if (!window.deferredPrompt) return;

        // Show the install prompt
        window.deferredPrompt.prompt();

        // Wait for the user to respond to the prompt
        const { outcome } = await window.deferredPrompt.userChoice;
        console.log(
            `User response to the install prompt: ${outcome}`,
        );

        // We've used the prompt, and can't use it again, throw it away
        window.deferredPrompt = null;
        // UI update handled by appinstalled listener
    });
}
