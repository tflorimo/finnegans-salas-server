import { Model } from "sequelize";
import Room from "../models/room";
import Event from "../models/event";
import { RoomDTO } from "../dtos/roomDTO";
import type { RoomAttributes } from "../models/room.types";

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

    // retorna el id del evento actual de la sala
    async getCurrentEventFromRoom(id: string): Promise<number | null> {
        const room =  await Room.findByPk(id);
        if (!room || !room.current_event) {
            return null;
        }
        return room.current_event;
    }

    async checkInCurrentEvent(id: string, userEmail: string): Promise<{ success: boolean; event?: Model | null; message?: string }> {
        
        const respuesta = {
            success: false,
            event: null as Model | null,
            message: 'msg a enviar'
        }

        const currentEventId = await this.getCurrentEventFromRoom(id);
        const event = await Event.findByPk(currentEventId as any);

        if (!event) {
            respuesta.message = 'Evento no encontrado';
            return respuesta;
        }

        if(event.get('checkedIn') === true) {
            respuesta.message = "Este evento ya posee el checkin realizado.";
            return respuesta;
        }

        const attendees = event.get('attendees') as string[] | null;

        if(attendees && !attendees.includes(userEmail)) {
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
