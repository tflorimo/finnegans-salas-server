import { Event, Room } from "../models";
import { EventDTO, EventDTOResponse, CheckInStatus } from "../dtos/eventDTO";
import { EventAttributes } from "../models/event.types";
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
        return Event.findByPk(id, { paranoid: false });
    }

    async getEventsByIds(ids: string[]): Promise<Event[]> {
        return Event.findAll({
            where: { id: ids },
            paranoid: true,
        });
    }

    async getEventsByRoomId(roomId: string): Promise<EventDTOResponse[]> {
        const eventos = await Event.findAll({
            where: { roomEmail: roomId },
            include: [{ model: Room, as: "room", attributes: ["name"] }],
        });

        const eventosDTO = await this.mapWithCreatorNamesAndOverlap(eventos);
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

        const hasRoomResource = eventValues.attendees.some(attendee => attendee.resource);

        if (!hasRoomResource) {
            console.log(
                `El evento con id "${eventDTO.id}" no tiene asistentes que sean salas, no se guardará.`
            );
            return;
        }

        await Event.upsert(eventValues);
    }

    /**
     * Determina el checkInStatus correcto para un evento según su tiempo:
     * - PENDING: si aún no pasaron 15 minutos desde el inicio
     * - EXPIRED: si ya pasaron más de 15 minutos desde el inicio sin check-in O si el evento ya terminó
     * - Preserva CHECKED_IN si ya se hizo check-in
     * - Permite re-evaluación para eventos promovidos de superpuestos
     */
    determineCheckInStatus(startTime: Date, endTime: Date, currentStatus?: CheckInStatus): CheckInStatus {
        const now = Date.now();
        const start = new Date(startTime).getTime();
        const end = new Date(endTime).getTime();
        const fifteenMinutesAfterStart = start + (15 * 60 * 1000);

        if (currentStatus === CheckInStatus.CHECKED_IN) {
            return CheckInStatus.CHECKED_IN;
        }
        if (now >= end) {
            return CheckInStatus.EXPIRED;
        }

        if (now < fifteenMinutesAfterStart) {
            return CheckInStatus.PENDING;
        }

        if (now > fifteenMinutesAfterStart) {
            return CheckInStatus.EXPIRED;
        }

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

    // Restaura un evento eliminado (deletedAt) -> Es por las dudas
    async restoreEvent(eventId: string): Promise<void> {
        await Event.restore({ where: { id: eventId } });
        console.log(`[EventService] Evento ${eventId} restaurado`);
    }

    /**
     * Determina si un evento puede recibir check-in:
     * - Hasta 10 minutos antes del startTime
     * - Hasta 15 minutos después del startTime
     */
    canCheckIn(startTime: Date, endTime: Date): { canCheckIn: boolean; reason?: string } {
        const now = Date.now();
        const start = new Date(startTime).getTime();
        const end = new Date(endTime).getTime();
        const tenMinutesBefore = start - (10 * 60 * 1000); 
        const fifteenMinutesAfter = start + (15 * 60 * 1000);

        if (now >= end) {
            return { canCheckIn: false, reason: "El evento ya ha terminado." };
        }

        if (now < tenMinutesBefore) {
            return {
                canCheckIn: false, reason: "Aún no puedes hacer check-in. Intenta 10 minutos antes del evento."
            };
        }

        if (now > fifteenMinutesAfter) {
            return {
                canCheckIn: false, reason: "El tiempo para hacer check-in ha expirado (15 min después del inicio)."
            };
        }

        return { canCheckIn: true };
    }

    async updateEventCheckInStatus(eventId: string, status: CheckInStatus): Promise<void> {

        await Event.update(
            { checkInStatus: status },
            {
                where: { id: eventId },
                silent: true
            }
        );
    }

    filterActiveEvents(events: Event[], now: Date): Event[] {
        return events.filter(event => {
            const eventStart = new Date(event.startTime).getTime();
            const eventEnd = new Date(event.endTime).getTime();
            const fifteenMinutesAfterStart = eventStart + (15 * 60 * 1000);
            const nowTime = now.getTime();

            if (nowTime < eventStart) {
                return false;
            }

            if (nowTime >= eventEnd) {
                return false;
            }

            if (nowTime > fifteenMinutesAfterStart && event.checkInStatus !== CheckInStatus.CHECKED_IN) {
                return false;
            }

            return true;
        });
    }

    // Marca un evento como superpuesto, actualizando su checkInStatus 
    sortEventsByPriority(events: Event[], now: Date): Event[] {
        return [...events].sort((a, b) => {
            const aModified = a.createdAt.getTime() !== a.updatedAt.getTime();
            const bModified = b.createdAt.getTime() !== b.updatedAt.getTime();
            const aStartTime = new Date(a.startTime).getTime();
            const bStartTime = new Date(b.startTime).getTime();
            const nowTime = now.getTime();

            if (aModified && !bModified) {
                if (nowTime >= bStartTime) {
                    return 1;
                }
                return -1;
            }

            if (!aModified && bModified) {
                if (nowTime >= aStartTime) {
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
    }

    async markAsOverlapping(eventId: string): Promise<boolean> {
        const event = await Event.findByPk(eventId);
        if (!event) return false;

        if (event.checkInStatus === CheckInStatus.EXPIRED) {
            return false;
        }

        const eventWasModified = event.createdAt.getTime() !== event.updatedAt.getTime();

        if (event.checkInStatus === CheckInStatus.CHECKED_IN && !eventWasModified) {
            return false;
        }

        await Event.update(
            { checkInStatus: CheckInStatus.EXPIRED },
            {
                where: { id: eventId },
                silent: true
            }
        );
        return true;
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

        const currentEvent = await Event.findByPk(eventId);
        if (!currentEvent) {
            return { isOverlapping: false, isPrimary: true };
        }

        const allEvents = [...overlaps, currentEvent];

        const now = new Date();
        const activeEvents = this.filterActiveEvents(allEvents, now);

        if (activeEvents.length === 0) {
            return { isOverlapping: true, isPrimary: false, primaryEventId: undefined };
        }

        const sortedEvents = this.sortEventsByPriority(activeEvents, now);
        const primaryEvent = sortedEvents[0];

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
            return mapEventToResponseDTO(event, creatorName, true);
        });
    }

    private async mapWithCreatorNamesAndOverlap(events: Event[]): Promise<EventDTOResponse[]> {

        const uniqueCreatorEmails = [...new Set(events.map(event => event.creatorMail))];
        const creators = await UserService.getUsersByEmails(uniqueCreatorEmails);
        const creatorMap = new Map(creators.map(user => [user.email, user.name || "Usuario desconocido"]));

        const eventDTOs = await Promise.all(events.map(async event => {
            const creatorName = creatorMap.get(event.creatorMail) || "Usuario desconocido";

            const overlapInfo = await this.checkEventOverlap(
                event.id,
                event.roomEmail,
                event.startTime,
                event.endTime
            );

            const isPrimary = !overlapInfo.isOverlapping || overlapInfo.isPrimary;

            return mapEventToResponseDTO(event, creatorName, isPrimary);
        }));

        return eventDTOs;
    }
}

export default new EventService();