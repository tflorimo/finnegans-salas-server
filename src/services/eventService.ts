import { Op } from "sequelize";
import { CheckInStatus, OverlapStatus } from "../constants/eventStatuses";
import { EventCheckInDTO, EventDTOResponse, EventListItemDTO, EventListResponseDTO } from "../dtos/eventDTO";
import { InternalServerError } from "../errors/AppError";
import { Event, Room } from "../models";
import { Attendee } from "../models/event.types";
import { getRemainingWeekRange } from "../utils/dateUtils";
import { mapEventToListItem, mapEventToResponseDTO } from "../utils/mappers/eventMapper";
import { buildEventFilters, calculateOffset, calculateTotalPages, normalizePage, normalizePerPage } from "../utils/paginationUtils";
import auditService from "./auditService";
import roomService from "./roomService";
import userService from "./userService";

const UNKNOWN_USER_NAME = "Usuario desconocido";
class EventService {
    async getAllEvents(queryParams?: any): Promise<EventListResponseDTO> {
        try {
            const page = normalizePage(queryParams?.page);
            const perPage = normalizePerPage(queryParams?.perPage);
            const offset = calculateOffset(page, perPage);
            const where = buildEventFilters(queryParams);

            const result = await Event.findAndCountAll({
                where,
                paranoid: false,
                limit: perPage,
                offset,
                order: [['createdAt', 'DESC']],
            });

            const items = await this.enrichEventsWithRoomAndCreatorsNames(result.rows);

            return {
                items,
                total: result.count,
                page,
                perPage,
                totalPages: calculateTotalPages(result.count, perPage),
            };
        } catch (error) {
            console.error('[EventService] Error al obtener eventos:', error);
            throw new InternalServerError('Error al obtener eventos');
        }
    }

    async getEventById(id: string | null | undefined): Promise<Event | null> {
        try {
            if (!id) return null;
            return await Event.findByPk(id, { paranoid: false });
        } catch (error) {
            console.error(`[EventService] Error al obtener evento por ID: ${id}`, error);
            throw error;
        }
    }

    async getEventsByIds(ids: string[]): Promise<Event[]> {
        try {
            return await Event.findAll({
                where: { id: ids },
                paranoid: true,
            });
        } catch (error) {
            console.error('[EventService] Error al obtener eventos por IDs:', error);
            throw error;
        }
    }

    // Para el frontend: eventos de la semana actual
    async getEventsByRoomId(roomId: string): Promise<EventDTOResponse[]> {
        try {
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
        } catch (error) {
            console.error(`[EventService] Error al obtener eventos por sala: ${roomId}`, error);
            throw error;
        }
    }

    // Para el sync local: eventos activos en la semana actual
    async getActiveEventsByRoomId(roomId: string): Promise<Event[]> {
        try {
            const { start, end } = getRemainingWeekRange();

            return await Event.findAll({
                where: {
                    roomEmail: roomId,
                    startTime: { [Op.lte]: end },
                    endTime: { [Op.gte]: start }
                },
                paranoid: true,
            });
        } catch (error) {
            console.error(`[EventService] Error al obtener eventos activos por sala: ${roomId}`, error);
            throw error;
        }
    }

    async getEventsByRoomIdWithTimeRange(roomId: string, startTime: Date, endTime: Date): Promise<Event[]> {
        try {
            return await Event.findAll({
                where: {
                    roomEmail: roomId,
                    startTime: { [Op.lt]: endTime },
                    endTime: { [Op.gt]: startTime }
                },
                paranoid: true,
            });
        } catch (error) {
            console.error(`[EventService] Error al obtener eventos por sala y rango de tiempo: ${roomId}`, error);
            throw error;
        }
    }

    async upsertEvent(event: EventCheckInDTO): Promise<void> {
        try {
            const hasRoomResource = event.attendees.some(attendee => attendee.resource);

            if (!hasRoomResource) {
                return;
            }

            const existingEvent = await Event.findByPk(event.id);
            const isCreation = !existingEvent;

            await Event.upsert(event);

            if (isCreation) {
                const room = await roomService.fetchRoom(event.roomEmail);
                const roomName = room?.name || null;

                auditService.recordEventCreated(event.id, event.title, roomName).catch(err => {
                    console.error('[EventService][audit] recordEventCreated failed:', err);
                });
            } else {
                auditService.recordEventUpdated(event.id, event.title).catch(err => {
                    console.error('[EventService][audit] recordEventUpdated failed:', err);
                });
            }
        } catch (error) {
            console.error(`[EventService] Error al upsert evento: ${event.id}`, error);
            throw error;
        }
    }

    // Marca un evento como eliminado (soft delete)
    async softDeleteEvent(eventId: string): Promise<void> {
        try {
            const event = await Event.findByPk(eventId);
            if (event) {
                await event.destroy();
                auditService.recordEventDeleted(eventId, event.title, "evento eliminado del calendario").catch(err => {
                    console.error('[EventService][audit] recordEventDeleted failed:', err);
                });
            }
        } catch (error) {
            console.error(`[EventService] Error al eliminar evento: ${eventId}`, error);
            throw error;
        }
    }

    async updateEventCheckInStatus(eventId: string, status: CheckInStatus): Promise<void> {
        try {
            await Event.update(
                { checkInStatus: status },
                {
                    where: { id: eventId },
                    silent: true
                }
            );
        } catch (error) {
            console.error(`[EventService] Error al actualizar estado de check-in: ${eventId}`, error);
            throw error;
        }
    }

    async setEventOverlapStatus(eventId: string, newStatus: OverlapStatus): Promise<boolean> {
        try {
            const event = await Event.findByPk(eventId);
            if (!event) return false;

            if (event.overlapStatus === newStatus) {
                return false;
            }

            event.overlapStatus = newStatus;

            await event.save({ silent: true });

            return true;
        } catch (error) {
            console.error(`[EventService] Error al actualizar estado de overlap: ${eventId}`, error);
            throw error;
        }
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

    private async enrichEventsWithRoomAndCreatorsNames(events: Event[]): Promise<EventListItemDTO[]> {
        const uniqueRoomEmails = [...new Set(events.map(event => event.roomEmail))];
        const roomPromises = uniqueRoomEmails.map(email => roomService.fetchRoom(email));
        const rooms = await Promise.all(roomPromises);
        const roomMap = new Map(
            rooms
                .filter((room): room is Room => room !== null)
                .map(room => [room.email, room.name])
        );

        const creatorMap = await this.buildCreatorMap(events);

        return events.map(event => ({
            ...mapEventToListItem(event),
            roomName: roomMap.get(event.roomEmail),
            creatorName: creatorMap.get(event.creatorMail),
        }));
    }
}

export default new EventService();