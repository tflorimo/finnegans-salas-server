import { Room, Event } from "../models";
import { CheckInStatus } from "../dtos/eventDTO";
import eventService from "./eventService";
import roomService from "./roomService";
import currentEventService from "./currentEventService";
import overlapSyncService from "./overlapSyncService";
import checkInSyncService from "./checkInSyncService";

// Servicio para gestión de estados de salas y limpieza automática
class LocalStatusService {

    // Método principal para limpieza y actualización de estados de salas y eventos
    async cleanupLocalStatuses(): Promise<number> {
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
                console.log(
                    `► [LocalStatusService] Evento en curso actualizado:` +
                    `\n  id sala: ${room.email}` +
                    `\n  nombre sala: ${room.name || "Sin nombre"}` +
                    `\n  Nuevo evento en curso:` +
                    `\n  id evento: ${newCurrentEventId}` +
                    `\n  nombre evento: ${eventChanged?.title || "Sin nombre"}`
                );

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
                    console.log(
                        `► [LocalStatusService] sala sin eventos activos:` +
                        `\n  id sala: ${room.email}` +
                        `\n  nombre sala: ${room.name || "Sin nombre"}` +
                        `\n  estado sala: is_busy=false` +
                        `\n  currentEvent limpiado:` +
                        `\n  id evento: ${originalCurrentEventId}`
                    );

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

            if (shouldBeBusy) {
                console.log(
                    `► [LocalStatusService] sala ocupada:` +
                    `\n  id sala: ${room.email}` +
                    `\n  nombre sala: ${room.name || "Sin nombre"}` +
                    `\n  estado sala: is_busy=true` +
                    `\n  El evento se encuentra en curso` +
                    `\n  id evento: ${newCurrentEventId}` +
                    `\n  nombre evento: ${eventChanged?.title || "Sin nombre"}` +
                    `\n  checkInStatus=${eventChanged?.checkInStatus || "Desconocido"}`
                );
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
