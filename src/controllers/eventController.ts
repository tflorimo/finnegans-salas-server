import eventService from "../services/eventService";
import { Request, Response } from "express";

export class EventController {

    private eventService = eventService;

    async getAllEvents(req: Request, res: Response): Promise<void> {
        try {
            const events = await this.eventService.getAllEvents();
            res.status(200).json(events);
        } catch (error) {
            res.status(500).json({
                error: 'Error al obtener los eventos',
                message: error instanceof Error ? error.message : 'Error no conocido'
            });
        }
    }

    async getEventById(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const event = await this.eventService.getEventById(id);
            if (!event) {
                res.status(404).json({
                    error: 'Evento no encontrado',
                    message: `No se encontró un evento con el ID ${id}`
                });
                return;
            }
            res.status(200).json(event);
        } catch (error) {
            res.status(500).json({
                error: 'Error al obtener el evento',
                message: error instanceof Error ? error.message : 'Error no conocido'
            });
        }

    }

    async checkInEvent(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const { userEmail } = req.body.user; 
            const resultado = await this.eventService.checkInEvent(id, userEmail);
            if (!resultado.success) {
                res.status(400).json({
                    error: "Hubo un error al intentar hacer checkin",
                    message: resultado.message
                });
                return;
            }

            res.status(200).json({
                message: 'Checkin realizado con éxito',
                event: resultado.event
            });
        
        } catch (error) {
            res.status(500).json({
                error: 'Error al hacer checkin en el evento',
                message: error instanceof Error ? error.message : 'Error no conocido'
            });
        }

    }

}

export default new EventController();