import { Room } from "../models";
import { CheckInStatus } from "../dtos/eventDTO";
import eventService from "./eventService";
import roomService from "./roomService";
import currentEventService from "./currentEventService";

//Servicio para gestión de estados de salas y limpieza automática
class RoomStatusService {

    // Caché de logs
    private logCache: Map<string, number> = new Map();
    private readonly LOG_TTL = 5 * 60 * 1000; // 5 minutos
    private readonly MAX_CACHE_SIZE = 1000;

    // Método principal para limpieza y actualización de estados de salas
    async cleanupRoomStatuses(): Promise<number> {
        const rooms = await roomService.getAllRoomModels();
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
        const currentEventId = roomService.getCurrentEventId(room);
        const primaryEventId = await currentEventService.findActiveEvent(room.email, now);

        if (!primaryEventId && currentEventId) {
            await roomService.clearRoom(room.email);
            console.log(`[RoomStatusService] ${room.name}: sin eventos activos, sala limpiada`);
            return 1;
        }

        let currentEventChanged = false;
        if (primaryEventId && primaryEventId !== currentEventId) {
            await roomService.updateRoomCurrentEvent(room.email, primaryEventId);

            if (this.shouldLog(`currentEvent:${room.email}:${primaryEventId}`)) {
                console.log(`[RoomStatusService] ${room.name}: currentEvent actualizado a ${primaryEventId}`);
            }
            changes++;
            currentEventChanged = true;

            await room.reload();
        }

        if (primaryEventId) {
            const event = await eventService.getEventById(primaryEventId);
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
                        await roomService.updateRoomBusyStatus(room.email, shouldBeBusy);
                        console.log(
                            `[RoomStatusService] ${room.name}: is_busy=${shouldBeBusy} ` +
                            `(checkInStatus=${event.checkInStatus}, inProgress=${isEventInProgress})`
                        );
                        changes++;
                    }
                }
            }

        } else if (room.get('is_busy')) {
            await roomService.updateRoomBusyStatus(room.email, false);
            console.log(`[RoomStatusService] ${room.name}: is_busy=false (sin eventos)`);
            changes++;
        }

        return changes;
    }

    shouldLog(key: string): boolean {
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

}

export default new RoomStatusService();
