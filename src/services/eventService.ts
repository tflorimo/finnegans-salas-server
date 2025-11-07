import { Model } from "sequelize";
import { Event, Room } from "../models";
import { EventDTO, EventDTOResponse } from "../dtos/eventDTO";
import { AttendeeDTO } from "../dtos/eventDTO";
import { EventAttributes } from "../models/event.types";
import roomService from "./roomService";
import { mapEventToResponseDTO } from "../utils/mappers/eventMapper";

class EventService {

    async getAllEvents(): Promise<EventDTOResponse[]> {
        const eventos = await Event.findAll({
            include: [{
                model: Room,
                as: 'room',
                attributes: ['name']
            }]
        });

        return eventos.map(evento => mapEventToResponseDTO(evento));
    }

    async getEventById(id: string): Promise<Event | null> {
        return Event.findByPk(id);
    }

    async getEventsByRoomId(roomId: string): Promise<EventDTOResponse[]> {
        const eventos = await Event.findAll({
            where: { roomEmail: roomId },
            include: [{
                model: Room,
                as: 'room',
                attributes: ['name']
            }]
        });

        return eventos.map(evento => mapEventToResponseDTO(evento));
    }

    async checkEventAttendeesForResource(event: EventAttributes): Promise<Boolean> {

        let roomResourceFound = false;
        for (const attendee of event.attendees) {
            if (attendee.resource) {
                roomResourceFound = true;
            }
        }

        return roomResourceFound;
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

        const debeGuardar = await this.checkEventAttendeesForResource(eventValues);
        if (!debeGuardar) {
            console.log(`El evento con id "${eventDTO.id}" no tiene asistentes que sean salas, no se guardará.`);
            return;
        }

        await Event.upsert(eventValues);

        const now = new Date();
        const startTime = new Date(eventDTO.startTime);
        const endTime = new Date(eventDTO.endTime);

        /**
         * validamos que la fecha y hora actual esté en el rango del evento, para asignare este evento como current_event
         */
        if (now >= startTime && now <= endTime) {
            await roomService.updateRoomCurrentEvent(eventDTO.roomEmail, eventDTO.id);
        }
    }

}

export default new EventService();