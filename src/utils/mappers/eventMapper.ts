import {
    AttendeeDTO,
    EventDTOResponse,
    CheckInStatus,
    EventCheckInDTO,
    OverlapStatus
} from "../../dtos/eventDTO";
import { Event } from "../../models";
import { EventAttributes } from "../../models/event.types";
import { FIFTEEN_MINUTES_MS } from "../../utils/checkInUtils";
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
        title: eventResponse.summary || "(Sin Título)" as string,
        startTime: new Date(eventResponse.start.dateTime),
        endTime: new Date(eventResponse.end.dateTime),
        attendees: mapAttendees(eventResponse.attendees || []),
    };
}

// Actualiza un evento existente con datos de Google Calendar, preservando checkInStatus y overlapStatus,
// y actualizando scheduleUpdatedAt solo si cambió el horario
export function mapUpdatedEvent(eventResponse: any, existingEvent: Event): EventAttributes {
    const commonFields = mapCommonEventFields(eventResponse);

    const newStartTime = commonFields.startTime ?? existingEvent.startTime;
    const newEndTime = commonFields.endTime ?? existingEvent.endTime;

    const scheduleChanged =
        newStartTime.getTime() !== existingEvent.startTime.getTime() ||
        newEndTime.getTime() !== existingEvent.endTime.getTime();

    const scheduleUpdatedAt = scheduleChanged
        ? new Date()
        : existingEvent.scheduleUpdatedAt ?? null;

    return {
        ...commonFields,
        roomEmail: existingEvent.roomEmail,
        overlapStatus: existingEvent.overlapStatus || OverlapStatus.PRIMARY,
        scheduleUpdatedAt,
    } as EventAttributes;
}

// Mapea un evento nuevo desde Google Calendar API a EventDTO para check-in
export function mapResponseToEventDTO(eventResponse: any, roomEmail: string): EventCheckInDTO {
    const startTime = new Date(eventResponse.start.dateTime);
    const now = Date.now();
    const fifteenMinutesAfterStart = startTime.getTime() + FIFTEEN_MINUTES_MS;

    const initialStatus =
        now > fifteenMinutesAfterStart
            ? CheckInStatus.EXPIRED
            : CheckInStatus.PENDING;

    return {
        ...mapCommonEventFields(eventResponse),
        roomEmail: roomEmail,
        checkInStatus: initialStatus,
        overlapStatus: OverlapStatus.PRIMARY,
        scheduleUpdatedAt: null,
    } as EventCheckInDTO;
}

// Mapea un Event del modelo a EventDTOResponse para enviar al frontend
export function mapEventToResponseDTO(
    event: Event,
    creatorName: string,
    overlapStatus?: OverlapStatus
): EventDTOResponse {
    const room = (event as any).room as { name?: string } | undefined;

    let displayTitle = event.title;

    const now = new Date();
    const start = new Date(event.startTime);
    const end = new Date(event.endTime);
    const isActive = start <= now && end > now;

    if (isActive && overlapStatus === OverlapStatus.OVERLAPPED) {
        displayTitle = `[SUPERPUESTO] - ${event.title}`;
    }

    return {
        id: event.id,
        creatorMail: event.creatorMail,
        roomEmail: event.roomEmail,
        startTime: event.startTime,
        title: displayTitle,
        endTime: event.endTime,
        checkInStatus: event.checkInStatus,
        attendees: event.attendees as AttendeeDTO[],
        ...(room?.name ? { roomName: room.name } : {}),
        overlapStatus: overlapStatus || event.overlapStatus,
        scheduleUpdatedAt: event.scheduleUpdatedAt,
        date: getDateWithoutTime(event.startTime),
        creatorName: creatorName,
        deletedAt: event.deletedAt,
    };
}