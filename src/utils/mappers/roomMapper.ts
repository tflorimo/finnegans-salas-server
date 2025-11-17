import { EventDTOResponse } from "../../dtos/eventDTO";
import { RoomCreateDTO, RoomDTO, RoomResponseDTO, RoomRequestDTO } from "../../dtos/roomDTO";
import { Room } from "../../models";

function extractFeatures(dto: RoomRequestDTO | any): string[] {
    const emptyFeaturesInstance = new Array<string>();

    if (!dto.featureInstances) return emptyFeaturesInstance;

    const features = dto.featureInstances
        .map((fi: any) => fi?.feature?.name)
        .filter((n: any): n is string => typeof n === 'string' && n.trim().length > 0);

    return features.length > 0 ? features : emptyFeaturesInstance;
}

function buildRoomName(resourceName: string, floorName: string): string {
    let roomName = resourceName || 'Sala sin nombre';

    const floorInName = roomName.match(/(?:Piso|Floor)\s*(\d+)/i)?.[1];

    if (floorInName !== floorName) {
        roomName = `${roomName} - Piso ${floorName}`;
    }

    return roomName;
}

function mapCommonRoomFields(resource: any, features: string[] | null): Partial<RoomDTO> {
    return {
        email: resource.resourceEmail,
        name: buildRoomName(resource.resourceName, resource.floorName),
        floor: resource.floorName,
        type: resource.resourceType || 'DEFAULT',
        capacity: resource.capacity || 0,
        description: resource.userVisibleDescription || null,
        resources: features,
    };
}

// Actualiza una room existente con datos de Google Admin SDK, preservando estado local
export function updateRoomMapper(
    resource: any, 
    currentIsBusy: boolean, 
    currentEventId: string | null
): RoomCreateDTO {
    const features = extractFeatures(resource);

    return {
        ...mapCommonRoomFields(resource, features),
        is_busy: currentIsBusy,
        current_event: currentEventId,
    } as RoomCreateDTO;
}

// Mapea una room nueva desde Google Admin SDK API a RoomDTO
export function mapRoomResponseToRoomDTO(roomResponse: RoomRequestDTO): RoomDTO | null {
    if (!roomResponse.resourceEmail) return null;

    const features = extractFeatures(roomResponse);

    return {
        ...mapCommonRoomFields(roomResponse, features),
        is_busy: false,
    } as RoomDTO;
}
// Normaliza la respuesta de Google Admin SDK a RoomRequestDTO
export function mapResponseToRoomRequestDTO(roomResponse: any): RoomRequestDTO {
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

// Mapea un Room del modelo a RoomResponseDTO para enviar al frontend
export function mapRoomToRequestDTO(room: Room, currentEvent: EventDTOResponse | null,
    events: EventDTOResponse[]): RoomResponseDTO {
    return {
        email: room.email,
        name: room.name,
        capacity: room.capacity,
        description: room.description,
        floor: room.floor,
        type: room.type,
        is_busy: room.is_busy,
        resources: room.resources,
        current_event: currentEvent,
        events: events,
    };
}