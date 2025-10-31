import { ResponseStatus } from "../dtos/eventDTO";

export interface Attendee {
    email: string;
    responseStatus: ResponseStatus;
    resource: boolean;
}

export interface EventAttributes {
    id: string;
    creatorMail: string;
    roomEmail: string;
    title: string;
    startTime: Date;
    endTime: Date;
    checkedIn: boolean;
    attendees: Attendee[];
    organizerEmail?: string | null;
}