import { JobLocal } from "../schedulers/cronSetup";
import localStatusService from "../services/localSyncService";

// Job local dedicado a limpiar y actualizar el estado de las salas según los eventos activos.
export class SyncLocalResourcesJob implements JobLocal {
    async execute(): Promise<void> {
        try {
            const changesCount = await localStatusService.cleanupRoomStatuses();

            if (changesCount > 0) {
                console.log(
                    `[SyncLocalRoomResources] Limpieza completada: ` +
                    `${changesCount} cambio(s) realizado(s)`
                );
            }
        } catch (error) {
            console.error('[SyncLocalRoomResources] Error global:', error);
        }
    }
}