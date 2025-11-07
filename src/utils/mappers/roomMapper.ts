import { EventDTO } from "../../dtos/eventDTO";
import { RoomDTO, RoomRequestDTO, RoomResponseDTO } from "../../dtos/roomDTO";
import { Room } from "../../models";


export function mapRoomResponseToRoomDTO(roomResponse: RoomResponseDTO): RoomDTO | null {

    if (!roomResponse.resourceEmail) return null;

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

export function mapRoomToRequestDTO(room: Room): RoomRequestDTO {
    return {
        email: room.email,
        name: room.name,
        capacity: room.capacity,
        description: room.description,
        floor: room.floor,
        type: room.type,
        is_busy: room.is_busy,
        current_event: room.current_event,
        resources: room.resources,
        events: [] // los eventos se pueden setean después
    };
}

function extractFeatures(dto: RoomResponseDTO): string[] {
    if (!dto.featureInstances) return [];
    return dto.featureInstances
        .map((fi: any) => fi?.feature?.name)
        .filter((n): n is string => typeof n === 'string' && n.trim().length > 0);
}

