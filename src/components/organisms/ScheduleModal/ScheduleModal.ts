import { renderGameItem } from '@/components/molecules/GameItem/GameItem.ts';
import { getTeamId } from "@/utils/team-mapping.ts";

export function initScheduleModal(): void {
    const modal = document.getElementById("schedule-modal") as HTMLDialogElement | null;
    const closeBtn = document.getElementById("close-modal");
    const title = document.getElementById("modal-team-name");
    const logo = document.querySelector<SVGUseElement>("#modal-team-logo use");
    const count = document.getElementById("modal-games-left");
    const list = document.getElementById("schedule-list");

    // One delegated listener serves matchups and bubble/eliminated cards,
    // including clicks on their nested buttons and SVG logos.
    document.addEventListener("click", (event) => {
        if (!(event.target instanceof Element)) return;
        const trigger = event.target.closest<HTMLElement>(".team-card-trigger");
        if (!trigger) return;
        window.dispatchEvent(new CustomEvent("open-schedule-modal", {
            detail: {
                teamName: trigger.dataset.team,
                schedule: JSON.parse(trigger.dataset.schedule || "[]"),
            },
        }));
    });

    window.addEventListener("open-schedule-modal", (e) => {
        const { teamName, schedule } = e.detail;

        if (title) title.textContent = teamName;
        if (logo) logo.setAttribute("href", `/sprites.svg#${getTeamId(teamName)}`);
        if (count) {
            count.textContent = `${schedule.length} ${schedule.length === 1 ? "game" : "games"} left`;
        }

        if (list) {
            list.innerHTML = schedule.map((game, index) => renderGameItem(game, { next: index === 0 })).join('');
        }

        modal?.showModal();
    });

    closeBtn?.addEventListener("click", () => {
        closeModal();
    });

    modal?.addEventListener("click", (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });

    function closeModal() {
        if (!modal) return;
        modal.classList.add("modal--closing");
        modal.addEventListener(
            "animationend",
            () => {
                modal.classList.remove("modal--closing");
                modal.close();
            },
            { once: true },
        );
    }
}
