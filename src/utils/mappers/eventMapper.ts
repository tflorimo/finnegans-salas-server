import { AttendeeDTO, EventDTO } from "../../dtos/eventDTO";

export function mapResponseToEventDTO(eventResponse: any, roomEmail: string): EventDTO {

    const attendees: AttendeeDTO[] = eventResponse.attendees.map((attendee: any) => ({
        email: attendee.email,
        responseStatus: attendee.responseStatus
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