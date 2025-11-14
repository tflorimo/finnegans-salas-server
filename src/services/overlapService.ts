import { Event } from "../models";
import currentEventService from "./currentEventService";
import eventService from "./eventService";
import roomSyncService from "./roomSyncService";

// Servicio dedicado a la gestión de superposiciones de eventos
class OverlapService {

    wasEventModified(event: Event): boolean {
        return event.createdAt.getTime() !== event.updatedAt.getTime();
    }

    async handleOverlappingEvents(primaryEvent: Event, activeEvents: Event[]) {
        const primaryWasModified = this.wasEventModified(primaryEvent);

        for (const event of activeEvents) {
            if (event.id !== primaryEvent.id) {
                const eventWasModified = this.wasEventModified(event);
                const shouldMarkAsExpired = !primaryWasModified || eventWasModified;

                if (shouldMarkAsExpired) {
                    const wasMarked = await eventService.markEventAsOverlapping(event.id);

                    if (wasMarked && roomSyncService.shouldLog(`overlap:${event.id}:${primaryEvent.id}`)) {
                        const reason = !primaryWasModified ? 'overlap original' : 'ambos modificados';
                        console.log(
                            `[OverlapService] Evento ${event.id} marcado como superpuesto ` +
                            `(${reason}). Primario: ${primaryEvent.id}`
                        );
                    }

                } else {
                    if (roomSyncService.shouldLog(`unmodified:${event.id}:${primaryEvent.id}`)) {
                        console.log(
                            `[OverlapService] Evento ${event.id} ` +
                            `(NO modificado) mantiene prioridad sobre primario modificado ${primaryEvent.id}`
                        );
                    }
                }
            }
        }
    }

    // Evalúa y ordena eventos según prioridad definida
    evaluatePriority(events: Event[], now: Date): Event[] {
        return [...events].sort((a, b) => {
            const aModified = a.createdAt.getTime() !== a.updatedAt.getTime();
            const bModified = b.createdAt.getTime() !== b.updatedAt.getTime();
            const aStartTime = new Date(a.startTime).getTime();
            const bStartTime = new Date(b.startTime).getTime();
            const nowTime = now.getTime();

            if (aModified && !bModified) {
                if (nowTime >= bStartTime) {
                    return 1;
                }
                return -1;
            }

            if (!aModified && bModified) {
                if (nowTime >= aStartTime) {
                    return -1;
                }
                return 1;
            }

            const aEffectiveTime = aModified ? a.updatedAt.getTime() : a.createdAt.getTime();
            const bEffectiveTime = bModified ? b.updatedAt.getTime() : b.createdAt.getTime();

            if (aEffectiveTime !== bEffectiveTime) {
                return aEffectiveTime - bEffectiveTime;
            }

            if (aStartTime !== bStartTime) {
                return aStartTime - bStartTime;
            }

            return a.id.localeCompare(b.id);
        });
    }

    // Verifica si dos eventos se superponen en el tiempo
    private eventsOverlap(event1Start: Date, event1End: Date, event2Start: Date, event2End: Date): boolean {
        const start1 = new Date(event1Start).getTime();
        const end1 = new Date(event1End).getTime();
        const start2 = new Date(event2Start).getTime();
        const end2 = new Date(event2End).getTime();

        return start1 < end2 && start2 < end1;
    }

    // Verifica si un evento está superpuesto con otros
    async checkEventOverlap(eventId: string, roomEmail: string, startTime: Date, endTime: Date): Promise<{
        isOverlapping: boolean;
        isPrimary: boolean;
        primaryEventId?: string;
    }> {
        const overlappingEvents = await eventService.getActiveEventsByRoomId(roomEmail);
        const overlaps = overlappingEvents.filter(event =>
            event.id !== eventId &&
            this.eventsOverlap(startTime, endTime, event.startTime, event.endTime)
        );

        if (overlaps.length === 0) {
            return { isOverlapping: false, isPrimary: true };
        }

        const currentEvent = await Event.findByPk(eventId);
        if (!currentEvent) {
            return { isOverlapping: false, isPrimary: true };
        }

        const allEvents = [...overlaps, currentEvent];

        const now = new Date();
        const activeEvents = currentEventService.filterActiveEvents(allEvents, now);

        if (activeEvents.length === 0) {
            return { isOverlapping: true, isPrimary: false, primaryEventId: undefined };
        }

        const sortedEvents = this.evaluatePriority(activeEvents, now);
        const primaryEvent = sortedEvents[0];

        const isPrimary = primaryEvent.id === eventId;

        return {
            isOverlapping: true,
            isPrimary,
            primaryEventId: primaryEvent.id,
        };
    }

}

export default new OverlapService();