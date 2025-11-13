import { SyncCalendarEventsJob } from "../jobs/syncCalendarEvents";
import { SyncApiRoomResourcesJob } from "../jobs/syncApiRoomResources";
import { SyncLocalRoomResourcesJob } from "../jobs/syncLocalRoomResources";
import cronScheduler from "./cronScheduler";

export const setupJobs = () => {
    const syncApiRoomResourcesJob = new SyncApiRoomResourcesJob();
    const syncCalendarEvents = new SyncCalendarEventsJob();
    const syncLocalRoomResourcesJob = new SyncLocalRoomResourcesJob();

    cronScheduler.schedule({
        name: 'Chequeo y sincronización de room resources desde API de Google',
        cronExpression: '* * * * *', // Cada minuto -> @TODO: Cambiar a semana en producción
        task: async () => {
            await syncApiRoomResourcesJob.execute();
        },
        enabled: true
    });

    cronScheduler.schedule({
        name: 'Descarga de eventos de Calendar',
        cronExpression: '* * * * *', // Cada minuto 
        task: async () => {
            syncCalendarEvents.execute();
        },
        enabled: true
    });

    // Job de limpieza: actualiza estado de salas según eventos activos
    cronScheduler.schedule({
        name: 'Limpieza y actualización de estado de salas y eventos activos',
        cronExpression: '*/15 * * * * *', // Cada 15 segundos. TODO: Determinar en cuánto dejar para producción.
        task: async () => {
            await syncLocalRoomResourcesJob.execute();
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