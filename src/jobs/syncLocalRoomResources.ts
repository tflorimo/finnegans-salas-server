import { JobLocal } from "../schedulers/cronSetup";
import roomStatusService from "../services/roomSyncService";

/**
 * Job local que limpia y actualiza el estado de las salas según los eventos activos
 * Se ejecuta cada minuto para mantener sincronizado el estado is_busy de las rooms
 */
export class SyncLocalRoomResourcesJob implements JobLocal {

    async execute(): Promise<void> {
        try {
            const changesCount = await roomStatusService.cleanupRoomStatuses();

            if (changesCount > 0) {
                console.log(
                    `[SyncLocalRoomResources] Limpieza completada: ` +
                    `${changesCount} cambio(s) realizado(s)`);
            }
        } catch (error) {
            console.error('[SyncLocalRoomResources] Error global:', error);
        }
    }
}
