import { Request, Response, NextFunction } from 'express';
import eventService from '../services/eventService';

class EventController {
    async getAllEvents(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const response = await eventService.getAllEvents(req.query);
            res.status(200).json(response);
        } catch (error) {
            next(error);
        }
    }
}

export default new EventController();