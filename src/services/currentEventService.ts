import eventService from './eventService';
import { CheckInStatus } from '../dtos/eventDTO';
import { Event } from '../models';
import overlapService from './overlapService';
import checkInService, { FIFTEEN_MINUTES_MS } from './checkInService';

// Servicio para determinar evento activo, filtrar y determinar estado del evento en curso de una sala
class CurrentEventService {

    async findActiveEvent(roomEmail: string, now: Date): Promise<string | null> {

        const allEvents = await eventService.getActiveEventsByRoomId(roomEmail);

        if (allEvents.length === 0) return null;

        const eventsInProgress = allEvents.filter(event => {
            const start = new Date(event.startTime).getTime();
            const end = new Date(event.endTime).getTime();
            const nowTime = now.getTime();
            return nowTime >= start && nowTime < end;
        });

        if (eventsInProgress.length === 0) return null;

        if (eventsInProgress.length === 1) {
            return eventsInProgress[0].id;
        }

        const activeEvents = this.filterActiveEvents(eventsInProgress, now);

        if (activeEvents.length === 0) return null;

        const sortedEvents = overlapService.evaluatePriority(activeEvents, now);
        const primaryEvent = sortedEvents[0];

        if (primaryEvent.checkInStatus === CheckInStatus.EXPIRED) {
            const newStatus = checkInService.determineCheckInStatus(
                primaryEvent.startTime,
                primaryEvent.endTime,
                CheckInStatus.EXPIRED
            );

            if (newStatus !== CheckInStatus.EXPIRED) {
                await eventService.updateEventCheckInStatus(primaryEvent.id, newStatus);
                console.log(
                    `[CurrentEventService] Evento ${primaryEvent.id} promovido de EXPIRED a ` +
                    `${newStatus} (ahora es primario)`
                );
            }
        }

        // Mientras sucede la sincronización local, se testea la superposición de eventos
        await overlapService.handleOverlappingEvents(primaryEvent, activeEvents);
        return primaryEvent.id;
    }

    filterActiveEvents(events: Event[], now: Date): Event[] {
        return events.filter(event => {
            const eventStart = new Date(event.startTime).getTime();
            const eventEnd = new Date(event.endTime).getTime();
            const fifteenMinutesAfterStart = eventStart + FIFTEEN_MINUTES_MS;
            const nowTime = now.getTime();

            if (nowTime < eventStart) {
                return false;
            }

            if (nowTime >= eventEnd) {
                return false;
            }

            if (nowTime > fifteenMinutesAfterStart && event.checkInStatus !== CheckInStatus.CHECKED_IN) {
                return false;
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
}

export default new CurrentEventService();