import type { FavoriteTeam } from '@/types/football.ts';
import { escapeHtml } from '@/utils/escape-html.ts';
import { renderLogo } from '@/components/atoms/Logo/Logo.ts';

export function createFavoriteTeamCard(name: string, team: FavoriteTeam, currentWeek: number) {
    const schedule = team.schedule.filter(game => Number(game.week.replace(/^REG/, '')) >= currentWeek)
        .sort((a, b) => Number(a.week.replace(/^REG/, '')) - Number(b.week.replace(/^REG/, '')));
    const stats = { ...team, name, schedule, nextOpp: schedule[0],
        isInProjected: team.status === 'projected', isBubble: team.status === 'bubble',
        isEliminated: team.status === 'eliminated' };
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'favorite-team-card';
    card.setAttribute('aria-label', `${name}: view remaining schedule`);
    card.disabled = schedule.length === 0;
    card.addEventListener('click', () => window.dispatchEvent(new CustomEvent('open-schedule-modal', {
        detail: { teamName: name, schedule },
    })));
    let probModifier = "";
    let probDisplayText = stats.probability;

    if (stats.isInProjected) {
        probModifier = "favorite-team-card__prob-value--green";
    } else if (stats.isBubble) {
        probModifier = "favorite-team-card__prob-value--red";
    } else if (
        stats.isEliminated ||
        stats.probability === "0%" ||
        stats.probability === "0.0%"
    ) {
        probModifier = "favorite-team-card__prob-value--red";
        probDisplayText = "ELIMINATED";
    }

    let nextOppHtml = "";
    if (stats.nextOpp) {
        nextOppHtml = `
            <span class="favorite-team-card__next-opp-container">
                <span class="favorite-team-card__next-opp">nxt ${escapeHtml(stats.nextOpp.location)} ${escapeHtml(stats.nextOpp.opponent)}</span>
                ${stats.nextOpp.date ? `<span class="favorite-team-card__next-opp-date">${escapeHtml(stats.nextOpp.date)}${stats.nextOpp.time ? ` \u2022 ${escapeHtml(stats.nextOpp.time)}` : ""}</span>` : ""}
            </span>
        `;
    } else if (stats.isInProjected) {
        nextOppHtml = `<span class="favorite-team-card__next-opp">-</span>`;
    }

    const seedHtml = stats.seed
        ? `<span class="favorite-team-card__seed-badge">#${escapeHtml(stats.seed)}</span>`
        : "";

    // Power Ranking HTML
    let powerHtml = "";
    if (stats.powerRank) {
        let trendSymbol = stats.powerTrend || "";
        let trendClass = "";
        if (trendSymbol.startsWith("+")) {
            trendClass = "favorite-team-card__power-trend--up";
            trendSymbol = "▲ " + trendSymbol.substring(1);
        } else if (trendSymbol.startsWith("-")) {
            trendClass = "favorite-team-card__power-trend--down";
            trendSymbol = "▼ " + trendSymbol.substring(1);
        }
        if (trendSymbol === "0") trendSymbol = "-";

        powerHtml = `
            <span class="favorite-team-card__power-row">
                <span class="favorite-team-card__power-label">PWR</span>
                <span class="favorite-team-card__power-val">#${escapeHtml(stats.powerRank)}</span>
                <span class="favorite-team-card__power-trend ${trendClass}">${escapeHtml(trendSymbol)}</span>
            </span>
        `;
    }

    card.innerHTML = `
        <span class="favorite-team-card__top">
            <span class="favorite-team-card__info">
                ${renderLogo(stats.id, { size: 'lg' })}
                <span class="favorite-team-card__ident">
                    <span class="favorite-team-card__abbr">${escapeHtml(stats.abbr)}</span>
                    <span class="favorite-team-card__record">${escapeHtml(stats.record)} ${seedHtml}</span>
                </span>
            </span>
            ${
                probDisplayText !== "N/A"
                    ? `
                <span class="favorite-team-card__prob${probDisplayText === "ELIMINATED" ? " favorite-team-card__prob--eliminated" : ""}">
                    ${probDisplayText === "ELIMINATED" ? "" : '<span class="favorite-team-card__prob-label">PROB</span>'}
                    <span class="favorite-team-card__prob-value ${probModifier}">${escapeHtml(probDisplayText)}</span>
                </span>
             `
                    : ""
            }
        </span>

        <span class="favorite-team-card__bottom">
            ${powerHtml}
            ${nextOppHtml}
        </span>
    `;
    return card;
}
