import type { MyTeamsData } from '@/types/football.ts';
import { escapeHtml } from '@/utils/escape-html.ts';
import { renderLogo } from '@/components/atoms/Logo/Logo.ts';

// Selection is a draft until Save. Persistence belongs to the caller.
export function initFavoritesSelector(modal: HTMLDialogElement, teams: MyTeamsData, onSave: (names: string[]) => void) {
    const checklist = modal.querySelector<HTMLElement>('.selector-modal__grid')!;
    let selection = new Set<string>();

    modal.querySelector<HTMLButtonElement>('.selector-modal__close-btn')!.addEventListener('click', () => modal.close());
    modal.addEventListener('click', event => { if (event.target === modal) modal.close(); });
    modal.querySelector<HTMLButtonElement>('.selector-modal__save-btn')!.addEventListener('click', () => {
        onSave([...selection]);
        modal.close();
    });

    return {
        open(favorites: string[]) {
            selection = new Set(favorites);
            checklist.replaceChildren();
            for (const name of Object.keys(teams).sort()) {
                const team = teams[name];
                const button = document.createElement('button');
                button.type = 'button';
                button.className = 'select-card';
                button.setAttribute('aria-label', name);
                const update = () => {
                    button.classList.toggle('select-card--selected', selection.has(name));
                    button.setAttribute('aria-pressed', String(selection.has(name)));
                };
                update();
                button.innerHTML = `<span class="select-card__content">${renderLogo(team.id, { className: 'select-card__logo' })}<span class="select-card__abbr">${escapeHtml(team.abbr)}</span></span><span class="select-card__check" aria-hidden="true">✓</span>`;
                button.addEventListener('click', () => {
                    if (selection.has(name)) selection.delete(name);
                    else selection.add(name);
                    update();
                });
                checklist.append(button);
            }
            modal.showModal();
        },
    };
}
