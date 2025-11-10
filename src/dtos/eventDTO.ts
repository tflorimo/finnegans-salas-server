export type ResponseStatus = 'accepted' | 'declined' | 'tentative' | 'needsAction';

export enum CheckInStatus {
    PENDING = 'pending',
    CHECKED_IN = 'checked_in',
    EXPIRED = 'expired'
}

export interface AttendeeDTO {
    email: string;
    responseStatus: ResponseStatus;
    resource: boolean;
}

export interface EventDTO {
    id: string;
    creatorMail: string;
    roomEmail: string;
    startTime: Date;
    title: string;
    endTime: Date;
    checkInStatus: CheckInStatus;
    attendees: AttendeeDTO[];
}
export interface EventDTOResponse extends EventDTO {
    roomName?: string;
    date: Date;
    creatorName: string;
    deletedAt?: Date | null;
}