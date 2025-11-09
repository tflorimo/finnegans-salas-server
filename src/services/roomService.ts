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
        const events = eventResults.filter((event): event is Event => event !== null);

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
            if (event) {
                const creators = await UserService.getUsersByEmails([event.creatorMail]);
                creatorMap = new Map(creators.map(user => [user.email, user.name || "Usuario desconocido"]));
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

        // Si hay current_event, obtenerlo de la db con toda su info
        if (currentEventId) {
            const event = eventMap.get(currentEventId);
            if (event) {
                const creatorName = creatorMap.get(event.creatorMail) || "Usuario desconocido";
                currentEventDTO = mapEventToResponseDTO(event, creatorName);
            } else {
                console.warn(`[enrichRoomWithEvents] Evento fantasma detectado en ${room.email}: ${currentEventId}`);
                // Limpia los atributos
                await room.update({ current_event: null, is_busy: false });
            }
        }

        const eventos = await EventService.getEventsByRoomId(room.email);
        return mapRoomToRequestDTO(room, currentEventDTO, eventos);
    }

    async upsertRoom(roomDTO: RoomDTO): Promise<void> {
        // current_event no viene en el DTO porque no nos interesa que esté en el DTO
        // si nos interesa que se guarde en la base de datos, por eso forma parte de roomAttributes y de la clase Room
        const roomValues: RoomAttributes = {
            email: roomDTO.email,
            name: roomDTO.name,
            capacity: roomDTO.capacity,
            description: roomDTO.description ?? null,
            floor: roomDTO.floor,
            type: roomDTO.type,
            is_busy: roomDTO.is_busy,
            current_event: null,
            resources: roomDTO.resources ?? null
        }
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
    async updateRoomCurrentEvent(roomEmail: string, eventId: string | null): Promise<void> {
        const room = await Room.findByPk(roomEmail);
        if (!room) {
            return;
        }

        const currentEvent = room.get('current_event') as string | null;

        // Si hay un evento, verificar si ya terminó
        if (currentEvent) {
            if (await this.isCurrentEventEnded(currentEvent)) {
                await room.update({
                    current_event: null,
                    is_busy: false
                });
                return;
            }
        }

        // Actualiza el current_event
        if (currentEvent !== eventId) {
            await room.update({
                current_event: eventId
            });
        }
    }

    private async isCurrentEventEnded(currentEventId: string | null): Promise<boolean> {
        if (!currentEventId) return false;

        const currentEvent = await EventService.getEventById(currentEventId);
        if (!currentEvent) return false;

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

    async checkInCurrentEvent(id: string, userEmail: string): Promise<{ success: boolean; event?: Event | null; message?: string }> {

        const respuesta = {
            success: false,
            event: null as Event | null,
            message: 'template de mensaje'
        }

        const currentRoom = await this.fetchRoom(id);

        if (!currentRoom) {
            respuesta.message = 'Sala no encontrada';
            return respuesta;
        }

        let eventId = currentRoom.get('current_event') as string | null;

        // Si no hay current_event, buscar eventos dentro de la ventana de check-in
        if (!eventId) {
            const now = new Date();
            const thirtyMinutesFromNow = new Date(now.getTime() + (30 * 60 * 1000));
            const thirtyMinutesAgo = new Date(now.getTime() - (30 * 60 * 1000));

            const eligibleEvents = await Event.findAll({
                where: {
                    roomEmail: id,
                    startTime: {
                        [require('sequelize').Op.between]: [thirtyMinutesAgo, thirtyMinutesFromNow]
                    },
                    checkInStatus: CheckInStatus.PENDING
                },
                order: [['startTime', 'ASC']]
            });

            // Buscar el primer evento primario que esté en ventana de check-in
            for (const candidateEvent of eligibleEvents) {
                // Verificar ventana de check-in
                const canCheckIn = EventService.canCheckIn(candidateEvent.startTime);
                if (!canCheckIn.canCheckIn) continue;

                // Verificar que sea primario (no superpuesto)
                const overlapInfo = await EventService.checkEventOverlap(
                    candidateEvent.id,
                    id,
                    candidateEvent.startTime,
                    candidateEvent.endTime
                );

                if (!overlapInfo.isOverlapping || overlapInfo.isPrimary) {
                    eventId = candidateEvent.id;
                    break;
                }
            }

            if (!eventId) {
                respuesta.message = 'No hay eventos disponibles para hacer check-in en este momento';
                return respuesta;
            }
        }

        const event = await EventService.getEventById(eventId);

        if (!event) {
            respuesta.message = 'Evento no encontrado';
            return respuesta;
        }

        // Verificar si ya está checked in
        const checkInStatus = event.get('checkInStatus') as CheckInStatus;

        if (checkInStatus === CheckInStatus.CHECKED_IN) {
            respuesta.message = "Este evento ya tiene el check-in realizado.";
            return respuesta;
        }

        if (checkInStatus === CheckInStatus.EXPIRED) {
            respuesta.message = "El tiempo para hacer check-in ha expirado.";
            return respuesta;
        }

        // Verificar que el usuario sea asistente
        const attendeesDTO = event.get('attendees') as Attendee[] | null;

        if (attendeesDTO && !attendeesDTO.some(attendee => attendee.email === userEmail)) {
            respuesta.message = "Para poder hacer check-in, debes estar como asistente del evento!";
            return respuesta;
        }

        const startTime = event.get('startTime') as Date;

        // Usar la validación de EventService para check-in window
        const canCheckIn = EventService.canCheckIn(startTime);

        if (!canCheckIn.canCheckIn) {
            respuesta.message = canCheckIn.reason || "No es posible realizar check-in en este momento.";
            return respuesta;
        }

        // Realizar el check-in
        await event.update({ checkInStatus: CheckInStatus.CHECKED_IN });
        
        // Asignar como current_event y marcar sala como ocupada
        await currentRoom.update({ 
            current_event: event.id,
            is_busy: true 
        });

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
