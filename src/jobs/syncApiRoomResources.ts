import { JobRemoto } from '../schedulers/cronSetup';
import roomResourceSyncService from '../services/roomResourceSyncService';

export class SyncApiRoomResourcesJob implements JobRemoto {
    ADMIN_ACCOUNT_IMPERSONATE: string;

    constructor() {
        this.ADMIN_ACCOUNT_IMPERSONATE = process.env.ADMIN_EMAIL_FOR_SERVICE_ACCOUNT!;
    }

    async execute(): Promise<void> {
        try {
            await roomResourceSyncService.syncRoomResources(this.ADMIN_ACCOUNT_IMPERSONATE);
        } catch (error) {
            console.error(
                '[SyncApiRoomResourcesJob] Error global en sincronización de room resources:',
                (error as any)?.message || error
            );
        }
    }
}