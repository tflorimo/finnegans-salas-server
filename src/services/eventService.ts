import { Model } from "sequelize";
import Event from "../models/event";

class EventService {

    async getAllEvents(): Promise<Model[]> {
        return Event.findAll();
    }

    async getEventById(id: string): Promise<Model | null> {
        return Event.findByPk(id);
    }

    async checkInEvent(id: string, userEmail: string): Promise<{ success: boolean; event?: Model | null; message?: string }> {
        
        const respuesta = {
            success: false,
            event: null as Model | null,
            message: 'msg a enviar'
        }

        const event = await Event.findByPk(id);

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

export default new EventService();