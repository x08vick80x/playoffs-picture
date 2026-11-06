export function initBackToTop(): void {
    const button = document.querySelector<HTMLButtonElement>(".back-to-top");
    const SHOW_AFTER = 600;

    function sync() {
        if (!button) return;
        const visible = window.scrollY > SHOW_AFTER;
        if (visible === button.classList.contains("back-to-top--visible")) return;
        if (visible) {
            button.hidden = false;
            // Let the browser paint the hidden state first so the fade runs.
            requestAnimationFrame(() => button.classList.add("back-to-top--visible"));
        } else {
            button.classList.remove("back-to-top--visible");
        }
    }

    button?.addEventListener("transitionend", () => {
        if (!button.classList.contains("back-to-top--visible")) button.hidden = true;
    });

    button?.addEventListener("click", () => {
        window.scrollTo({ top: 0 });
        (document.querySelector(".header-logo") as HTMLElement | null)?.focus({ preventScroll: true });
    });

    window.addEventListener("scroll", sync, { passive: true });
    sync();
}
