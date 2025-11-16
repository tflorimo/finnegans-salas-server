import { Room } from "../models";
import { CheckInStatus } from "../dtos/eventDTO";
import eventService from "./eventService";
import roomService from "./roomService";
import currentEventService from "./currentEventService";
import checkInService from "./checkInService";

//Servicio para gestión de estados de salas y limpieza automática
class LocalStatusService {

    // Método principal para limpieza y actualización de estados de salas
    async cleanupRoomStatuses(): Promise<number> {
        const rooms = await roomService.getAllRoomModels();
        const now = new Date();
        let changesCount = 0;

        for (const room of rooms) {
            try {
                const changes = await this.processLocalStatus(room, now);
                changesCount += changes;
            } catch (error) {
                console.error(`[LocalStatusService] Error en sala ${room.email}:`, error);
            }
        }

        return changesCount;
    }

    private async processLocalStatus(room: Room, now: Date): Promise<number> {
        let changes = 0;
        let currentEventId = roomService.getCurrentEventId(room);
        const primaryEventId = await currentEventService.findActiveEvent(room.email, now);

        // Procesamiento de los estados de check-in de los eventos asociados a la sala
        await this.processCheckInEventStatuses(room);

        if (!primaryEventId && currentEventId) {
            const cleared = await roomService.clearRoom(room.email);

            if (cleared) {
                console.log(
                    `[LocalStatusService] ${room.name}: sin eventos activos → currentEvent limpiado (${currentEventId})`
                );
                changes++;

            } else {
                console.log(
                    `[LocalStatusService] ${room.name}: sin eventos activos → pero currentEvent ya estaba limpio`
                );
            }

            currentEventId = null;
        }

        let currentEventChanged = false;

        if (primaryEventId && primaryEventId !== currentEventId) {
            const updated = await roomService.updateRoomCurrentEvent(room.email, primaryEventId);

            if (updated) {
                console.log(
                    `[LocalStatusService] ${room.name}: currentEvent actualizado a ${primaryEventId}`
                );
                changes++;
                currentEventChanged = true;

                await roomService.reloadRoom(room);
                currentEventId = primaryEventId;
            }
        }

        let shouldBeBusy = false;

        if (primaryEventId) {
            const event = await eventService.getEventById(primaryEventId);

            if (event) {
                const isCheckedIn = event.checkInStatus === CheckInStatus.CHECKED_IN;
                const eventStart = new Date(event.startTime).getTime();
                const eventEnd = new Date(event.endTime).getTime();
                const nowTime = now.getTime();
                const isEventInProgress = nowTime >= eventStart && nowTime < eventEnd;

                shouldBeBusy = isCheckedIn && isEventInProgress;
            }

        } else {
            shouldBeBusy = false;
        }

        const currentBusyStatus = await roomService.getRoomBusyStatus(room.email);

        if (currentBusyStatus !== shouldBeBusy || currentEventChanged) {

            if (currentBusyStatus !== shouldBeBusy) {
                await roomService.updateRoomBusyStatus(room.email, shouldBeBusy);
                changes++;
            }

            if (shouldBeBusy) {
                // @LOG
                console.log(
                    `[LocalStatusService] ${room.name}: is_busy=true `
                    + `(sala ocupada - checkInStatus=CHECKED_IN, evento en curso)`
                );

            } else {
                if (!primaryEventId) {
                    console.log(
                        `[LocalStatusService] ${room.name}: is_busy=false (sin eventos activos)`
                    );
                } else {
                    // @LOG
                    console.log(
                        `[LocalStatusService] ${room.name}: is_busy=false (evento sin check-in o fuera de horario)`
                    );
                }
            }
        }

        return changes;
    }

    private async processCheckInEventStatuses(room: Room): Promise<void> {
        const events = await eventService.getEventsByRoomId(room.email);

        for (const event of events) {
            const newStatus = checkInService.determineCheckInStatus(
                event.startTime,
                event.endTime,
                event.checkInStatus
            );

            if (newStatus !== event.checkInStatus) {
                await eventService.updateEventCheckInStatus(event.id, newStatus);

                if (newStatus === CheckInStatus.EXPIRED) {
                    // @LOG
                    console.log(
                        `[CheckInService] CheckIn expirado del evento ${event.id}` +
                        `\nen sala (${room.email})`
                    );
                }
            }

        }
    }
}

export default new LocalStatusService();
