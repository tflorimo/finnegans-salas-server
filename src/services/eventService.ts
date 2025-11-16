import { Event, Room } from "../models";
import { EventDTOResponse, CheckInStatus, EventCheckInDTO, OverlapStatus } from "../dtos/eventDTO";
import { Attendee } from "../models/event.types";
import { mapEventToResponseDTO } from "../utils/mappers/eventMapper";
import { getRemainingWeekRange } from "../utils/dateUtils";
import userService from "./userService";
import { Op } from "sequelize";

const UNKNOWN_USER_NAME = "Usuario desconocido";
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

    // Para el frontend: eventos de la semana actual
    async getEventsByRoomId(roomId: string): Promise<EventDTOResponse[]> {
        const { start, end } = getRemainingWeekRange();

        const eventos = await Event.findAll({
            where: {
                roomEmail: roomId,
                startTime: { [Op.lt]: end },    // Para eventos entre ayer y hoy)
                endTime: { [Op.gt]: start }
            },
            include: [{ model: Room, as: "room", attributes: ["name"] }],
            paranoid: true,
        });

        return this.mapWithCreatorNamesAndOverlap(eventos);
    }

    // Para el sync local: eventos activos en la semana actual
    async getActiveEventsByRoomId(roomId: string): Promise<Event[]> {
        const { start, end } = getRemainingWeekRange();

        return Event.findAll({
            where: {
                roomEmail: roomId,
                startTime: { [Op.lte]: end },
                endTime: { [Op.gte]: start }
            },
            paranoid: true,
        });
    }

    async upsertEvent(event: EventCheckInDTO): Promise<void> {

        const hasRoomResource = event.attendees.some(attendee => attendee.resource);

        if (!hasRoomResource) {
            console.log(
                `El evento con id "${event.id}" no tiene asistentes que sean salas, no se guardará.`
            );
            return;
        }

        await Event.upsert(event);
    }

    // Marca un evento como eliminado (soft delete)
    async softDeleteEvent(eventId: string): Promise<void> {
        const event = await Event.findByPk(eventId);
        if (event) {
            await event.destroy();
        }
    }

    async restoreEvent(eventId: string): Promise<void> {
        await Event.restore({ where: { id: eventId } });
        // @LOG
        console.log(`[EventService] Evento ${eventId} restaurado`);
    }

    async reloadEvent(event: Event): Promise<void> {
        await event.reload();
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

    async updateScheduleUpdatedAt(eventId: string, date: Date): Promise<void> {
        await Event.update(
            { scheduleUpdatedAt: date },
            { where: { id: eventId } }
        );
    }

    async setEventOverlapStatus(eventId: string, newStatus: OverlapStatus): Promise<boolean> {
        const event = await Event.findByPk(eventId);
        if (!event) return false;

        // Si ya tiene ese mismo status, no hago nada
        if (event.overlapStatus === newStatus) {
            return false;
        }

        await Event.update(
            { overlapStatus: newStatus },
            {
                where: { id: eventId },
                silent: true
            }
        );

        return true;
    }

    private async getOverlapStatus(eventId: string): Promise<OverlapStatus | null> {
        const event = await Event.findByPk(eventId);
        return event ? event.overlapStatus : null;
    }

    getEventCheckInStatus(event: Event): CheckInStatus {
        return event.get('checkInStatus') as CheckInStatus;
    }

    getEventAttendees(event: Event): Attendee[] | null {
        return event.get('attendees') as Attendee[] | null;
    }

    getEventStartTime(event: Event): Date {
        return event.get('startTime') as Date;
    }

    getEventEndTime(event: Event): Date {
        return event.get('endTime') as Date;
    }

    // Helper compartido para los mappers
    private async buildCreatorMap(events: Event[]): Promise<Map<string, string>> {
        const uniqueCreatorEmails = [...new Set(events.map(event => event.creatorMail))];
        const creators = await userService.getUsersByEmails(uniqueCreatorEmails);

        return new Map(
            creators.map(user => [
                user.email,
                user.name || UNKNOWN_USER_NAME
            ])
        );
    }

    private async mapWithCreatorNames(events: Event[]): Promise<EventDTOResponse[]> {
        const creatorMap = await this.buildCreatorMap(events);

        return events.map(event => {
            const creatorName = creatorMap.get(event.creatorMail) || UNKNOWN_USER_NAME;
            return mapEventToResponseDTO(event, creatorName, event.overlapStatus);
        });
    }

    private async mapWithCreatorNamesAndOverlap(events: Event[]): Promise<EventDTOResponse[]> {
        const creatorMap = await this.buildCreatorMap(events);

        const eventDTOs = await Promise.all(
            events.map(async event => {
                const creatorName = creatorMap.get(event.creatorMail) || UNKNOWN_USER_NAME;

                return mapEventToResponseDTO(event, creatorName, event.overlapStatus);
            })
        );

        return eventDTOs;
    }
}

export default new EventService();