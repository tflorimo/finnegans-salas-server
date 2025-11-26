import { ResponseStatus, CheckInStatus, OverlapStatus } from "../constants/eventStatuses";
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
    checkInStatus: CheckInStatus;
    attendees: Attendee[];
    organizerEmail?: string | null;
    overlapStatus: OverlapStatus;
    scheduleUpdatedAt?: Date | null;
}

export { CheckInStatus, ResponseStatus };