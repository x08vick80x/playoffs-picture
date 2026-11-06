// Single page entry; implementations stay alongside their components.
import '@/scripts/install-prompt.ts';
import '@/pwa.ts';
import { initHeader } from '@/components/organisms/Header/Header.ts';
import { initLastUpdated } from '@/components/atoms/LastUpdated/LastUpdated.ts';
import { initBackToTop } from '@/components/atoms/BackToTop/BackToTop.ts';
import { initMyTeamsLoader } from '@/components/organisms/MyTeams/MyTeams.loader.ts';
import { initSeasonSchedule } from '@/components/organisms/SeasonSchedule/SeasonSchedule.ts';
import { initStandings } from '@/components/organisms/Standings/Standings.ts';
import { initScheduleModal } from '@/components/organisms/ScheduleModal/ScheduleModal.ts';
import { initRankings } from '@/components/molecules/RankingCard/RankingCard.ts';
import { initInstallButton } from '@/scripts/install-button.ts';

initHeader();
initLastUpdated();
initBackToTop();
initSeasonSchedule();
initStandings();
initScheduleModal();
initRankings();
initInstallButton();
initMyTeamsLoader();
