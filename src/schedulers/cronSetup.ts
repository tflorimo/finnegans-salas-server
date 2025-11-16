import { SyncCalendarEventsJob } from "../jobs/syncCalendarEvents";
import { SyncApiRoomResourcesJob } from "../jobs/syncApiRoomResources";
import { SyncLocalResourcesJob } from "../jobs/syncLocalResources";
import cronScheduler from "./cronScheduler";

//@TODO: Agregar variables en .env para los tiempos de los cron jobs (para un manejo más sencillo)
export const setupJobs = () => {
    const syncApiRoomResourcesJob = new SyncApiRoomResourcesJob();
    const syncCalendarEvents = new SyncCalendarEventsJob();
    const syncLocalResourcesJob = new SyncLocalResourcesJob();

    cronScheduler.schedule({
        name: '[RoomResourcesSync]',
        cronExpression: '* * * * *', // Cada minuto -> @TODO: Cambiar a semana en producción
        task: async () => {
            await syncApiRoomResourcesJob.execute();
        },
        enabled: true
    });

    cronScheduler.schedule({
        name: '[CalendarEventsSync]',
        cronExpression: '* * * * *', // Cada minuto 
        task: async () => {
            await syncCalendarEvents.execute();
        },
        enabled: true
    });

    // Job de limpieza: actualiza estado de salas según eventos activos
    cronScheduler.schedule({
        name: '[LocalSyncResources]',
        cronExpression: '*/15 * * * * *', // Cada 15 segundos. @TODO: Determinar en cuánto dejar para producción.
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