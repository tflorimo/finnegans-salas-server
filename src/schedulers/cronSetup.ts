import cronScheduler from "./cronScheduler";

export const setupJobs = () => {

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
            // Lógica para borrar eventos sin checkin
            console.log('Borrando eventos sin checkin...');
        },
        enabled: true
    });
}