import { EventDTOResponse } from "../../dtos/eventDTO";
import { RoomCreateDTO, RoomDTO, RoomRequestDTO, RoomResponseDTO } from "../../dtos/roomDTO";
import { Room } from "../../models";

// Helper para extraer features desde la respuesta de Google Admin SDK
function extractFeatures(dto: RoomResponseDTO | any): string[] {
    if (!dto.featureInstances) return [];
    return dto.featureInstances
        .map((fi: any) => fi?.feature?.name)
        .filter((n: any): n is string => typeof n === 'string' && n.trim().length > 0);
}

// Helper para mapear campos comunes de rooms
function mapCommonRoomFields(resource: any, features: string[]): Partial<RoomDTO> {
    return {
        email: resource.resourceEmail,
        name: resource.resourceName,
        floor: resource.floorName,
        type: resource.resourceType,
        capacity: resource.capacity || 0,
        description: resource.userVisibleDescription || null,
        resources: features.length > 0 ? features : null,
    };
}

// Este actualiza una room existente con datos de Google Admin SDK, preservando estado local
export function updateRoom(resource: any, room: RoomCreateDTO | Room): RoomCreateDTO {
    const features = extractFeatures(resource);
    const is_busy = room instanceof Room ? room.get('is_busy') : room.is_busy;
    const current_event = room instanceof Room ? room.get('current_event') : room.current_event;

    return {
        ...mapCommonRoomFields(resource, features),
        is_busy: is_busy as boolean,
        current_event: current_event as string | null,
    } as RoomCreateDTO;
}

// Mapea una room nueva desde Google Admin SDK API a RoomDTO
export function mapRoomResponseToRoomDTO(roomResponse: RoomResponseDTO): RoomDTO | null {
    if (!roomResponse.resourceEmail) return null;

    const features = extractFeatures(roomResponse);

    return {
        ...mapCommonRoomFields(roomResponse, features),
        is_busy: false, // Nueva room siempre disponible
    } as RoomDTO;
}

// Normaliza la respuesta de Google Admin SDK a RoomResponseDTO
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

// Mapea un Room del modelo a RoomRequestDTO para enviar al frontend
// NOTA: current_event y events se enriquecen después en el servicio
export function mapRoomToRequestDTO(room: Room, currentEvent: EventDTOResponse | null, events: EventDTOResponse[]): RoomRequestDTO {
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

