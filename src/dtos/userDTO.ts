export interface UserDTO {
    id: number;
    name: string;
    email: string;
    role: string;
}

export interface UserWithEventsDTO {
    id: number;
    name: string;
    email: string;
    role: string;
    events: {
        id: number;
        googleEventId: string;
        title: string;
        startTime: Date;
        endTime: Date;
        checkedIn: boolean;
    }[];
}