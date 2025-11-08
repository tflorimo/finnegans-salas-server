import roomService from "../services/roomService";
import { Request, Response } from "express"; 
class RoomController {

    async getAllRooms(req: Request, res: Response): Promise<void> {
        try {
            const rooms = await roomService.getAllRooms();
            res.status(200).json(rooms);
        } catch (error) {
            res.status(500).json({
                error: 'Error al obtener las habitaciones',
                message: error instanceof Error ? error.message : 'Error no conocido'
            });
        }
    }

    async getRoomById(req: Request, res: Response): Promise<void> { 
        try {
            const { id } = req.params;
            const room = await roomService.getRoomById(id);
            
            if (!room) {
                res.status(404).json({
                    error: 'Habitación no encontrada',
                    message: `No se encontró una habitación con el ID ${id}`
                });
                return;
            }
            
            res.status(200).json(room);
        } catch (error) {
            res.status(500).json({
                error: 'Error al obtener la habitación',
                message: error instanceof Error ? error.message : 'Error no conocido'
            });
        }
    }
    
    async checkIn(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const userEmail = (req as any).user?.email;
            const resultado = await roomService.checkInCurrentEvent(id, userEmail);
            if (!resultado.success) {
                res.status(400).json({
                    error: "Hubo un error al intentar hacer checkin del evento actual de la sala",
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

};

export default new RoomController();