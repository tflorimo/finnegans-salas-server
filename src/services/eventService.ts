import { Model } from "sequelize";
import Event from "../models/event";
import { EventDTO } from "../dtos/eventDTO";
import { EventAttributes } from "../models/event.types";

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
    }

}

export default new EventService();