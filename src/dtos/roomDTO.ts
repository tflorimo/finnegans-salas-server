import { EventDTOResponse } from "./eventDTO";

export interface RoomResponseDTO {
    resourceEmail: string;
    resourceName: string;
    capacity: number;
    userVisibleDescription: string | null;
    floorName: string;
    resourceType: string;
    featureInstances: string[] | null;
}

export interface RoomDTO {
    email: string;
    name: string;
    capacity: number;
    description: string | null;
    type: string;
    floor: string;
    is_busy: boolean;
    resources: string[] | null;
}

// Para DB
export interface RoomCreateDTO extends RoomDTO {
    current_event: string | null;
}

// Para Frontend
export interface RoomRequestDTO extends RoomDTO {
    current_event: EventDTOResponse | null;
    events: EventDTOResponse[];
}