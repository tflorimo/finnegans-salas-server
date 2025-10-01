import { BorrarEventosJob } from "../jobs/borrarEventosJob";
import cronScheduler from "./cronScheduler";

export const setupJobs = () => {
    
    /**
     * @TODO
     * habilitar los jobs cuando esten probados o para testing
     */

    console.log('Jobs deshabilitados por ahora!!');
    return;
    console.log('Jobs programados...');
    const borrarEventos = new BorrarEventosJob();

    cronScheduler.schedule({
        name: 'Descarga de eventos de Calendar',
        cronExpression: '* * * * *', // Cada minuto
        task: async () => {
            // Lógica para descargar eventos de Calendar
            console.log('Descargando eventos de Calendar...');
        },
        enabled: true
    });

    cronScheduler.schedule({
        name: 'Borrado de eventos sin checkin',
        cronExpression: '*/10 * * * *', // Cada 10 minutos
        task: async () => {
            await borrarEventos.execute();
        },
        enabled: true
    });
}