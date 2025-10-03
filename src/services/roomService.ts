import { Model } from "sequelize";
import Room from "../models/room";

class RoomService {

    async getAllRooms(): Promise<Model[]> {
        return Room.findAll();
    }

    async getRoomById(id: string): Promise<Model | null> {
        return Room.findByPk(id);
    }
}

export default new RoomService();
