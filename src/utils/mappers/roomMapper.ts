import { RoomDTO, RoomResponseDTO} from "../../dtos/roomDTO";

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