import eventService from "./eventService";
import { CheckInStatus } from "../dtos/eventDTO";
import { Event } from "../models";
import overlapService from "./overlapService";
import { FIFTEEN_MINUTES_MS } from "./checkInService";

// Servicio para determinar evento activo, filtrar y definir estado del evento en curso de una sala
class CurrentEventService {

    async findActiveEvents(roomEmail: string, now: Date): Promise<{primaryEvent: Event; activeEvents: Event[]} | null> {
        const allEvents = await eventService.getActiveEventsByRoomId(roomEmail);

        if (allEvents.length === 0) return null;

        const activeEvents = this.filterActiveEvents(allEvents, now);

        if (activeEvents.length === 0) return null;

        if (activeEvents.length === 1) {
            return { primaryEvent: activeEvents[0], activeEvents };
        }

        const sortedEvents = overlapService.evaluatePriority(activeEvents, now);
        const primaryEvent = sortedEvents[0];

        return { primaryEvent, activeEvents };
    }

    // @TODO: podría ser un utils para no ir y venir de overlapService a currentEventService
    filterActiveEvents(events: Event[], now: Date): Event[] {
        return events.filter(event => {
            const eventStart = new Date(event.startTime).getTime();
            const eventEnd = new Date(event.endTime).getTime();
            const fifteenMinutesAfterStart = eventStart + FIFTEEN_MINUTES_MS;
            const nowTime = now.getTime();

            if (nowTime < eventStart || nowTime >= eventEnd) {
                return false;
            }

            if (nowTime > fifteenMinutesAfterStart) {
                if (event.checkInStatus !== CheckInStatus.CHECKED_IN) {
                    return false;
                }
            }

            return true;
        });
    }

    async isCurrentEventEnded(currentEventId: string | null): Promise<boolean> {
        if (!currentEventId) return false;

        const currentEvent = await eventService.getEventById(currentEventId);
        if (!currentEvent || currentEvent.deletedAt) return true;

        return new Date(currentEvent.endTime).getTime() <= Date.now();
    }

    async isCurrentEventStarted(currentEventId: string | null): Promise<boolean> {
        if (!currentEventId) return false;
        const currentEvent = await eventService.getEventById(currentEventId);
        if (!currentEvent || currentEvent.deletedAt) return false;
        
        return new Date(currentEvent.startTime).getTime() <= Date.now();
    }
}

export default new CurrentEventService();