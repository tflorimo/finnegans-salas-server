import * as cron from 'node-cron';
import { formatDoneLog, formatOfflineLog, formatCronLog, formatStartLog } from '../utils/dateUtils';

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
            console.log(formatOfflineLog(config.name));
            return;
        }

        const task = cron.schedule(config.cronExpression, async () => {
            console.log(formatStartLog(config.name));

            const start = Date.now();

            try {
                await config.task();
                console.log(formatDoneLog(config.name, Date.now() - start));
            } catch (error) {
                console.error(`[ERROR] ${config.name}:`, error);
            }
        });

        this.jobs.set(config.name, task);
        task.start();
        console.log(formatCronLog(config.name, config.cronExpression));
    }

    stopAll() {
        this.jobs.forEach((job, name) => {
            job.stop();
            console.log(formatOfflineLog(name));
        });
        this.jobs.clear();
    }
}

export default new CronScheduler();