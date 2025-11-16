import { JobRemoto } from '../schedulers/cronSetup';
import calendarSyncService from '../services/calendarSyncService';

export class SyncCalendarEventsJob implements JobRemoto {
    ADMIN_ACCOUNT_IMPERSONATE: string;

    constructor() {
        this.ADMIN_ACCOUNT_IMPERSONATE = process.env.ADMIN_EMAIL_FOR_SERVICE_ACCOUNT!;
    }

    async execute(): Promise<void> {
        try {
            await calendarSyncService.syncAllRoomsEvents(this.ADMIN_ACCOUNT_IMPERSONATE);
        } catch (error: any) {
            console.error(
                '[SyncCalendarEventsJob] Error global durante la sincronización de eventos:',
                error?.message || error
            );
        }
    }
}
