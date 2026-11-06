export function initRankings(): void {
    document.querySelectorAll('.ranking-item').forEach(item => {
        item.addEventListener('click', () => item.classList.toggle('ranking-item--expanded'));
    });
}
