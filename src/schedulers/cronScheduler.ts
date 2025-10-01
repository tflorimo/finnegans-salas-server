import * as cron from 'node-cron';

export interface ScheduleConfig {
    name: string;
    cronExpression: string;
    task: () => Promise<void>;
    enabled: boolean;
}

class CronScheduler {
    private jobs: Map<string, cron.ScheduledTask> = new Map();
    
    schedule(config: ScheduleConfig) {
        if (!config.enabled) {
            console.log(`Job ${config.name} offline`);
            return;
        }
        
        const task = cron.schedule(config.cronExpression, async () => {
            console.log(`Ejecutando: ${config.name}`);
            try {
                await config.task();
                console.log(`Completado: ${config.name}`);
            } catch (error) {
                console.error(`Error en ${config.name}:`, error);
            }
        });
        
        this.jobs.set(config.name, task);
        task.start();
        console.log(`Job programado: ${config.name} (${config.cronExpression})`);
    }
    
    stopAll() {
        this.jobs.forEach((job, name) => {
            job.stop();
            console.log(`Job detenido: ${name}`);
        });
        this.jobs.clear();
    }
}

export default new CronScheduler();