import { Request, Response } from 'express';
import eventService from '../services/eventService';

class EventController {
    async getAllEvents(_req: Request, res: Response): Promise<void> {
        try {
            const events = await eventService.getAllEvents();
            res.status(200).json(events);
        } catch (error) {
            console.error('Error en getAllEvents:', error);
            res.status(500).json({
                message: 'Error obteniendo eventos',
                error: error instanceof Error ? error.message : 'Error desconocido'
            });
        }
    }

    async getEventById(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const event = await eventService.getEventById(id);
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

}

export default new EventController();