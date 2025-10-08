import roomService from "../services/roomService";
import { Request, Response } from "express"; // tener cuidado con la importacion correcta de Request y Response, que sea de express sí o sí

class RoomController {
    private roomService = roomService;

    async getAllRooms(req: Request, res: Response): Promise<void> {
        try {
            const rooms = await this.roomService.getAllRooms();
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
            const room = await this.roomService.getRoomById(id);
            
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

};

export default new RoomController();