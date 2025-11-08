import { AttendeeDTO, EventDTO, EventDTOResponse, CheckInStatus } from "../../dtos/eventDTO";
import { Event } from "../../models";
import { EventAttributes } from "../../models/event.types";
import { getDateWithoutTime } from "../dateUtils";

// Helper para mapear attendees desde la respuesta de Google Calendar
function mapAttendees(attendees: any[]): AttendeeDTO[] {
    return attendees.map((attendee: any) => ({
        email: attendee.email,
        responseStatus: attendee.responseStatus,
        resource: attendee.resource || false,
    }));
}

// Helper para mapear campos comunes de eventos desde Google Calendar API
function mapCommonEventFields(eventResponse: any): Partial<EventAttributes> {
    return {
        id: eventResponse.id as string,
        creatorMail: eventResponse.creator.email as string,
        title: eventResponse.summary as string,
        startTime: new Date(eventResponse.start.dateTime),
        endTime: new Date(eventResponse.end.dateTime),
        attendees: mapAttendees(eventResponse.attendees || []),
    };
}

// Actualiza un evento existente con datos de Google Calendar, preservando checkInStatus
export function updateEvent(eventResponse: any, existingEvent: Event): EventAttributes {
    return {
        ...mapCommonEventFields(eventResponse),
        roomEmail: existingEvent.roomEmail,
        checkInStatus: existingEvent.checkInStatus, 
    } as EventAttributes;
}

// Mapea un evento nuevo desde Google Calendar API a EventDTO
export function mapResponseToEventDTO(eventResponse: any, roomEmail: string): EventDTO {
    const startTime = new Date(eventResponse.start.dateTime);
    const now = Date.now();
    const fifteenMinutesAfterStart = startTime.getTime() + (15 * 60 * 1000);
    
    // Determinar el estado inicial correcto según el tiempo
    const initialStatus = now > fifteenMinutesAfterStart 
        ? CheckInStatus.EXPIRED 
        : CheckInStatus.PENDING;

    return {
        ...mapCommonEventFields(eventResponse),
        roomEmail: roomEmail,
        checkInStatus: initialStatus,
    } as EventDTO;
}

// Mapea un Event del modelo a EventDTOResponse para enviar al frontend
export function mapEventToResponseDTO(event: Event, creatorName: string): EventDTOResponse {
    const room = (event as any).room as { name?: string } | undefined;

    return {
        id: event.id,
        creatorMail: event.creatorMail,
        roomEmail: event.roomEmail,
        startTime: event.startTime,
        title: event.title,
        endTime: event.endTime,
        checkInStatus: event.checkInStatus,
        attendees: event.attendees as AttendeeDTO[],
        ...(room?.name ? { roomName: room.name } : {}),
        date: getDateWithoutTime(event.startTime),
        creatorName: creatorName,
        deletedAt: event.deletedAt,
    };
}