import { google } from 'googleapis';
import path from 'path';
import { JobRemoto } from '../schedulers/cronSetup';

export class SyncCalendarEventsJob implements JobRemoto {

    ADMIN_ACCOUNT_IMPERSONATE: string;

    constructor() {
        this.ADMIN_ACCOUNT_IMPERSONATE = process.env.ADMIN_EMAIL_FOR_SERVICE_ACCOUNT!;
    }

    async execute(): Promise<void> {
    }

}