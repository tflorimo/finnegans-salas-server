import { Room, Event } from "../models";
import { CheckInStatus } from "../dtos/eventDTO";
import EventService from "./eventService";
import RoomService from "./roomService";

/**
 * Servicio para gestión de estados de salas y limpieza automática
 * Maneja la sincronización entre eventos activos y el estado is_busy de las salas
 * Limpia y actualiza el estado de todas las salas según sus eventos activos
 * - PENDING → EXPIRED: si pasaron 15 min del startTime sin check-in
 * - CHECKED_IN: sala ocupada durante el evento
 * - EXPIRED: sala libre automáticamente
 * - Eventos terminados: limpiar sala y mantener CHECKED_IN
 * @returns Número de cambios realizados
 */

class RoomStatusService {

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

    // Procesa el estado de una sala individual según su currentEvent
    private async processRoomStatus(room: Room, now: Date): Promise<number> {
        let changes = 0;
        const currentEventId = room.get('current_event') as string | null;

        // Si no hay evento, asegurar que la sala esté libre
        if (!currentEventId) {
            if (room.get('is_busy')) {
                await RoomService.updateRoomBusyStatus(room.email, false);
                console.log(`[RoomStatusService] ${room.name}: liberada (sin evento)`);
                changes++;
            }
            return changes;
        }

        // Buscar el evento actual
        const event = await EventService.getEventById(currentEventId);

        // Si el evento no existe (fantasma), limpiar sala
        if (!event) {
            console.warn(`[RoomStatusService] ${room.name}: evento fantasma ${currentEventId}`);
            await RoomService.clearRoom(room.email);
            return changes + 1;
        }

        const startTime = new Date(event.get('startTime') as Date);
        const endTime = new Date(event.get('endTime') as Date);
        const checkInStatus = event.get('checkInStatus') as CheckInStatus;
        const fifteenMinutesAfterStart = new Date(startTime.getTime() + (15 * 60 * 1000));

        // Verificar si este evento es primario (no superpuesto)
        const overlapInfo = await EventService.checkEventOverlap(
            event.id,
            room.email,
            startTime,
            endTime
        );

        // Si el evento no es el primario (es superpuesto), no debe ser currentEvent
        if (overlapInfo.isOverlapping && !overlapInfo.isPrimary) {
            console.log(`[RoomStatusService] ${room.name}: evento ${event.id} es superpuesto, removiendo de currentEvent`);
            await RoomService.clearRoom(room.email);
            return changes + 1;
        }

        // Si el evento ya terminó (now >= endTime)
        if (now >= endTime) {
            console.log(`[RoomStatusService] ${room.name}: evento terminado, limpiando...`);
            await RoomService.clearRoom(room.email);
            return changes + 1;
        }

        // Si pasaron 15 min del startTime y sigue PENDING, marca como EXPIRED
        if (now > fifteenMinutesAfterStart && checkInStatus === CheckInStatus.PENDING) {
            await EventService.updateEventCheckInStatus(event.id, CheckInStatus.EXPIRED);
            await RoomService.clearRoom(room.email);
            console.log(`[RoomStatusService] ${room.name}: evento expirado (sin check-in a tiempo)`);
            return changes + 1;
        }

        // Si el evento está activo (now >= startTime && now < endTime)
        if (now >= startTime && now < endTime) {
            // Ocupada solo si tiene checkInStatus=CHECKED_IN
            const shouldBeBusy = checkInStatus === CheckInStatus.CHECKED_IN;

            if (room.get('is_busy') !== shouldBeBusy) {
                await RoomService.updateRoomBusyStatus(room.email, shouldBeBusy);
                console.log(`[RoomStatusService] ${room.name}: is_busy=${shouldBeBusy} (checkInStatus=${checkInStatus})`);
                changes++;
            }
        } else {
            // El evento aún no ha comenzado
            if (room.get('is_busy')) {
                await RoomService.updateRoomBusyStatus(room.email, false);
                console.log(`[RoomStatusService] ${room.name}: is_busy=false (evento no iniciado)`);
                changes++;
            }
        }

        return changes;
    }
}

export default new RoomStatusService();
