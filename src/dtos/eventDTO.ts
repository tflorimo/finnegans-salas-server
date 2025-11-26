import { ResponseStatus, OverlapStatus, CheckInStatus } from '../constants/eventStatuses';
import { PaginatedResponse } from './paginationDTO';
import { Attendee } from '../models/event.types';

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

export interface EventListItemDTO {
  id: string;
  title: string;
  creatorMail: string;
  creatorName?: string;
  roomEmail: string;
  roomName?: string;
  startTime: Date;
  endTime: Date;
  checkInStatus: CheckInStatus;
  overlapStatus: OverlapStatus;
  attendees: Attendee[];
  createdAt: Date;
  updatedAt: Date;
}

export interface EventListResponseDTO extends PaginatedResponse<EventListItemDTO> {}