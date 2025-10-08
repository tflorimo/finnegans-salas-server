export interface EventDTO {
    id: number;
    googleEventId: string;
    title: string;
    startTime: Date;
    endTime: Date;
    checkedIn: boolean;
    room: {
        email: string;
        name: string;
        displayName: string;
        capacity: number;
        description: string | null;
    };
    creator: {
        id: number;
        name: string;
        email: string;
        role: string;
    };
}
export interface EventDetailDTO extends EventDTO {
    attendees: string[];
}