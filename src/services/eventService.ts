import { Model } from "sequelize";
import Event from "../models/event";
import { EventDTO, EventDTOResponse } from "../dtos/eventDTO";
import { AttendeeDTO } from "../dtos/eventDTO";
import { EventAttributes } from "../models/event.types";

class EventService {

    async getAllEvents(): Promise<EventDTOResponse[]> {
        const eventos: Model[] = await Event.findAll();
        let eventosDTO: EventDTOResponse[] = [];
        for (const evento of eventos) {
            let tempEventDTO: EventDTOResponse = {
                id: evento.get('id') as string,
                creatorMail: evento.get('creatorMail') as string,
                roomEmail: evento.get('roomEmail') as string,
                startTime: evento.get('startTime') as Date,
                title: evento.get('title') as string,
                endTime: evento.get('endTime') as Date,
                checkedIn: evento.get('checkedIn') as boolean,
                attendees: evento.get('attendees') as AttendeeDTO[],
                roomName: evento.get('roomName') as string,
            };
            eventosDTO.push(tempEventDTO);
        }
        return eventosDTO;
    }

    async getEventById(id: string): Promise<Model | null> {
        return Event.findByPk(id);
    }

    // async checkInEvent(id: string, userEmail: string): Promise<{ success: boolean; event?: Model | null; message?: string }> {
        
    //     const respuesta = {
    //         success: false,
    //         event: null as Model | null,
    //         message: 'msg a enviar'
    //     }

    //     const event = await Event.findByPk(id);

    //     if (!event) {
    //         respuesta.message = 'Evento no encontrado';
    //         return respuesta;
    //     }

    //     if(event.get('checkedIn') === true) {
    //         respuesta.message = "Este evento ya posee el checkin realizado.";
    //         return respuesta;
    //     }

    //     const attendees = event.get('attendees') as string[] | null;

    //     if(attendees && !attendees.includes(userEmail)) {
    //         respuesta.message = "Para poder hacer checkin, debes estar como asistente del evento!";
    //         return respuesta;
    //     }

    //     const now = new Date();
    //     const startTime = new Date(event.get('startTime') as Date);

    //     // limite de 15 minutos después del startTime, superado ese tiempo no pueden hacer checkin
    //     const limite = new Date(startTime.getTime() + (15 * 60) * 1000);

    //     if(now > limite) {
    //         respuesta.message = "El tiempo para hacer checkin ya expiró! No es posible realizar el checkin.";
    //         return respuesta;
    //     }

    //     event.set('checkedIn', true);
    //     await event.save();

    //     respuesta.success = true;
    //     respuesta.event = event;
    //     respuesta.message = "Checkin realizado con éxito!";
    //     return respuesta;
    // }


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