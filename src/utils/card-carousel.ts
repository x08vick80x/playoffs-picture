// Behaviour only: the owner supplies the track, controls and card layout.
export function initCardCarousel(track: HTMLElement, previous: HTMLButtonElement, next: HTMLButtonElement) {
    function updateArrows() {
        previous.disabled = track.scrollLeft <= 1;
        next.disabled = track.scrollLeft + track.clientWidth >= track.scrollWidth - 1;
    }
    function scrollCards(direction: number) {
        const card = track.firstElementChild;
        if (!card) return;
        const step = card.getBoundingClientRect().width + (parseFloat(getComputedStyle(track).columnGap) || 0);
        track.scrollBy({ left: direction * step, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
    }
    previous.addEventListener('click', () => scrollCards(-1));
    next.addEventListener('click', () => scrollCards(1));
    track.addEventListener('scroll', updateArrows, { passive: true });
    track.addEventListener('keydown', event => {
        if (event.target !== track || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        if (event.key === 'Home' || event.key === 'End') track.scrollTo({ left: event.key === 'Home' ? 0 : track.scrollWidth });
        else scrollCards(event.key === 'ArrowLeft' ? -1 : 1);
    });
    new ResizeObserver(updateArrows).observe(track);

    return {
        reset() {
            track.scrollLeft = 0;
            updateArrows();
        },
    };
}
