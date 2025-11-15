import { Room, Event } from "../models";
import { RoomRequestDTO, RoomDTO } from "../dtos/roomDTO";
import { EventDTOResponse } from "../dtos/eventDTO";
import { mapRoomToRequestDTO } from "../utils/mappers/roomMapper";
import { mapEventToResponseDTO } from "../utils/mappers/eventMapper";
import eventService from "./eventService";
import userService from "./userService";
import currentEventService from "./currentEventService";
class RoomService {

    async getAllRooms(): Promise<RoomRequestDTO[]> {
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

    async getRoomById(id: string): Promise<RoomRequestDTO | null> {
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
    ): Promise<RoomRequestDTO> {
        const currentEventId = room.get('current_event') as string | null;
        let currentEventDTO: EventDTOResponse | null = null;

        if (currentEventId) {
            const event = eventMap.get(currentEventId);
            if (event && !event.deletedAt) {
                const creatorName = creatorMap.get(event.creatorMail) || "Usuario desconocido";

                currentEventDTO = mapEventToResponseDTO(event, creatorName, event.overlapStatus);

            } else {
                console.warn(
                    `[enrichRoomWithEvents] Evento ${event ? 'eliminado' : 'fantasma'} detectado ` +
                    `en ${room.email}: ${currentEventId}`
                );
            }
        }

        const eventos = await eventService.getEventsByRoomId(room.email);
        return mapRoomToRequestDTO(room, currentEventDTO, eventos);
    }

    async upsertRoom(roomDTO: RoomDTO): Promise<void> {
        await Room.upsert(roomDTO);
    }

    async getAllRoomEmails(): Promise<string[]> {
        const rooms = await Room.findAll({ attributes: ['email'] });
        return rooms.map(room => room.email);
    }

    async getAllRoomModels(): Promise<Room[]> {
        return Room.findAll();
    }

    getCurrentEventId(room: Room): string | null {
        return room.get('current_event') as string | null;
    }

    async getRoomBusyStatus(roomEmail: string): Promise<boolean | null> {
        const room = await Room.findByPk(roomEmail);
        return room ? (room.get('is_busy') as boolean) : null;
    }

    async reloadRoom(room: Room): Promise<void> {
        await room.reload();
    }

    async updateRoomBusyStatus(roomEmail: string, isBusy: boolean): Promise<void> {
        await Room.update({ is_busy: isBusy }, { where: { email: roomEmail } });
    }

    async updateRoomStatus(roomEmail: string, currentEventId: string, isBusy: boolean): Promise<void> {
        const room = await Room.findOne({ where: { email: roomEmail } });
        if (room) {
            await room.update({
                current_event: currentEventId,
                is_busy: isBusy
            });
        }
    }

    async clearRoom(roomEmail: string): Promise<boolean> {
        const [affected] = await Room.update(
            { current_event: null, is_busy: false },
            { where: { email: roomEmail } }
        );

        return affected > 0;
    }

    async updateRoomCurrentEvent(roomEmail: string, eventId: string | null): Promise<boolean> {
        const room = await Room.findByPk(roomEmail);
        if (!room) {
            return false;
        }

        if (eventId) {
            const event = await eventService.getEventById(eventId);
            if (!event || event.deletedAt) {
                console.warn(
                    `[RoomService] Intento de asignar evento ${eventId} ` +
                    `${event ? 'eliminado' : 'inexistente'} como currentEvent de ${roomEmail}`
                );
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
    }

    async fetchRoom(id: string): Promise<Room | null> {
        const room = await Room.findByPk(id, { paranoid: false });
        if (!room) {
            return null;
        }
        return room;
    }

    async softDeleteRoom(roomEmail: string): Promise<void> {
        const room = await Room.findByPk(roomEmail);
        if (room) {
            await room.destroy();
        }
    }

    async restoreRoom(roomEmail: string): Promise<void> {
        await Room.restore({ where: { email: roomEmail } });
    }
}

export default new RoomService();
