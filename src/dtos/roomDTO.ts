export interface RoomDTO {
    email: string;
    name: string;
    displayName: string;
    capacity: number;
    description: string | null;
}

export interface RoomWithEventsDTO {
    email: string;
    name: string;
    displayName: string;
    capacity: number;
    description: string | null;
    events: {
        id: number;
        title: string;
        startTime: Date;
        endTime: Date;
        creator: {
            id: number;
            name: string;
            email: string;
        };
    }[];
}