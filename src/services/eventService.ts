import { Event, Room } from "../models";
import { EventDTO, EventDTOResponse } from "../dtos/eventDTO";
import { EventAttributes } from "../models/event.types";
import roomService from "./roomService";
import { mapEventToResponseDTO } from "../utils/mappers/eventMapper";
import { filterEventsByWeek } from "../utils/dateUtils.ts";
import UserService from "./userService";
import { Op } from "sequelize";
class EventService {

    async getAllEvents(): Promise<EventDTOResponse[]> {
        const eventos = await Event.findAll({
            include: [{ model: Room, as: "room", attributes: ["name"] }],
            // Solo devolver eventos que NO están eliminados (paranoid: true)
        });

        return this.mapWithCreatorNames(eventos);
    }

    async getEventById(id: string | null | undefined): Promise<Event | null> {
        if (!id) return null;
        // paranoid: false permite buscar también registros eliminados
        return Event.findByPk(id, { paranoid: false });
    }

    async getEventsByRoomId(roomId: string): Promise<EventDTOResponse[]> {
        const eventos = await Event.findAll({
            where: { roomEmail: roomId },
            include: [{ model: Room, as: "room", attributes: ["name"] }],
            // Solo devuelve eventos que no están eliminados (paranoid: true)
        });

        const eventosDTO = await this.mapWithCreatorNames(eventos);
        return filterEventsByWeek(eventosDTO);
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

    private async mapWithCreatorNames(events: Event[]): Promise<EventDTOResponse[]> {
        return Promise.all(
            events.map(async (event) => {
                const creatorName = await UserService.getNameByEmail(event.creatorMail);
                return mapEventToResponseDTO(event, creatorName || "Usuario desconocido");
            })
        );
    }

    async updateCheckedInStatus(event: EventAttributes): Promise<void> {
        const endMs = new Date(event.endTime).getTime();
        const ended = endMs <= Date.now();

        if (event.checkedIn && ended) {
            await Event.update(
                { checkedIn: false },
                { where: { id: event.id } }
            );
        }
    }

    /**
     * Marca un evento como eliminado (soft delete)
     * Se usa cuando el evento ya no existe en Google Calendar
     */
    async softDeleteEvent(eventId: string): Promise<void> {
        const event = await Event.findByPk(eventId);
        if (event) {
            await event.destroy(); // Con paranoid:true, esto hace soft delete
            console.log(`[EventService] Evento ${eventId} marcado como eliminado`);
        }
    }

    /**
     * Restaura un evento eliminado (anula el soft delete)
     * Se usa cuando un evento vuelve a aparecer en Google Calendar
     */
    async restoreEvent(eventId: string): Promise<void> {
        await Event.restore({ where: { id: eventId } });
        console.log(`[EventService] Evento ${eventId} restaurado`);
    }
}

export default new EventService();