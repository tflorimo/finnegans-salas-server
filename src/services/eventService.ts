import { Event, Room } from "../models";
import { EventDTO, EventDTOResponse, CheckInStatus } from "../dtos/eventDTO";
import { EventAttributes, Attendee } from "../models/event.types";
import { mapEventToResponseDTO } from "../utils/mappers/eventMapper";
import { getRemainingWeekRange } from "../utils/dateUtils";
import userService from "./userService";
import overlapService from "./overlapService";
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
                startTime: {
                    [Op.gte]: start,
                    [Op.lte]: end
                }
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

    // Marca un evento como eliminado (soft delete)
    async softDeleteEvent(eventId: string): Promise<void> {
        const event = await Event.findByPk(eventId);
        if (event) {
            await event.destroy();
        }
    }

    // Restaura un evento eliminado (deletedAt) 
    async restoreEvent(eventId: string): Promise<void> {
        await Event.restore({ where: { id: eventId } });
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

    async markEventAsOverlapping(eventId: string): Promise<boolean> {
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
            return mapEventToResponseDTO(event, creatorName, true);
        });
    }

    private async mapWithCreatorNamesAndOverlap(events: Event[]): Promise<EventDTOResponse[]> {
        const creatorMap = await this.buildCreatorMap(events);

        const eventDTOs = await Promise.all(
            events.map(async event => {
                const creatorName = creatorMap.get(event.creatorMail) || UNKNOWN_USER_NAME;

                const overlapInfo = await overlapService.checkEventOverlap(
                    event.id,
                    event.roomEmail,
                    event.startTime,
                    event.endTime
                );

                const isPrimary = !overlapInfo.isOverlapping || overlapInfo.isPrimary;

                return mapEventToResponseDTO(event, creatorName, isPrimary);
            })
        );

        return eventDTOs;
    }
}

export default new EventService();