import { Model } from "sequelize";
import { Room, Event } from "../models";
import { RoomDTO } from "../dtos/roomDTO";
import type { RoomAttributes } from "../models/room.types";
import { Attendee } from "../models/event.types";

class RoomService {

    async getAllRooms(): Promise<Model[]> {
        return Room.findAll();
    }

    async getRoomById(id: string): Promise<Model | null> {
        return Room.findByPk(id);
    }

    async upsertRoom(roomDTO: RoomDTO) : Promise<void> {
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
        const rooms =  await Room.findAll({ attributes: ['email'] });
        return rooms.map(room => room.email);
    }

    /** actualiza el current event de un room
    * @param roomEmail el mail d la sala a actualizar
    * @param eventId el eventId el evento que le vamos a poner a la sala como current event
    */
    async updateRoomCurrentEvent(roomEmail: string, eventId: string | null): Promise<void> {
        const room = await Room.findByPk(roomEmail);
        if (room) {
            if(room.get('current_event') !== eventId){
                room.set('current_event', eventId);
                await room.save();
            }
        }
    }

    /**
     * @returns La sala correspondiente al id proporcionado, o null si no existe
     */
    async fetchRoom(id: string): Promise<Model | null> {
        const room =  await Room.findByPk(id);
        if (!room) {
            return null;
        }
        return room;
    }

    async checkInCurrentEvent(id: string, userEmail: string): Promise<{ success: boolean; event?: Model | null; message?: string }> {
        
        const respuesta = {
            success: false,
            event: null as Model | null,
            message: 'template de mensaje'
        }

        const currentRoom = await this.fetchRoom(id); // buscamos la sala que nos llega

        // si la sala existe, entonces buscamos el evento actual de la sala
        if(!currentRoom) {
            respuesta.message = 'Sala no encontrada';
            return respuesta;
        }

        const currentEventId = currentRoom.get('current_event') as string | null;

        if(!currentEventId) {
            respuesta.message = 'No hay un evento actual en esta sala para hacer checkin';
            return respuesta;
        }

        const event = await Event.findByPk(currentEventId);

        if (!event) {
            respuesta.message = 'Evento no encontrado';
            return respuesta;
        }

        if(event.get('checkedIn') === true) {
            respuesta.message = "Este evento ya posee el checkin realizado.";
            return respuesta;
        }

        // Attendees no es array de strings, es DTO
        const attendeesDTO = event.get('attendees') as Attendee[] | null;

        if(attendeesDTO && !attendeesDTO.some(attendee => attendee.email === userEmail)) {
            respuesta.message = "Para poder hacer checkin, debes estar como asistente del evento!";
            return respuesta;
        }

        const now = new Date();
        const startTime = new Date(event.get('startTime') as Date);

        // limite de 15 minutos después del startTime, superado ese tiempo no pueden hacer checkin
        const limite = new Date(startTime.getTime() + (15 * 60) * 1000);

        if(now > limite) {
            respuesta.message = "El tiempo para hacer checkin ya expiró! No es posible realizar el checkin.";
            return respuesta;
        }

        event.set('checkedIn', true);
        await event.save();

        respuesta.success = true;
        respuesta.event = event;
        respuesta.message = "Checkin realizado con éxito!";
        return respuesta;
    }
}

export default new RoomService();
