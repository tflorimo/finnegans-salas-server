import { SyncCalendarEventsJob } from "../jobs/syncCalendarEvents";
import { SyncApiRoomResourcesJob } from "../jobs/syncApiRoomResources";
import { SyncLocalResourcesJob } from "../jobs/syncLocalResources";
import cronScheduler from "./cronScheduler";

export const setupJobs = () => {
    const syncApiRoomResourcesJob = new SyncApiRoomResourcesJob();
    const syncCalendarEvents = new SyncCalendarEventsJob();
    const syncLocalResourcesJob = new SyncLocalResourcesJob();

    cronScheduler.schedule({
        name: '[RoomResourcesSync]',
        cronExpression: process.env.CRON_ROOM_RESOURCES_SYNC || '0 0 */7 * *',
        task: async () => {
            await syncApiRoomResourcesJob.execute();
        },
        enabled: true
    });

    cronScheduler.schedule({
        name: '[CalendarEventsSync]',
        cronExpression: process.env.CRON_CALENDAR_EVENTS_SYNC || '* * * * *',
        task: async () => {
            await syncCalendarEvents.execute();
        },
        enabled: true
    });

    // Job de limpieza: actualiza estado de salas según eventos activos
    cronScheduler.schedule({
        name: '[LocalSyncResources]',
        cronExpression: process.env.CRON_LOCAL_RESOURCES_SYNC || '*/15 * * * * *',
        task: async () => {
            await syncLocalResourcesJob.execute();
        },
        enabled: true
    });
}

/**
 * Interfaz para todos los jobs remotos (que interactúan con Google APIs)
 * Obliga a cumplir el contrato de tener el método execute y la propiedad ADMIN_ACCOUNT_IMPERSONATE 
 * (la cuenta utilizada por el back para hablar con Google APIs)
 */
export interface JobRemoto {
    execute(): Promise<void>;
    ADMIN_ACCOUNT_IMPERSONATE: string;
}

/**
 * Interfaz para todos los jobs locales (que no interactúan con Google APIs)
 * Obliga a cumplir el contrato de tener el método execute
 */
export interface JobLocal {
    execute(): Promise<void>;
}