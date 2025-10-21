import { Model } from "sequelize";
import { RoomDTO, RoomResponseDTO, RoomWithEventsDTO } from "../../dtos/roomDTO";

// export function mapRoomToDTO(room: Model): RoomDTO {
//     const roomData = room.get({ plain: true }) as any;
    
//     return {
//         email: roomData.email,
//         name: roomData.name,
//         displayName: roomData.displayName,
//         capacity: roomData.capacity,
//         description: roomData.description || null,
//     };
// }

// export function mapRoomWithEventsToDTO(room: Model): RoomWithEventsDTO {
//     const roomData = room.get({ plain: true }) as any;
    
//     return {
//         email: roomData.email,
//         name: roomData.name,
//         displayName: roomData.displayName,
//         capacity: roomData.capacity,
//         description: roomData.description || null,
//         events: (roomData.Events || []).map((event: any) => ({
//             id: event.id,
//             title: event.title,
//             startTime: event.startTime,
//             endTime: event.endTime,
//             creator: {
//                 id: event.User?.id || 0,
//                 name: event.User?.name || '',
//                 email: event.User?.email || '',
//             }
//         }))
//     };
// }

// export function mapRoomsToDTO(rooms: Model[]): RoomDTO[] {
//     return rooms.map(mapRoomToDTO);
// }

export function mapRoomResponseToRoomDTO(roomResponse: RoomResponseDTO): RoomDTO | null {

    if(!roomResponse.resourceEmail) return null;

    const features = extractFeatures(roomResponse);

    return {
        email: roomResponse.resourceEmail,
        name: roomResponse.resourceName,
        floor: roomResponse.floorName,
        type: roomResponse.resourceType,
        is_busy: false, // no viene en la response, por ende lo dejo en false ya que juega con el checkin
        capacity: roomResponse.capacity,
        description: roomResponse.userVisibleDescription,
        resources: features.length > 0 ? features : null,
    };
}

export function mapResponseToRoomResponseDTO(roomResponse: any): RoomResponseDTO {
    return {
        resourceEmail: roomResponse.resourceEmail || '',
        resourceName: roomResponse.resourceName || '',
        floorName: roomResponse.floorName || '',
        resourceType: roomResponse.resourceType || '',
        capacity: roomResponse.capacity || 0,
        userVisibleDescription: roomResponse.userVisibleDescription || null,
        featureInstances: roomResponse.featureInstances || null,
    };
}

function extractFeatures(dto: RoomResponseDTO): string[] {
    if (!dto.featureInstances) return [];
    return dto.featureInstances
    .map((fi: any) => fi?.feature?.name)
    .filter((n): n is string => typeof n === 'string' && n.trim().length > 0);
}