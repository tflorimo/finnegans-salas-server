import { Room } from "../models";
import { CheckInStatus } from "../dtos/eventDTO";
import eventService from "./eventService";
import roomService from "./roomService";
import currentEventService from "./currentEventService";
import checkInService from "./checkInService";
import overlapService from "./overlapService";

//Servicio para gestión de estados de salas y limpieza automática
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
        let currentEventId = roomService.getCurrentEventId(room);
        const activeEvents = await currentEventService.findActiveEvents(room.email, now);
        const primaryEventId = activeEvents?.primaryEvent ? activeEvents.primaryEvent.id : null;
        const eventChanged = primaryEventId ? await eventService.getEventById(primaryEventId) : null;

        // Testea la superposición de eventos. Este método actualizará los estados de superposición.
        await overlapService.handleOverlappingEvents(activeEvents?.activeEvents, activeEvents?.primaryEvent);

        // Procesamiento de los estados de check-in de los eventos asociados a la sala
        await checkInService.processCheckInEventStatuses(room);

        if (!primaryEventId && currentEventId) {
            const cleared = await roomService.clearRoom(room.email);

            if (cleared) {
                // @LOG
                console.log(
                    `► [LocalStatusService] sala sin eventos activos:` +
                    `\n  id sala: ${room.email}` +
                    `\n  nombre sala: ${room.name || "Sin nombre"}` +
                    `\n  currentEvent limpiado:` +
                    `\n  id evento limpiado: ${currentEventId}`
                );

                changes++;

            } else {
                console.log(
                    `► [LocalStatusService] sala sin eventos activos:` +
                    `\n  id sala: ${room.email}` +
                    `\n  nombre sala: ${room.name || "Sin nombre"}` +
                    `\n  estado: currentEvent ya estaba limpio`
                );
            }

            currentEventId = null;
        }

        let currentEventChanged = false;

        if (primaryEventId && primaryEventId !== currentEventId) {
            const updated = await roomService.updateRoomCurrentEvent(room.email, primaryEventId);

            if (updated) {
                console.log(
                    `► [LocalStatusService] currentEvent actualizado:` +
                    `\n  id sala: ${room.email}` +
                    `\n  nombre sala: ${room.name || "Sin nombre"}` +
                    `\n  Nuevo currentEvent:` +
                    `\n  id evento: ${primaryEventId}` +
                    `\n  nombre evento: ${eventChanged?.title || "Sin nombre"}`
                );

                changes++;
                currentEventChanged = true;
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
                    `► [LocalStatusService] sala ocupada:` +
                    `\n  id sala: ${room.email}` +
                    `\n  nombre sala: ${room.name || "Sin nombre"}` +
                    `\n  estado sala: is_busy=true` +
                    `\n  El evento se encuentra en curso` +
                    `\n  id evento: ${primaryEventId}` +
                    `\n  nombre evento: ${eventChanged?.title || "Sin nombre"}` +
                    `\n  checkInStatus=${eventChanged?.checkInStatus || "Desconocido"}`
                );

            } else {
                if (!primaryEventId) {
                    console.log(
                        `► [LocalStatusService] sala sin eventos activos:` +
                        `\n  id: ${room.email}` +
                        `\n  nombre: ${room.name || "Sin nombre"}` +
                        `\n  estado: is_busy=false`
                    );
                }
            }
        }

        return changes;
    }
}

export default new LocalStatusService();
