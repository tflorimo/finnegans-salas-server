export type ResponseStatus = 'accepted' | 'declined' | 'tentative' | 'needsAction';

export enum OverlapStatus {
  NONE = "NONE",
  PRIMARY = "PRIMARY",
  OVERLAPPED = "OVERLAPPED",
}

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
    attendees: AttendeeDTO[];
    overlapStatus: OverlapStatus;
    scheduleUpdatedAt?: Date | null;
}

export interface EventCheckInDTO extends EventDTO {
    checkInStatus: CheckInStatus;
}

// Para el frontend
export interface EventDTOResponse extends EventCheckInDTO {
    roomName?: string;
    date: Date;
    creatorName: string;
    deletedAt?: Date | null;
}