import { Room, Event } from "../models";
import { JobLocal } from "../schedulers/cronSetup";

/**
 * Job local que limpia y actualiza el estado de las salas según eventos activos
 * Se ejecuta cada minuto para mantener sincronizado el estado is_busy de las rooms
 */
export class SyncLocalRoomResourcesJob implements JobLocal {
    
    /**
     * Limpia y actualiza el estado de las salas cada minuto
     * Lógica:
     * - Si el evento tiene checkedIn=true Y date.now está entre startTime y endTime → is_busy=true
     * - Si date.now >= endTime → limpiar current_event, is_busy=false, checkedIn=false
     */
    async execute(): Promise<void> {
        try {
            console.log('[SyncLocalRoomResources] Iniciando limpieza de salas...');
            const rooms = await Room.findAll();
            const now = new Date();

            for (const room of rooms) {
                try {
                    const currentEventId = room.get('current_event') as string | null;

                    // Si no hay evento, asegurar que no esté ocupada
                    if (!currentEventId) {
                        if (room.get('is_busy')) {
                            await room.update({ is_busy: false });
                            console.log(`[SyncLocalRoomResources] ${room.name}: liberada (sin evento)`);
                        }
                        continue;
                    }

                    // Buscar el evento
                    const event = await Event.findByPk(currentEventId);

                    if (!event) {
                        console.warn(`[SyncLocalRoomResources] ${room.name}: evento fantasma ${currentEventId}`);
                        await room.update({ current_event: null, is_busy: false });
                        continue;
                    }

                    const startTime = new Date(event.get('startTime') as Date);
                    const endTime = new Date(event.get('endTime') as Date);
                    const checkedIn = event.get('checkedIn') as boolean;

                    console.log(`[SyncLocalRoomResources] ${room.name}: now=${now.toISOString()}, start=${startTime.toISOString()}, end=${endTime.toISOString()}, checkedIn=${checkedIn}`);

                    // Si el evento ya terminó (now >= endTime)
                    if (now >= endTime) {
                        console.log(`[SyncLocalRoomResources] ${room.name}: evento terminado, limpiando...`);
                        
                        // Limpiar la sala
                        await room.update({ 
                            current_event: null, 
                            is_busy: false 
                        });
                        
                        // Marcar evento como no checkeado
                        if (checkedIn) {
                            await event.update({ checkedIn: false });
                        }
                        
                        console.log(`[SyncLocalRoomResources] ${room.name}: limpiada (evento terminado)`);
                        continue;
                    }

                    // Si el evento está activo (now >= startTime && now < endTime)
                    if (now >= startTime && now < endTime) {
                        // Ocupada solo si tiene checkedIn=true
                        const shouldBeBusy = checkedIn === true;
                        
                        if (room.get('is_busy') !== shouldBeBusy) {
                            await room.update({ is_busy: shouldBeBusy });
                            console.log(`[SyncLocalRoomResources] ${room.name}: is_busy=${shouldBeBusy} (evento activo, checkedIn=${checkedIn})`);
                        }
                    } else {
                        // El evento aún no ha comenzado
                        if (room.get('is_busy')) {
                            await room.update({ is_busy: false });
                            console.log(`[SyncLocalRoomResources] ${room.name}: is_busy=false (evento no iniciado)`);
                        }
                    }

                } catch (error) {
                    console.error(`[SyncLocalRoomResources] Error en sala ${room.email}:`, error);
                }
            }

            console.log('[SyncLocalRoomResources] Limpieza completada');
        } catch (error) {
            console.error('[SyncLocalRoomResources] Error global:', error);
        }
    }
}
