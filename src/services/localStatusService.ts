import { Room, Event } from "../models";
import { CheckInStatus } from "../constants/eventStatuses";
import eventService from "./eventService";
import roomService from "./roomService";
import currentEventService from "./currentEventService";
import overlapSyncService from "./overlapSyncService";
import checkInSyncService from "./checkInSyncService";

// Servicio para gestión de estados de salas y limpieza automática
class LocalStatusService {

    // Método principal para limpieza y actualización de estados de salas y eventos
    async cleanupLocalStatuses(): Promise<number> {
        try {
            const rooms = await roomService.getAllRoomModels();
            const now = new Date();
            let changesCount = 0;

            for (const room of rooms) {
                try {
                    const changes = await this.processLocalStatus(room, now);
                    changesCount += changes;
                } catch (error) {
                    console.error(
                        `► [LocalStatusService] error en sala:` +
                        `\n  id sala: ${room.email}` +
                        `\n  nombre sala: ${room.name || "Sin nombre"}` +
                        `\n  detalle del error:`,
                        error
                    );
                }
            }

            return changesCount;
        } catch (error) {
            console.error('[LocalStatusService] Error en limpieza de estados locales:', error);
            throw error;
        }
    }

    private async processLocalStatus(room: Room, now: Date): Promise<number> {
        let changes = 0;
        let originalCurrentEventId = roomService.getCurrentEventId(room);
        const activeEvents = await currentEventService.findActiveEvents(room.email, now);
        const newCurrentEventId = activeEvents?.primaryEvent ? activeEvents.primaryEvent.id : null;

        // Testea la superposición de eventos. Este método actualizará los estados de superposición.
        await overlapSyncService.syncOverlapForActiveEvents(activeEvents?.activeEvents, now);

        // Procesamiento de los estados de check-in de los eventos asociados a la sala
        await checkInSyncService.processCheckInEventsStatuses(room);

        const eventChanged = newCurrentEventId ? await eventService.getEventById(newCurrentEventId) : null;
        let currentEventChanged = false;

        if (newCurrentEventId && newCurrentEventId !== originalCurrentEventId) {
            const updated = await roomService.updateRoomCurrentEvent(room.email, newCurrentEventId);

            if (updated) {
                changes++;
                currentEventChanged = true;
            }
        }

        let shouldBeBusy = false;

        if (newCurrentEventId) {

            if (eventChanged) {
                shouldBeBusy = this.shouldRoomBeBusy(eventChanged, now);
            }

        } else {

            if (originalCurrentEventId) {
                const cleared = await roomService.clearRoom(room.email);

                if (cleared) {
                    changes++;
                }

                originalCurrentEventId = null;
            }
        }

        const currentBusyStatus = await roomService.getRoomBusyStatus(room.email);

        if (currentBusyStatus !== shouldBeBusy || currentEventChanged) {

            if (currentBusyStatus !== shouldBeBusy) {
                await roomService.updateRoomBusyStatus(room.email, shouldBeBusy);
                changes++;
            }
        }

        return changes;
    }

    private shouldRoomBeBusy(event: Event, now: Date): boolean {
        const isCheckedIn = event.checkInStatus === CheckInStatus.CHECKED_IN;

        const eventStart = new Date(event.startTime).getTime();
        const eventEnd = new Date(event.endTime).getTime();
        const nowTime = now.getTime();

        const isEventInProgress = nowTime >= eventStart && nowTime < eventEnd;

        return isCheckedIn && isEventInProgress;
    }
}

export default new LocalStatusService();
