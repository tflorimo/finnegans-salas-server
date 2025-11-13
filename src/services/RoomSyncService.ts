import { Room, Event } from "../models";
import { CheckInStatus } from "../dtos/eventDTO";
import EventService from "./eventService";
import RoomService from "./roomService";

/**
 * Servicio para gestión de estados de salas y limpieza automática
 * - Sincronización entre eventos activos y el estado is_busy de las salas
 * - Detección y manejo de eventos superpuestos
 * - Selección de eventos primarios (currentEvent)
 * - Limpieza de eventos terminados/eliminados/expirados
 * - Actualización de checkInStatus según tiempo
 * @returns Número de cambios realizados
 */
class RoomStatusService {

    // Caché de logs
    private logCache: Map<string, number> = new Map();
    private readonly LOG_TTL = 5 * 60 * 1000; // 5 minutos
    private readonly MAX_CACHE_SIZE = 1000;
    private shouldLog(key: string): boolean {
        const lastLogged = this.logCache.get(key);
        const now = Date.now();

        if (!lastLogged || (now - lastLogged) > this.LOG_TTL) {
            this.logCache.set(key, now);
            this.cleanupCacheIfNeeded(now);
            return true;
        }

        return false;
    }

    private cleanupCacheIfNeeded(now: number): void {
        if (this.logCache.size > this.MAX_CACHE_SIZE) {
            for (const [key, timestamp] of this.logCache.entries()) {
                if ((now - timestamp) > this.LOG_TTL) {
                    this.logCache.delete(key);
                }
            }
        }
    }

    async cleanupRoomStatuses(): Promise<number> {
        const rooms = await RoomService.getAllRoomModels();
        const now = new Date();
        let changesCount = 0;

        for (const room of rooms) {
            try {
                const changes = await this.processRoomStatus(room, now);
                changesCount += changes;
            } catch (error) {
                console.error(`[RoomStatusService] Error en sala ${room.email}:`, error);
            }
        }

        return changesCount;
    }

    private async processRoomStatus(room: Room, now: Date): Promise<number> {
        let changes = 0;
        const currentEventId = room.get('current_event') as string | null;

        const primaryEventId = await this.findPrimaryEvent(room.email, now);

        if (!primaryEventId && currentEventId) {
            await RoomService.clearRoom(room.email);
            console.log(`[RoomStatusService] ${room.name}: sin eventos activos, sala limpiada`);
            return 1;
        }

        let currentEventChanged = false;
        if (primaryEventId && primaryEventId !== currentEventId) {
            await RoomService.updateRoomCurrentEvent(room.email, primaryEventId);

            if (this.shouldLog(`currentEvent:${room.email}:${primaryEventId}`)) {
                console.log(`[RoomStatusService] ${room.name}: currentEvent actualizado a ${primaryEventId}`);
            }
            changes++;
            currentEventChanged = true;

            await room.reload();
        }

        if (primaryEventId) {
            const event = await EventService.getEventById(primaryEventId);
            if (event) {
                const isCheckedIn = event.checkInStatus === CheckInStatus.CHECKED_IN;
                const eventStart = new Date(event.startTime).getTime();
                const eventEnd = new Date(event.endTime).getTime();
                const nowTime = now.getTime();
                const isEventInProgress = nowTime >= eventStart && nowTime < eventEnd;

                const shouldBeBusy = isCheckedIn && isEventInProgress;
                const currentBusyStatus = room.get('is_busy') as boolean;

                if (currentEventChanged || currentBusyStatus !== shouldBeBusy) {
                    if (currentBusyStatus !== shouldBeBusy) {
                        await RoomService.updateRoomBusyStatus(room.email, shouldBeBusy);
                        console.log(`[RoomStatusService] ${room.name}: is_busy=${shouldBeBusy} 
                                   (checkInStatus=${event.checkInStatus}, inProgress=${isEventInProgress})`);
                        changes++;
                    }
                }
            }
        } else if (room.get('is_busy')) {
            await RoomService.updateRoomBusyStatus(room.email, false);
            console.log(`[RoomStatusService] ${room.name}: is_busy=false (sin eventos)`);
            changes++;
        }

        return changes;
    }

    /**
     * Encuentra el evento primario actual de una sala
     * - Filtra eventos activos (en progreso, no terminados, no expirados)
     * - Detecta overlaps y selecciona el primario según reglas de prioridad
     * - Marca eventos superpuestos como EXPIRED
     */
    private async findPrimaryEvent(roomEmail: string, now: Date): Promise<string | null> {

        const allEvents = await Event.findAll({
            where: { roomEmail },
            paranoid: true,
        });

        if (allEvents.length === 0) return null;

        const eventsInProgress = allEvents.filter(event => {
            const start = new Date(event.startTime).getTime();
            const end = new Date(event.endTime).getTime();
            const nowTime = now.getTime();
            return nowTime >= start && nowTime < end;
        });

        if (eventsInProgress.length === 0) return null;

        if (eventsInProgress.length === 1) {
            return eventsInProgress[0].id;
        }

        // Múltiples eventos en progreso: determina el primario
        // Filtra eventos activos según las reglas de tiempo real
        const activeEvents = eventsInProgress.filter(event => {
            const eventStart = new Date(event.startTime).getTime();
            const eventEnd = new Date(event.endTime).getTime();
            const fifteenMinutesAfterStart = eventStart + (15 * 60 * 1000);

            if (now.getTime() < eventStart) {
                return false;
            }

            if (now.getTime() >= eventEnd) {
                return false;
            }

            if (now.getTime() > fifteenMinutesAfterStart && event.checkInStatus !== CheckInStatus.CHECKED_IN) {
                return false;
            }

            return true;
        });

        if (activeEvents.length === 0) return null;

        activeEvents.sort((a, b) => {
            const aModified = a.createdAt.getTime() !== a.updatedAt.getTime();
            const bModified = b.createdAt.getTime() !== b.updatedAt.getTime();
            const aStartTime = new Date(a.startTime).getTime();
            const bStartTime = new Date(b.startTime).getTime();

            if (aModified && !bModified) {
                if (now.getTime() >= bStartTime) {
                    return 1;
                }
                return -1;
            }

            if (!aModified && bModified) {
                if (now.getTime() >= aStartTime) {
                    return -1;
                }
                return 1;
            }

            const aEffectiveTime = aModified ? a.updatedAt.getTime() : a.createdAt.getTime();
            const bEffectiveTime = bModified ? b.updatedAt.getTime() : b.createdAt.getTime();

            if (aEffectiveTime !== bEffectiveTime) {
                return aEffectiveTime - bEffectiveTime;
            }

            if (aStartTime !== bStartTime) {
                return aStartTime - bStartTime;
            }

            return a.id.localeCompare(b.id);
        });

        const primaryEvent = activeEvents[0];

        if (primaryEvent.checkInStatus === CheckInStatus.EXPIRED) {
            const newStatus = EventService.determineCheckInStatus(
                primaryEvent.startTime,
                primaryEvent.endTime,
                CheckInStatus.EXPIRED
            );

            if (newStatus !== CheckInStatus.EXPIRED) {
                await EventService.updateEventCheckInStatus(primaryEvent.id, newStatus);
                console.log(`[RoomStatusService] Evento ${primaryEvent.id} promovido de EXPIRED a 
                           ${newStatus} (ahora es primario)`);
            }
        }

        const primaryWasModified = primaryEvent.createdAt.getTime() !== primaryEvent.updatedAt.getTime();

        for (const event of activeEvents) {
            if (event.id !== primaryEvent.id) {
                const eventWasModified = event.createdAt.getTime() !== event.updatedAt.getTime();
                const shouldMarkAsExpired = !primaryWasModified || eventWasModified;

                if (shouldMarkAsExpired) {
                    const wasMarked = await EventService.markAsOverlapping(event.id);

                    if (wasMarked && this.shouldLog(`overlap:${event.id}:${primaryEvent.id}`)) {
                        const reason = !primaryWasModified ? 'overlap original' : 'ambos modificados';
                        console.log(`[RoomStatusService] Evento ${event.id} marcado como superpuesto 
                                   (${reason}). Primario: ${primaryEvent.id}`);
                    }
                } else {
                    if (this.shouldLog(`unmodified:${event.id}:${primaryEvent.id}`)) {
                        console.log(`[RoomStatusService] Evento ${event.id} (NO modificado) 
                                    mantiene prioridad sobre primario modificado ${primaryEvent.id}`);
                    }
                }
            }
        }

        return primaryEvent.id;
    }
}

export default new RoomStatusService();
