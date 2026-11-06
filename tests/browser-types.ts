import type { ScheduleModalDetail } from '../src/types/football.ts';
export interface LayoutShift extends PerformanceEntry { value: number; hadRecentInput: boolean }
declare global {
    interface Window {
        __shifts: { value: number; time: number }[];
        __scheduleOpens: ScheduleModalDetail[];
        __scheduleShows: number;
    }
}
