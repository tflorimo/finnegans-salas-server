import { Model } from "sequelize";
import Event from "../models/event";
import Room from "../models/room";
import { EventDTO, EventDTOResponse } from "../dtos/eventDTO";
import { AttendeeDTO } from "../dtos/eventDTO";
import { EventAttributes } from "../models/event.types";
import roomService from "./roomService";

class EventService {

    async getAllEvents(): Promise<EventDTOResponse[]> {
        const eventos = await Event.findAll({
            include: [{
                model: Room,
                attributes: ['name']
            }]
        });

        return eventos.map(evento => {
            const room = (evento as any).Room; 
            
            return {
                id: evento.id,
                creatorMail: evento.creatorMail,
                roomEmail: evento.roomEmail,
                startTime: evento.startTime,
                title: evento.title,
                endTime: evento.endTime,
                checkedIn: evento.checkedIn,
                attendees: evento.attendees as AttendeeDTO[],
                roomName: room ? room.name : 'Sala no encontrada',
            };
        });
    }

    async getEventById(id: string): Promise<Model | null> {
        return Event.findByPk(id);
    }

    async upsertEvent(eventDTO: EventDTO): Promise<void> {
        const eventValues: EventAttributes = {
            id: eventDTO.id,
            creatorMail: eventDTO.creatorMail,
            roomEmail: eventDTO.roomEmail,
            startTime: eventDTO.startTime,
            title: eventDTO.title,
            endTime: eventDTO.endTime,
            checkedIn: eventDTO.checkedIn,
            attendees: eventDTO.attendees, // es un dto
        }

        await Event.upsert(eventValues);

        const now = new Date();
        const startTime = new Date(eventDTO.startTime);
        const endTime = new Date(eventDTO.endTime);

        /**
         * validamos que la fecha y hora actual esté en el rango del evento, para asignare este evento como current_event
         */
        if(now >= startTime && now <= endTime) {
            await roomService.updateRoomCurrentEvent(eventDTO.roomEmail, eventDTO.id);
        }
    }

}

export default new EventService();