import { OverlapStatus } from "../dtos/eventDTO";
import { Event } from "../models";
import currentEventService from "./currentEventService";
import eventService from "./eventService";

// Servicio dedicado a la gestión de superposiciones de eventos
class OverlapService {

    wasEventTimeModified(event: Event): boolean {
        return event.scheduleUpdatedAt != null;
    }

    // Método derivado de la lógica de CurrentEventService, para manejar eventos superpuestos
    async handleOverlappingEvents(activeEvents: Event[] | undefined, primaryEvent: Event | undefined) {
        if (!primaryEvent || !activeEvents) {
            return;
        }

        const primaryWasModified = this.wasEventTimeModified(primaryEvent);

        for (const event of activeEvents) {
            if (event.id !== primaryEvent.id) {
                const areOverlapped = this.eventsOverlap(event.startTime, event.endTime, primaryEvent.startTime, primaryEvent.endTime);
                const eventWasModified = this.wasEventTimeModified(event);
                const shouldMarkAsOverlapped = !primaryWasModified || eventWasModified && areOverlapped;

                if (shouldMarkAsOverlapped) {
                    const wasMarked = await eventService.setEventOverlapStatus(event.id, OverlapStatus.OVERLAPPED);

                    if (wasMarked) {
                        const reason = !primaryWasModified ? '[OVERLAP]' : '[MODIFICADO]';
                        // @LOG
                        console.log(
                            `► [OverlapService] evento marcado como SUPERPUESTO:` +
                            `\n► Evento SUPERPUESTO:` +
                            `\n   id: ${event.id}` +
                            `\n   nombre: ${event.title || "Sin nombre"}` +
                            `\n► Evento PRIMARIO:` +
                            `\n   id: ${primaryEvent.id}` +
                            `\n   nombre: ${primaryEvent.title || "Sin nombre"}` +
                            `\n   motivo: ${reason}`
                        );
                    }
                }

            } else {
                
                if (event.overlapStatus !== OverlapStatus.PRIMARY) {
                    await eventService.setEventOverlapStatus(event.id, OverlapStatus.PRIMARY);
                    // @LOG
                    console.log(
                        `► [OverlapService] resolución de prioridad entre eventos:` +
                        `\n► Evento SUPERPUESTO (mantiene prioridad):` +
                        `\n   id: ${event.id}` +
                        `\n   nombre: ${event.title || "Sin nombre"}` +
                        `\n   estado: no modificado` +
                        `\n► Evento PRIMARIO (modificado):` +
                        `\n   id: ${primaryEvent.id}` +
                        `\n   nombre: ${primaryEvent.title || "Sin nombre"}` +
                        `\n   motivo: el superpuesto no fue modificado y conserva prioridad`
                    );
                }
            }
        }
    }

    // Evalúa y ordena eventos según prioridad definida
    evaluatePriority(events: Event[], now: Date): Event[] {
        return [...events].sort((a, b) => {
            const aModified = this.wasEventTimeModified(a);
            const bModified = this.wasEventTimeModified(b);
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

    // Verifica si un evento está superpuesto con otros antes de realizar un checkIn
    async checkEventOverlapForCheckIn(eventId: string, roomEmail: string, startTime: Date, endTime: Date): Promise<{
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

        const currentEvent = await eventService.getEventById(eventId);
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