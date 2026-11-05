import { getTeamId } from '@/utils/team-mapping.js';
import { escapeHtml } from '@/utils/escape-html.js';

// Intrinsic SVG dimensions; the matching rem tokens live in _variables.scss.
export const logoSizes = { md: 40, lg: 55 };

/** Client-rendered counterpart of Logo.astro, using the same size contract. */
export function renderLogo(team, { size = 'md', className = '' } = {}) {
    const pixels = logoSizes[size];
    return `<svg class="team-logo team-logo--${escapeHtml(size)} ${escapeHtml(className)}" width="${pixels}" height="${pixels}" aria-hidden="true"><use href="/sprites.svg#${escapeHtml(getTeamId(team))}"></use></svg>`;
}
