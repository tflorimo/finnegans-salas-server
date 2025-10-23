import { SyncRoomResourcesJob } from '../jobs/syncRoomResources';

(async () => {
  try {
    const job = new SyncRoomResourcesJob();
    await job.execute();
    console.log('✅ Sincronización terminada.');
  } catch (error) {
    console.error('💥 Error ejecutando el job:', error);
  }
})();