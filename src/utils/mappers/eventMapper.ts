import { AttendeeDTO, EventDTO, EventDTOResponse } from "../../dtos/eventDTO";
import { Event } from "../../models";
import { EventAttributes } from "../../models/event.types";
import { getDateWithoutTime } from "../dateUtils.ts";
//TODO: Son muy similares los mappers, quizá con una sobrecarga de funciones se podría optimizar
export function updateEvent(eventResponse: any, existingEvent: Event): EventAttributes {

    const attendees: AttendeeDTO[] = eventResponse.attendees.map((attendee: any) => ({
        email: attendee.email,
        responseStatus: attendee.responseStatus,
        resource: attendee.resource || false,
    }));

    return {
        id: eventResponse.id as string,
        creatorMail: eventResponse.creator.email as string,
        roomEmail: existingEvent.roomEmail,
        startTime: new Date(eventResponse.start.dateTime),
        title: eventResponse.summary as string,
        endTime: new Date(eventResponse.end.dateTime),
        checkedIn: existingEvent.checkedIn,
        attendees: attendees,
    } as EventDTO;
}

export function mapResponseToEventDTO(eventResponse: any, roomEmail: string): EventDTO {

    const attendees: AttendeeDTO[] = eventResponse.attendees.map((attendee: any) => ({
        email: attendee.email,
        responseStatus: attendee.responseStatus,
        resource: attendee.resource || false,
    }));

    return {
        id: eventResponse.id as string,
        creatorMail: eventResponse.creator.email as string,
        roomEmail: roomEmail,
        startTime: new Date(eventResponse.start.dateTime),
        title: eventResponse.summary as string,
        endTime: new Date(eventResponse.end.dateTime),
        checkedIn: false, // propietario de la app (indica estado, es un boolean)
        attendees: attendees,
    } as EventDTO;
}

export function mapEventToResponseDTO(event: Event, creatorName: string): EventDTOResponse {
  const room = (event as any).room as { name?: string } | undefined;

  return {
    id: event.id,
    creatorMail: event.creatorMail,
    roomEmail: event.roomEmail,
    startTime: event.startTime,
    title: event.title,
    endTime: event.endTime,
    checkedIn: event.checkedIn,
    attendees: event.attendees as AttendeeDTO[],
    ...(room?.name ? { roomName: room.name } : {}),
    date: getDateWithoutTime(event.startTime),
    creatorName: creatorName,
  };
}