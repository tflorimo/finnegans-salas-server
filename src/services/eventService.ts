import { Event, Room } from "../models";
import { EventDTO, EventDTOResponse, CheckInStatus } from "../dtos/eventDTO";
import { EventAttributes } from "../models/event.types";
import roomService from "./roomService";
import { mapEventToResponseDTO } from "../utils/mappers/eventMapper";
import { filterEventsByWeek } from "../utils/dateUtils";
import UserService from "./userService";
class EventService {

    async getAllEvents(): Promise<EventDTOResponse[]> {
        const eventos = await Event.findAll({
            include: [{ model: Room, as: "room", attributes: ["name"] }],
            paranoid: false,
        });

        return this.mapWithCreatorNames(eventos);
    }

    async getEventById(id: string | null | undefined): Promise<Event | null> {
        if (!id) return null;
        return Event.findByPk(id, { paranoid: false }); // paranoid: false permite buscar también registros eliminados
    }

    async getEventsByRoomId(roomId: string): Promise<EventDTOResponse[]> {
        const eventos = await Event.findAll({
            where: { roomEmail: roomId },
            include: [{ model: Room, as: "room", attributes: ["name"] }],
        });

        const eventosDTO = await this.mapWithCreatorNames(eventos);
        return filterEventsByWeek(eventosDTO);
    }

    async mapEventToDTO(event: Event, creatorName: string): Promise<EventDTOResponse> {
        return mapEventToResponseDTO(event, creatorName);
    }

    async checkEventAttendeesForResource(event: EventAttributes): Promise<Boolean> {
        let roomResourceFound = false;
        for (const attendee of event.attendees) {
            if (attendee.resource) {
                roomResourceFound = true;
            }
        }
        return roomResourceFound;
    }

    async upsertEvent(eventDTO: EventDTO): Promise<void> {
        const eventValues: EventAttributes = {
            id: eventDTO.id,
            creatorMail: eventDTO.creatorMail,
            roomEmail: eventDTO.roomEmail,
            startTime: eventDTO.startTime,
            title: eventDTO.title || "(Sin Título)",
            endTime: eventDTO.endTime,
            checkInStatus: eventDTO.checkInStatus,
            attendees: eventDTO.attendees,
        }

        const debeGuardar = await this.checkEventAttendeesForResource(eventValues);
        if (!debeGuardar) {
            console.log(`El evento con id "${eventDTO.id}" no tiene asistentes que sean salas, no se guardará.`);
            return;
        }

        await Event.upsert(eventValues);

        const now = new Date();
        const startTime = new Date(eventDTO.startTime);
        const endTime = new Date(eventDTO.endTime);

        if (now >= startTime && now <= endTime) {
            const overlapInfo = await this.checkEventOverlap(
                eventDTO.id,
                eventDTO.roomEmail,
                startTime,
                endTime
            );

            // Solo asignar como currentEvent si es el evento primario
            if (!overlapInfo.isOverlapping || overlapInfo.isPrimary) {
                await roomService.updateRoomCurrentEvent(eventDTO.roomEmail, eventDTO.id);
            } else {
                console.log(`[EventService] Evento ${eventDTO.id} es superpuesto, no se asigna como currentEvent`);
            }
        }
    }

    private async mapWithCreatorNames(events: Event[]): Promise<EventDTOResponse[]> {

        const uniqueCreatorEmails = [...new Set(events.map(event => event.creatorMail))];
        const creators = await UserService.getUsersByEmails(uniqueCreatorEmails);
        const creatorMap = new Map(creators.map(user => [user.email, user.name || "Usuario desconocido"]));

        return events.map(event => {
            const creatorName = creatorMap.get(event.creatorMail) || "Usuario desconocido";
            return mapEventToResponseDTO(event, creatorName);
        });
    }

    /**
     * Determina el checkInStatus correcto para un evento según su tiempo:
     * - PENDING: si aún no pasaron 15 minutos desde el inicio
     * - EXPIRED: si ya pasaron más de 15 minutos desde el inicio sin check-in
     * - Preserva CHECKED_IN si ya se hizo check-in
     */
    determineCheckInStatus(startTime: Date, currentStatus?: CheckInStatus): CheckInStatus {
        const now = Date.now();
        const start = new Date(startTime).getTime();
        const fifteenMinutesAfterStart = start + (15 * 60 * 1000);

        // Si ya está CHECKED_IN, mantenerlo
        if (currentStatus === CheckInStatus.CHECKED_IN) {
            return CheckInStatus.CHECKED_IN;
        }

        // Si ya pasaron más de 15 minutos desde el inicio, es EXPIRED
        if (now > fifteenMinutesAfterStart) {
            return CheckInStatus.EXPIRED;
        }

        // Si todavía está en la ventana de check-in, es PENDING
        return CheckInStatus.PENDING;
    }

    // Actualiza el checkInStatus de un evento según la lógica temporal:
    async updateCheckInStatusByTime(event: EventAttributes): Promise<void> {
        const newStatus = this.determineCheckInStatus(event.startTime, event.checkInStatus);

        if (newStatus !== event.checkInStatus) {
            await Event.update(
                { checkInStatus: newStatus },
                { where: { id: event.id } }
            );
            console.log(`[EventService] Evento ${event.id} actualizado de ${event.checkInStatus} a ${newStatus}`);
        }
    }

    // Marca un evento como eliminado (soft delete)
    async softDeleteEvent(eventId: string): Promise<void> {
        const event = await Event.findByPk(eventId);
        if (event) {
            await event.destroy();
            console.log(`[EventService] Evento ${eventId} marcado como eliminado`);
        }
    }

    // Restaura un evento eliminado (deletedAt) -> Es por las cucas
    async restoreEvent(eventId: string): Promise<void> {
        await Event.restore({ where: { id: eventId } });
        console.log(`[EventService] Evento ${eventId} restaurado`);
    }

    /**
     * Determina si un evento puede recibir check-in:
     * - Hasta 30 minutos antes del startTime
     * - Hasta 15 minutos después del startTime
     */
    canCheckIn(startTime: Date): { canCheckIn: boolean; reason?: string } {
        const now = Date.now();
        const start = new Date(startTime).getTime();
        const thirtyMinutesBefore = start - (30 * 60 * 1000); // @TODO: modificar a gusto
        const fifteenMinutesAfter = start + (15 * 60 * 1000);

        if (now < thirtyMinutesBefore) {
            return { canCheckIn: false, reason: "Aún no puedes hacer check-in. Intenta 30 minutos antes del evento." };
        }

        if (now > fifteenMinutesAfter) {
            return { canCheckIn: false, reason: "El tiempo para hacer check-in ha expirado (15 min después del inicio)." };
        }

        return { canCheckIn: true };
    }

    // Verifica si dos eventos se superponen en el tiempo
    private eventsOverlap(event1Start: Date, event1End: Date, event2Start: Date, event2End: Date): boolean {
        const start1 = new Date(event1Start).getTime();
        const end1 = new Date(event1End).getTime();
        const start2 = new Date(event2Start).getTime();
        const end2 = new Date(event2End).getTime();

        return start1 < end2 && start2 < end1;
    }

    // Verifica si un evento está superpuesto con otros
    async checkEventOverlap(eventId: string, roomEmail: string, startTime: Date, endTime: Date): Promise<{
        isOverlapping: boolean;
        isPrimary: boolean;
        primaryEventId?: string;
    }> {
        const overlappingEvents = await Event.findAll({
            where: { roomEmail },
            paranoid: true,
        });

        const overlaps = overlappingEvents.filter(event =>
            event.id !== eventId &&
            this.eventsOverlap(startTime, endTime, event.startTime, event.endTime)
        );

        if (overlaps.length === 0) {
            return { isOverlapping: false, isPrimary: true };
        }

        // El evento primario es el más antiguo (por createdAt) y es el que predomina
        const currentEvent = await Event.findByPk(eventId);
        if (!currentEvent) {
            return { isOverlapping: false, isPrimary: true };
        }

        const allEvents = [...overlaps, currentEvent];
        allEvents.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

        const primaryEvent = allEvents[0];
        const isPrimary = primaryEvent.id === eventId;

        return {
            isOverlapping: true,
            isPrimary,
            primaryEventId: primaryEvent.id,
        };
    }
}

export default new EventService();