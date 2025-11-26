import { Room, Event } from "../models";
import { RoomResponseDTO, RoomDTO } from "../dtos/roomDTO";
import { EventDTOResponse } from "../dtos/eventDTO";
import { mapRoomToRequestDTO } from "../utils/mappers/roomMapper";
import { mapEventToResponseDTO } from "../utils/mappers/eventMapper";
import eventService from "./eventService";
import userService from "./userService";
import auditService from "./auditService";
import currentEventService from "./currentEventService";
class RoomService {
    async getAllRooms(): Promise<RoomResponseDTO[]> {
        const rooms = await Room.findAll();
        const currentEventIds = rooms
            .map(room => room.get('current_event') as string | null)
            .filter((id): id is string => id !== null);

        const eventPromises = currentEventIds.map(id => eventService.getEventById(id));
        const eventResults = await Promise.all(eventPromises);
        const events = eventResults.filter((event): event is Event => event !== null && !event.deletedAt);

        const creatorEmails = [...new Set(events.map(event => event.creatorMail))];
        const creators = await userService.getUsersByEmails(creatorEmails);
        const creatorMap = new Map(creators.map(user => [user.email, user.name || "Usuario desconocido"]));
        const eventMap = new Map(events.map(event => [event.id, event]));

        return Promise.all(
            rooms.map(room => this.enrichRoomWithEvents(room, eventMap, creatorMap))
        );
    }

    async getRoomById(id: string): Promise<RoomResponseDTO | null> {
        const room = await Room.findByPk(id);
        if (!room) return null;

        const currentEventId = room.get('current_event') as string | null;
        let event: Event | null = null;
        let creatorMap = new Map<string, string>();

        if (currentEventId) {
            event = await eventService.getEventById(currentEventId);
            if (event && !event.deletedAt) {
                const creators = await userService.getUsersByEmails([event.creatorMail]);
                creatorMap = new Map(creators.map(user => [user.email, user.name || "Usuario desconocido"]));
            } else {
                event = null;
            }
        }

        const eventMap = event ? new Map([[event.id, event]]) : new Map();
        return this.enrichRoomWithEvents(room, eventMap, creatorMap);
    }

    // Enriquece una room con sus eventos y el currentEvent completo
    private async enrichRoomWithEvents(
        room: Room,
        eventMap: Map<string, Event>,
        creatorMap: Map<string, string>
    ): Promise<RoomResponseDTO> {
        const currentEventId = room.get('current_event') as string | null;
        let currentEventDTO: EventDTOResponse | null = null;

        if (currentEventId) {
            const event = eventMap.get(currentEventId);
            if (event && !event.deletedAt) {
                const creatorName = creatorMap.get(event.creatorMail) || "Usuario desconocido";
                currentEventDTO = mapEventToResponseDTO(event, creatorName, event.overlapStatus);
            }
        }

        const eventos = await eventService.getEventsByRoomId(room.email);
        return mapRoomToRequestDTO(room, currentEventDTO, eventos);
    }

    async upsertRoom(roomDTO: RoomDTO): Promise<void> {
        try {
            await Room.upsert(roomDTO);
        } catch (error) {
            console.error(`[RoomService] Error al crear/actualizar sala: ${roomDTO.email}`, error);
            throw error;
        }
    }

    async getAllRoomEmails(): Promise<string[]> {
        try {
            const rooms = await Room.findAll({ attributes: ['email'] });
            return rooms.map(room => room.email);
        } catch (error) {
            console.error('[RoomService] Error al obtener emails de salas:', error);
            throw error;
        }
    }

    async getAllRoomModels(): Promise<Room[]> {
        try {
            return Room.findAll();
        } catch (error) {
            console.error('[RoomService] Error al obtener modelos de salas:', error);
            throw error;
        }
    }

    getCurrentEventId(room: Room): string | null {
        return room.get('current_event') as string | null;
    }

    async getRoomBusyStatus(roomEmail: string): Promise<boolean | null> {
        try {
            const room = await Room.findByPk(roomEmail);
            return room ? (room.get('is_busy') as boolean) : null;
        } catch (error) {
            console.error(`[RoomService] Error al obtener estado de sala: ${roomEmail}`, error);
            throw error;
        }
    }

    async reloadRoom(room: Room): Promise<void> {
        try {
            await room.reload();
        } catch (error) {
            console.error(`[RoomService] Error al recargar sala: ${room.email}`, error);
            throw error;
        }
    }

    async updateRoomBusyStatus(roomEmail: string, isBusy: boolean): Promise<void> {
        try {
            const room = await Room.findByPk(roomEmail);
            if (!room) return;

            await Room.update({ is_busy: isBusy }, { where: { email: roomEmail } });

            if (isBusy) {
                auditService.recordRoomBusy(roomEmail, room.current_event, null, room.name).catch(err => {
                    console.error('[RoomService][audit] recordRoomBusy failed:', err);
                });
            } else {
                auditService.recordRoomAvailable(roomEmail, room.name).catch(err => {
                    console.error('[RoomService][audit] recordRoomAvailable failed:', err);
                });
            }
        } catch (error) {
            console.error(`[RoomService] Error al actualizar estado busy de sala: ${roomEmail}`, error);
            throw error;
        }
    }

    async updateRoomStatus(roomEmail: string, currentEventId: string, isBusy: boolean): Promise<void> {
        try {
            const room = await Room.findOne({ where: { email: roomEmail } });

            if (!room) {
                console.warn(`[RoomService] Sala no encontrada: ${roomEmail}`);
                return;
            }

            await room.update({ is_busy: isBusy });

            if (isBusy) {
                await this.updateRoomCurrentEvent(roomEmail, currentEventId);
                const event = await eventService.getEventById(currentEventId);
                auditService.recordRoomBusy(roomEmail, currentEventId, event?.title, room.name).catch(err => {
                    console.error('[RoomService][audit] recordRoomBusy failed:', err);
                });
            }

        } catch (error) {
            console.error(`[RoomService] Error al actualizar estado de sala: ${roomEmail}`, error);
            throw error;
        }
    }

    async clearRoom(roomEmail: string): Promise<boolean> {
        try {
            const room = await Room.findByPk(roomEmail);
            const [affected] = await Room.update(
                { current_event: null, is_busy: false },
                { where: { email: roomEmail } }
            );

            if (affected > 0) {
                auditService.recordRoomAvailable(roomEmail, room?.name).catch(err => {
                    console.error('[RoomService][audit] recordRoomAvailable failed:', err);
                });
            }

            return affected > 0;
        } catch (error) {
            console.error(`[RoomService] Error al limpiar sala: ${roomEmail}`, error);
            throw error;
        }
    }

    async updateRoomCurrentEvent(roomEmail: string, eventId: string | null): Promise<boolean> {
        try {
            const room = await Room.findByPk(roomEmail);
            if (!room) {
                return false;
            }

            if (eventId) {
                const event = await eventService.getEventById(eventId);
                if (!event || event.deletedAt) {
                    return false;
                }

                const started = await currentEventService.isCurrentEventStarted(eventId);
                if (!started) {
                    return false;
                }
            }

            const currentEvent = this.getCurrentEventId(room);

            if (currentEvent === eventId) {
                return false;
            }

            if (currentEvent) {
                if (await currentEventService.isCurrentEventEnded(currentEvent)) {
                    await room.update({
                        current_event: null,
                        is_busy: false
                    });
                    return true;
                }
            }

            if (currentEvent !== eventId) {
                await room.update({
                    current_event: eventId
                });
                return true;
            }

            return false;
        } catch (error) {
            console.error(`[RoomService] Error al actualizar evento actual de sala: ${roomEmail}`, error);
            throw error;
        }
    }

    async fetchRoom(id: string): Promise<Room | null> {
        try {
            const room = await Room.findByPk(id, { paranoid: false });
            return room;

        } catch (error) {
            console.error(`[RoomService] Error al obtener sala: ${id}`, error);
            throw error;
        }
    }

    async softDeleteRoom(roomEmail: string): Promise<void> {
        try {
            const room = await Room.findByPk(roomEmail);
            if (room) await room.destroy();
        } catch (error) {
            console.error(`[RoomService] Error al eliminar sala: ${roomEmail}`, error);
            throw error;
        }
    }

    async restoreRoom(roomEmail: string): Promise<void> {
        try {
            await Room.restore({ where: { email: roomEmail } });
        } catch (error) {
            console.error(`[RoomService] Error al restaurar sala: ${roomEmail}`, error);
            throw error;
        }
    }
}

export default new RoomService();
