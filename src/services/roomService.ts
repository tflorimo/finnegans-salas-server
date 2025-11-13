import { Room, Event } from "../models";
import { RoomRequestDTO, RoomDTO } from "../dtos/roomDTO";
import { EventDTOResponse, CheckInStatus } from "../dtos/eventDTO";
import type { RoomAttributes } from "../models/room.types";
import { Attendee } from "../models/event.types";
import { mapRoomToRequestDTO } from "../utils/mappers/roomMapper";
import { mapEventToResponseDTO } from "../utils/mappers/eventMapper";
import EventService from "./eventService";
import UserService from "./userService";
class RoomService {

    async getAllRooms(): Promise<RoomRequestDTO[]> {
        const rooms = await Room.findAll();
        const currentEventIds = rooms
            .map(room => room.get('current_event') as string | null)
            .filter((id): id is string => id !== null);

        const eventPromises = currentEventIds.map(id => EventService.getEventById(id));
        const eventResults = await Promise.all(eventPromises);
        const events = eventResults.filter((event): event is Event => event !== null && !event.deletedAt);

        const creatorEmails = [...new Set(events.map(event => event.creatorMail))];
        const creators = await UserService.getUsersByEmails(creatorEmails);
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
            event = await EventService.getEventById(currentEventId);
            if (event && !event.deletedAt) {
                const creators = await UserService.getUsersByEmails([event.creatorMail]);
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

                currentEventDTO = mapEventToResponseDTO(event, creatorName, true);

            } else {
                console.warn(`[enrichRoomWithEvents] Evento ${event ? 'eliminado' : 'fantasma'} 
                              detectado en ${room.email}: ${currentEventId}`);
                await room.update({ current_event: null, is_busy: false });
            }
        }

        const eventos = await EventService.getEventsByRoomId(room.email);
        return mapRoomToRequestDTO(room, currentEventDTO, eventos);
    }

    async upsertRoom(roomDTO: RoomDTO): Promise<void> {
        const roomValues: RoomAttributes = {
            email: roomDTO.email,
            name: roomDTO.name,
            capacity: roomDTO.capacity,
            description: roomDTO.description ?? null,
            floor: roomDTO.floor,
            type: roomDTO.type,
            is_busy: roomDTO.is_busy,
            current_event: null,
            resources: roomDTO.resources ?? null,
        };

        await Room.upsert(roomValues);
    }

    async getAllRoomEmails(): Promise<string[]> {
        const rooms = await Room.findAll({ attributes: ['email'] });
        return rooms.map(room => room.email);
    }

    async getAllRoomModels(): Promise<Room[]> {
        return Room.findAll();
    }

    async updateRoomBusyStatus(roomEmail: string, isBusy: boolean): Promise<void> {
        await Room.update({ is_busy: isBusy }, { where: { email: roomEmail } });
    }

    async clearRoom(roomEmail: string): Promise<void> {
        await Room.update(
            { current_event: null, is_busy: false },
            { where: { email: roomEmail } }
        );
    }

    /** actualiza el current event de un room
    * @param roomEmail el mail d la sala a actualizar
    * @param eventId el eventId el evento que le vamos a poner a la sala como current event
    */
    async updateRoomCurrentEvent(roomEmail: string, eventId: string | null): Promise<boolean> {
        const room = await Room.findByPk(roomEmail);
        if (!room) {
            return false;
        }

        if (eventId) {
            const event = await EventService.getEventById(eventId);
            if (!event || event.deletedAt) {
                console.warn(`[RoomService] Intento de asignar evento ${eventId} 
                ${event ? 'eliminado' : 'inexistente'} como currentEvent de ${roomEmail}`);
                return false;
            }
        }

        const currentEvent = room.get('current_event') as string | null;

        if (currentEvent) {
            if (await this.isCurrentEventEnded(currentEvent)) {
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

    private async isCurrentEventEnded(currentEventId: string | null): Promise<boolean> {
        if (!currentEventId) return false;

        const currentEvent = await EventService.getEventById(currentEventId);
        if (!currentEvent || currentEvent.deletedAt) return true;

        return new Date(currentEvent.endTime).getTime() <= Date.now();
    }

    /**
     * @returns La sala correspondiente al id proporcionado, o null si no existe
     * Permite buscar rooms eliminadas (paranoid: false)
     */
    async fetchRoom(id: string): Promise<Room | null> {
        const room = await Room.findByPk(id, { paranoid: false });
        if (!room) {
            return null;
        }
        return room;
    }

    async checkInEvent(roomEmail: string, eventId: string, userEmail: string):
        Promise<{ success: boolean; event?: Event | null; message?: string }> {

        const respuesta = {
            success: false,
            event: null as Event | null,
            message: 'template de mensaje'
        }

        const currentRoom = await this.fetchRoom(roomEmail);

        if (!currentRoom) {
            respuesta.message = 'Sala no encontrada';
            return respuesta;
        }

        const event = await EventService.getEventById(eventId);

        if (!event) {
            respuesta.message = 'Evento no encontrado';
            return respuesta;
        }

        if (event.deletedAt) {
            respuesta.message = 'Este evento ha sido eliminado';
            return respuesta;
        }

        if (event.roomEmail !== roomEmail) {
            respuesta.message = 'El evento no pertenece a esta sala';
            return respuesta;
        }

        const checkInStatus = event.get('checkInStatus') as CheckInStatus;

        if (checkInStatus === CheckInStatus.CHECKED_IN) {
            respuesta.message = "Este evento ya tiene el check-in realizado.";
            return respuesta;
        }

        const attendeesDTO = event.get('attendees') as Attendee[] | null;

        if (attendeesDTO && !attendeesDTO.some(attendee => attendee.email === userEmail)) {
            respuesta.message = "Para poder hacer check-in, debes estar como asistente del evento!";
            return respuesta;
        }

        const startTime = event.get('startTime') as Date;
        const endTime = event.get('endTime') as Date;
        const canCheckIn = EventService.canCheckIn(startTime, endTime);

        if (!canCheckIn.canCheckIn) {
            respuesta.message = canCheckIn.reason || "No es posible realizar check-in en este momento.";
            return respuesta;
        }

        const overlapInfo = await EventService.checkEventOverlap(
            eventId,
            roomEmail,
            event.startTime,
            event.endTime
        );

        if (overlapInfo.isOverlapping && !overlapInfo.isPrimary) {
            const eventWasModified = event.createdAt.getTime() !== event.updatedAt.getTime();

            if (eventWasModified) {
                respuesta.message = `Este evento fue modificado y está superpuesto. 
                                     Solo puede hacerse check-in en el evento primario.`;
                return respuesta;
            }

            const primaryEvent = await EventService.getEventById(overlapInfo.primaryEventId!);
            if (primaryEvent) {
                const primaryWasModified = primaryEvent.createdAt.getTime() !== primaryEvent.updatedAt.getTime();

                if (!primaryWasModified) {
                    respuesta.message = `Este evento está superpuesto. Solo puede hacerse 
                                         check-in en el evento primario.`;
                    return respuesta;
                }

                const now = Date.now();
                const eventStart = new Date(event.startTime).getTime();

                if (now < eventStart) {
                    respuesta.message = `No puedes hacer check-in antes del horario de inicio 
                                         del evento (${new Date(eventStart).toLocaleTimeString('es-ES',
                                         { hour: '2-digit', minute: '2-digit' })}).`;
                    return respuesta;
                }

                console.log(`[RoomService] Evento ${eventId} 
                           (NO modificado) permitiendo check-in en overlap causado por 
                            modificación del evento ${overlapInfo.primaryEventId}`);
            }
        }

        await EventService.updateEventCheckInStatus(eventId, CheckInStatus.CHECKED_IN);

        const now = Date.now();
        const eventStart = new Date(startTime).getTime();
        const eventEnd = new Date(endTime).getTime();
        const isEventInProgress = now >= eventStart && now < eventEnd;

        await currentRoom.update({
            current_event: eventId,
            is_busy: isEventInProgress
        });

        await event.reload();

        respuesta.success = true;
        respuesta.event = event;
        respuesta.message = "Check-in realizado con éxito!";
        return respuesta;
    }

    /**
     * Marca una room como eliminada (soft delete)
     * Se usa cuando la room ya no existe en Google Admin SDK
     */
    async softDeleteRoom(roomEmail: string): Promise<void> {
        const room = await Room.findByPk(roomEmail);
        if (room) {
            await room.destroy(); // Con paranoid:true, esto hace soft delete
        }
    }

    /**
     * Restaura una room eliminada (anula el soft delete)
     * Se usa cuando una room vuelve a aparecer en Google Admin SDK
     */
    async restoreRoom(roomEmail: string): Promise<void> {
        await Room.restore({ where: { email: roomEmail } });
    }
}

export default new RoomService();
