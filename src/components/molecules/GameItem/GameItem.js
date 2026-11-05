import { escapeHtml } from '@/utils/escape-html.js';
import { renderLogo } from '@/components/atoms/Logo/Logo.js';

// "Sunday, November 8" -> { day: "Sun", date: "Nov 8" }
function splitDate(value) {
    const [weekday, rest] = (value || '').split(', ');
    if (!rest) return null;
    const [month, dayNumber] = rest.split(' ');
    return { day: weekday.slice(0, 3), date: `${month.slice(0, 3)} ${dayNumber}` };
}

export function renderGameItem(game, { next = false } = {}) {
    const parts = splitDate(game.date);
    const when = parts
        ? `<span class="game-item__day">${escapeHtml(parts.day)}</span><span class="game-item__date">${escapeHtml(parts.date)}</span>`
        : `<span class="game-item__day">Week</span><span class="game-item__date">${escapeHtml(String(game.week).replace(/^REG/, ''))}</span>`;

    return `<div class="game-item${next ? ' game-item--next' : ''}">
        <div class="game-item__when">${when}</div>
        ${renderLogo(game.opponent, { className: 'game-item__logo' })}
        <div class="game-item__info">
            <span class="game-item__opp-name">${escapeHtml(game.opponent)}</span>
            <span class="game-item__meta">${game.location === 'vs' ? 'Home' : 'Away'}${game.time ? ` • ${escapeHtml(game.time)}` : ''}</span>
        </div>
        <span class="game-item__opp-record">${escapeHtml(game.opponentRecord || '??')}</span>
    </div>`;
}
