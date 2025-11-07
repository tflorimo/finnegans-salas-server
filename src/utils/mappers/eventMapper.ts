import { AttendeeDTO, EventDTO, EventDTOResponse } from "../../dtos/eventDTO";
import { Event } from "../../models";

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
        startTime: eventResponse.start.dateTime as Date,
        title: eventResponse.summary as string,
        endTime: eventResponse.end.dateTime as Date,
        checkedIn: false, // propietario de la app (indica estado, es un boolean)
        attendees: attendees,
    } as EventDTO;
}

export function mapEventToResponseDTO(event: Event): EventDTOResponse {
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
  };
}