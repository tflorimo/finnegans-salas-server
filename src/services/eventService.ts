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

        // Verificar que al menos un asistente sea una sala (resource)
        const hasRoomResource = eventValues.attendees.some(attendee => attendee.resource);
        if (!hasRoomResource) {
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

    /**
     * Determina el checkInStatus correcto para un evento según su tiempo:
     * - PENDING: si aún no pasaron 15 minutos desde el inicio
     * - EXPIRED: si ya pasaron más de 15 minutos desde el inicio sin check-in O si el evento ya terminó
     * - Preserva CHECKED_IN si ya se hizo check-in
     */
    determineCheckInStatus(startTime: Date, endTime: Date, currentStatus?: CheckInStatus): CheckInStatus {
        const now = Date.now();
        const start = new Date(startTime).getTime();
        const end = new Date(endTime).getTime();
        const fifteenMinutesAfterStart = start + (15 * 60 * 1000);

        // Si ya está CHECKED_IN, mantenerlo (para historial)
        if (currentStatus === CheckInStatus.CHECKED_IN) {
            return CheckInStatus.CHECKED_IN;
        }

        // Si el evento ya terminó y estaba PENDING, marcarlo como EXPIRED
        if (now >= end && currentStatus === CheckInStatus.PENDING) {
            return CheckInStatus.EXPIRED;
        }

        // Si ya pasaron más de 15 minutos desde el inicio, es EXPIRED
        if (now > fifteenMinutesAfterStart) {
            return CheckInStatus.EXPIRED;
        }

        // Si todavía está en la ventana de check-in, es PENDING
        return CheckInStatus.PENDING;
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

    async updateEventCheckInStatus(eventId: string, status: CheckInStatus): Promise<void> {
        await Event.update(
            { checkInStatus: status },
            { where: { id: eventId } }
        );
    }

    // Marca un evento como superpuesto, actualizando su checkInStatus y título
    async markAsOverlapping(eventId: string): Promise<void> {
        const event = await Event.findByPk(eventId);
        if (!event) return;

        let newTitle = event.title;
        if (!newTitle.includes('(Evento Superpuesto)')) {
            newTitle = `${newTitle} (Evento Superpuesto)`;
        }

        await Event.update(
            {
                checkInStatus: CheckInStatus.EXPIRED,
                title: newTitle
            },
            { where: { id: eventId } }
        );
    }

    // Limpia el marcador de superpuesto en el título del evento
    async cleanOverlappingMarker(eventId: string): Promise<boolean> {
        const event = await Event.findByPk(eventId);
        if (!event) return false;

        const cleanTitle = event.title.replace(' (Evento Superpuesto)', '');

        if (cleanTitle !== event.title) {
            await Event.update(
                { title: cleanTitle },
                { where: { id: eventId } }
            );
            return true;
        }

        return false;
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

        // El evento primario es el más antiguo (por createdAt), pero si está EXPIRED, pasa al siguiente
        const currentEvent = await Event.findByPk(eventId);
        if (!currentEvent) {
            return { isOverlapping: false, isPrimary: true };
        }

        const allEvents = [...overlaps, currentEvent];
        allEvents.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

        // Buscar el primer evento que NO esté EXPIRED
        let primaryEvent = allEvents.find(event => event.checkInStatus !== CheckInStatus.EXPIRED);

        // Si todos están EXPIRED, el primario es el más antiguo
        if (!primaryEvent) {
            primaryEvent = allEvents[0];
        }

        const isPrimary = primaryEvent.id === eventId;

        return {
            isOverlapping: true,
            isPrimary,
            primaryEventId: primaryEvent.id,
        };
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
}

export default new EventService();