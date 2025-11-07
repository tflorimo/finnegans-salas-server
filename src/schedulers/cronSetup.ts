import { BorrarEventosJob } from "../jobs/borrarEventosJob";
import { SyncCalendarEventsJob } from "../jobs/syncCalendarEvents";
import cronScheduler from "./cronScheduler";

export const setupJobs = () => {
    const borrarEventos = new BorrarEventosJob();
    const syncCalendarEvents = new SyncCalendarEventsJob();

    cronScheduler.schedule({
        name: 'Descarga de eventos de Calendar',
        cronExpression: '* * * * *', // Cada minuto
        task: async () => {
            syncCalendarEvents.execute();
        },
        enabled: true
    });

    cronScheduler.schedule({
        name: 'Borrado de eventos sin checkin',
        cronExpression: '*/10 * * * *', // Cada 10 minutos
        task: async () => {
            await borrarEventos.execute();
        },
        enabled: false
    });

    cronScheduler.schedule({
        name: 'Chequeo y sincronización de room resources',
        cronExpression: '0 */1 * * *', // Cada 1 hora
        task: async () => {
            await borrarEventos.execute();
        },
        enabled: true
    });
}

/**
 * Interfaz para todos los jobs remotos (que interactúan con Google APIs)
 * Obliga a cumplir el contrato de tener el método execute y la propiedad ADMIN_ACCOUNT_IMPERSONATE (la cuenta utilizada por el back para hablar con Google APIs)
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