import { Model } from "sequelize";
import Room from "../models/room";
import { RoomDTO } from "../dtos/roomDTO";
import type { RoomAttributes } from "../models/room.types";

class RoomService {

    async getAllRooms(): Promise<Model[]> {
        return Room.findAll();
    }

    async getRoomById(id: string): Promise<Model | null> {
        return Room.findByPk(id);
    }

    async upsertRoom(roomDTO: RoomDTO) : Promise<void> {
        const roomValues: RoomAttributes = {
            email: roomDTO.email,
            name: roomDTO.name,
            capacity: roomDTO.capacity,
            description: roomDTO.description ?? null,
            floor: roomDTO.floor,
            type: roomDTO.type,
            is_busy: roomDTO.is_busy,
            resources: roomDTO.resources ?? null
        }
        await Room.upsert(roomValues);
    }

    async getAllRoomEmails(): Promise<string[]> {
        const rooms =  await Room.findAll({ attributes: ['email'] });
        return rooms.map(room => room.email);
    }
}

export default new RoomService();
