import { Model } from "sequelize";
import Event from "../models/event";
import { EventDTO } from "../dtos/eventDTO";
import { EventAttributes } from "../models/event.types";
import roomService from "./roomService";

class EventService {

    async getAllEvents(): Promise<Model[]> {
        return Event.findAll();
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