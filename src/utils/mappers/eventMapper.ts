import { Model } from "sequelize";
import { EventDTO, EventDetailDTO } from "../../dtos/eventDTO";

export function mapEventToDTO(event: Model<Event>): EventDTO {
    const eventData = event.get({ plain: true }) as any;
    return {
        id: eventData.id,
        googleEventId: eventData.googleEventId,
        title: eventData.title,
        startTime: eventData.startTime,
        endTime: eventData.endTime,
        checkedIn: eventData.checkedIn,
        room: {
            email: eventData.Room?.email || '',
            name: eventData.Room?.name || '',
            displayName: eventData.Room?.displayName || '',
            capacity: eventData.Room?.capacity || 0,
            description: eventData.Room?.description || null,
        },
        creator: {
            id: eventData.User?.id || 0,
            name: eventData.User?.name || '',
            email: eventData.User?.email || '',
            role: eventData.User?.role || 'user',
        }
    };
}

export function mapEventToDetailDTO(event: Model): EventDetailDTO {
    const eventData = event.get({ plain: true }) as any;

    return {
        ...mapEventToDTO(event),
        attendees: eventData.attendees || []
    };
}

export function mapEventsToDTO(events: Model[]): EventDTO[] {
    return events.map(mapEventToDTO);
}