import { SyncCalendarEventsJob } from '../jobs/syncCalendarEvents';

// @TODO: Este archivo se podría eliminar.
(async () => {
  try {
    const job = new SyncCalendarEventsJob();
    await job.execute();
    console.log('✅ Sincronización terminada.');
  } catch (error) {
    console.error('💥 Error ejecutando el job:', error);
  }
})();