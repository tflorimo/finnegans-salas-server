/**
 * id: response.id
 * title: response.summary
 * startTime: response.start.dateTime
 * endTime: response.end.dateTime
 * checkedIn: propietario de la app (indica estado, es un boolean)
 * roomEmail: viene en el loop del job
 * creator: response.creator.email
 * attendees: array de AttendeeDTO
 */

export type ResponseStatus = 'accepted' | 'declined' | 'tentative' | 'needsAction';

export interface AttendeeDTO {
    email: string;
    responseStatus: ResponseStatus;
}

export interface EventDTO {
    id: string;
    creatorMail: string;
    roomEmail: string;
    startTime: Date;
    title: string;
    endTime: Date;
    checkedIn: boolean;
    attendees: AttendeeDTO[];
}