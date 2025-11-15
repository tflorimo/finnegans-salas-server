import { Request, Response } from 'express';
import eventService from '../services/eventService';

class EventController {
    async getAllEvents(_req: Request, res: Response): Promise<void> {
        try {
            const events = await eventService.getAllEvents();
            res.status(200).json(events);
        } catch (error) {
            console.error('[EventController] [getAllEvents]', error);
            res.status(500).json({
                message: 'Error obteniendo eventos',
                error: error instanceof Error ? error.message : 'Error desconocido'
            });
        }
    }
}

export default new EventController();