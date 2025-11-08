import { Room, Event } from "../models";
import { RoomRequestDTO, RoomDTO, RoomCreateDTO } from "../dtos/roomDTO";
import type { RoomAttributes } from "../models/room.types";
import { Attendee } from "../models/event.types";
import { mapRoomToRequestDTO } from "../utils/mappers/roomMapper";
import EventService from "./eventService";
class RoomService {

    async getAllRooms(): Promise<RoomRequestDTO[]> {
        // Solo devolver rooms que NO están eliminadas (paranoid: true por defecto)
        const rooms = await Room.findAll();
        return Promise.all(
            rooms.map(room => this.enrichRoomWithEvents(room))
        );
    }

    async getRoomById(id: string): Promise<RoomCreateDTO | null> {
        // Solo devolver rooms que NO están eliminadas (paranoid: true por defecto)
        const room = await Room.findByPk(id);
        return room ? this.enrichRoomWithEvents(room) : null;
    }

    private async enrichRoomWithEvents(room: Room): Promise<RoomRequestDTO> {
        let currentEventId = room.get('current_event') as string | null;

        if (currentEventId) {
            const event = await Event.findByPk(currentEventId);
            if (!event) {
                // Limpia la sala
                await room.update({ current_event: null, is_busy: false });
                currentEventId = null;
            }
        }

        const mappedRoom = mapRoomToRequestDTO(room);
        const eventos = await EventService.getEventsByRoomId(room.email);

        return {
            ...mappedRoom,
            events: eventos,
            current_event: currentEventId
        };
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

    async updateIsBussyStatus(roomEmail: string): Promise<void> {
        const room = await Room.findByPk(roomEmail);
        if (!room) {
            return;
        }

        const currentEventId = room.get('current_event') as string | null;

        // Si no hay evento actual, la sala no está ocupada
        if (!currentEventId) {
            await room.update({ is_busy: false });
            return;
        }

        // Si el evento ya terminó, liberar la sala
        if (await this.isCurrentEventEnded(currentEventId)) {
            await room.update({ current_event: null, is_busy: false });
            return;
        }

        // Si hay evento, verificar si se hizo checkin
        const event = await Event.findByPk(currentEventId);

        if (!event) {
            // El evento no existe, limpia la sala
            await room.update({ current_event: null, is_busy: false });
            return;
        }

        // Si el evento tiene checkedIn=true, entonces la sala está ocupada
        const checkedIn = event.get('checkedIn') as boolean;
        const isBusy = checkedIn === true;

        await room.update({ is_busy: isBusy });
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

        const currentRoom = await this.fetchRoom(id); // buscamos la sala que nos llega

        // si la sala existe, entonces buscamos el evento actual de la sala
        if (!currentRoom) {
            respuesta.message = 'Sala no encontrada';
            return respuesta;
        }

        const currentEventId = currentRoom.get('current_event') as string | null;

        if (!currentEventId) {
            respuesta.message = 'No hay un evento actual en esta sala para hacer checkin';
            return respuesta;
        }

        const event = await Event.findByPk(currentEventId);

        if (!event) {
            respuesta.message = 'Evento no encontrado';
            return respuesta;
        }

        if (event.get('checkedIn') === true) {
            respuesta.message = "Este evento ya posee el checkin realizado.";
            return respuesta;
        }

        // Attendees no es array de strings, es DTO
        const attendeesDTO = event.get('attendees') as Attendee[] | null;

        if (attendeesDTO && !attendeesDTO.some(attendee => attendee.email === userEmail)) {
            respuesta.message = "Para poder hacer checkin, debes estar como asistente del evento!";
            return respuesta;
        }

        const now = new Date();
        const startTime = new Date(event.get('startTime') as Date);

        // limite de 15 minutos después del startTime, superado ese tiempo no pueden hacer checkin
        const limite = new Date(startTime.getTime() + (15 * 60) * 1000);

        if (now > limite) {
            respuesta.message = "El tiempo para hacer checkin ya expiró! No es posible realizar el checkin.";
            return respuesta;
        }

        await event.update({ checkedIn: true });
        await currentRoom.update({ is_busy: true });

        respuesta.success = true;
        respuesta.event = event;
        respuesta.message = "Checkin realizado con éxito!";
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
