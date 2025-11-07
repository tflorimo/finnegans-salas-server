/**
 * email = resourceEmail
 * name = resourceName
 * capacity = capacity
 * description = userVisibleDescription
 * floor = floorName (OJO QUE ES UN STRING)
 * type = resourceType
 * is_busy = propietario de la app (indica estado, es un boolean)
 * resources = JSON de strings con features (ej: ["wifi", "camara web hd"] )
 * recursos: {
 * "wifi",
 * "proyector",
 * "camara web hd"
 * }
 */

import { EventDTO } from "./eventDTO";

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
export interface RoomRequestDTO extends RoomDTO {
    current_event: string | null;
    events: EventDTO[];
}