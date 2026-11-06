/// <reference types="vite-plugin-pwa/info" />
import type { ScheduleModalDetail } from './types/football.ts';
interface InstallPromptEvent extends Event {
    prompt(): Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}
declare global {
    interface Navigator { standalone?: boolean }
    interface Window { deferredPrompt: InstallPromptEvent | null }
    interface WindowEventMap {
        'open-schedule-modal': CustomEvent<ScheduleModalDetail>;
        beforeinstallprompt: InstallPromptEvent;
    }
}
