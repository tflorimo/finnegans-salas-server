import { Model } from "sequelize";
import { RoomDTO, RoomWithEventsDTO } from "../../dtos/roomDTO";

export function mapRoomToDTO(room: Model): RoomDTO {
    const roomData = room.get({ plain: true }) as any;
    
    return {
        email: roomData.email,
        name: roomData.name,
        displayName: roomData.displayName,
        capacity: roomData.capacity,
        description: roomData.description || null,
    };
}

export function mapRoomWithEventsToDTO(room: Model): RoomWithEventsDTO {
    const roomData = room.get({ plain: true }) as any;
    
    return {
        email: roomData.email,
        name: roomData.name,
        displayName: roomData.displayName,
        capacity: roomData.capacity,
        description: roomData.description || null,
        events: (roomData.Events || []).map((event: any) => ({
            id: event.id,
            title: event.title,
            startTime: event.startTime,
            endTime: event.endTime,
            creator: {
                id: event.User?.id || 0,
                name: event.User?.name || '',
                email: event.User?.email || '',
            }
        }))
    };
}

export function mapRoomsToDTO(rooms: Model[]): RoomDTO[] {
    return rooms.map(mapRoomToDTO);
}