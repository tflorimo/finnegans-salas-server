import checkInService from "../services/checkInService";
import roomService from "../services/roomService";
import { Request, Response, NextFunction } from "express"; 
import { CHECK_IN_HTTP_STATUS } from "../constants/checkInErrors";
import { NotFoundError, BadRequestError } from "../errors/AppError";

class RoomController {
    async getAllRooms(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const rooms = await roomService.getAllRooms();
            res.status(200).json(rooms);
        } catch (error) {
            next(error);
        }
    }

    async getRoomById(req: Request, res: Response, next: NextFunction): Promise<void> { 
        try {
            const { id } = req.params;
            const room = await roomService.getRoomById(id);
            
            if (!room) {
                throw new NotFoundError(`No se encontró una habitación con el ID ${id}`);
            }
            
            res.status(200).json(room);
        } catch (error) {
            next(error);
        }
    }
    
    async checkIn(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { roomId, eventId } = req.params;
            const userEmail = (req as any).user?.email;

            if (!eventId) {
                throw new BadRequestError("Debes proporcionar el ID del evento para hacer check-in");
            }

            const resultado = await checkInService.checkInEvent(roomId, eventId, userEmail);
            
            if (!resultado.success) {
                const statusCode = resultado.errorCode 
                    ? CHECK_IN_HTTP_STATUS[resultado.errorCode]
                    : 400;

                res.status(statusCode).json({
                    error: "[RoomController][checkIn]",
                    code: resultado.errorCode,
                    message: resultado.message
                });
                return;
            }

            res.status(200).json({
                message: 'Check-in realizado con éxito',
                event: resultado.event,
                room: resultado.room
            });
        } catch (error) {
            next(error);
        }
    }
};

export default new RoomController();