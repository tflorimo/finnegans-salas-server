import { CheckInErrorCode } from "../constants/checkInErrors";
import { Event } from "../models";
import { getEventTimestamps } from "../utils/checkInUtils";
import eventService from "./eventService";

// Servicio dedicado a la gestión de superposiciones de eventos
class OverlapService {

    /**
     * Lock de prioridad:
     * Si un evento ganó prioridad siendo NO modificado frente a modificados,
     * se guarda un "candado" hasta su endTime actual. Durante ese tiempo,
     * aunque luego se modifique, sigue siendo candidato protegido a primario.
     */
    private primaryLockUntil: Map<string, Date> = new Map();

    /**
     * Horarios originales de eventos:
     * Guarda el primer horario conocido de cada evento (startTime y endTime).
     * Se usa para verificar si eventos superpuestos ORIGINALMENTE no lo estaban.
     */
    private originalSchedules: Map<string, { startTime: Date; endTime: Date }> = new Map();

    saveOriginalScheduleFromDTO(eventId: string, startTime: Date, endTime: Date): void {
        if (!this.originalSchedules.has(eventId)) {
            this.originalSchedules.set(eventId, {
                startTime: new Date(startTime),
                endTime: new Date(endTime),
            });
        }
    }

    private getOriginalSchedule(event: Event): { startTime: Date; endTime: Date } {
        const original = this.originalSchedules.get(event.id);
        if (original) {
            return original;
        }
        return {
            startTime: new Date(event.startTime),
            endTime: new Date(event.endTime),
        };
    }

    cleanExpiredOriginalSchedules(now: Date = new Date()): void {
        const nowMs = now.getTime();
        let cleanedCount = 0;

        for (const [eventId, schedule] of this.originalSchedules.entries()) {
            if (schedule.endTime.getTime() < nowMs) {
                this.originalSchedules.delete(eventId);
                cleanedCount++;
            }
        }
    }

    private doTimesOverlap(
        start1: Date,
        end1: Date,
        start2: Date,
        end2: Date
    ): boolean {
        const s1 = start1.getTime();
        const e1 = end1.getTime();
        const s2 = start2.getTime();
        const e2 = end2.getTime();
        return s1 < e2 && s2 < e1;
    }

    private eventsOverlappedOriginally(eventA: Event, eventB: Event): boolean {
        const scheduleA = this.getOriginalSchedule(eventA);
        const scheduleB = this.getOriginalSchedule(eventB);
        return this.doTimesOverlap(
            scheduleA.startTime,
            scheduleA.endTime,
            scheduleB.startTime,
            scheduleB.endTime
        );
    }

    eventsOverlap(a: Event, b: Event): boolean {
        return this.doTimesOverlap(
            new Date(a.startTime),
            new Date(a.endTime),
            new Date(b.startTime),
            new Date(b.endTime)
        );
    }

    private isEventInCheckInWindow(event: Event, now: Date): boolean {
        const nowMs = now.getTime();
        const { end, tenMinutesBefore, fifteenMinutesAfterStart } = getEventTimestamps(
            event.startTime,
            event.endTime
        );

        if (nowMs >= end) return false;
        if (nowMs < tenMinutesBefore) return false;
        if (nowMs > fifteenMinutesAfterStart) return false;

        return true;
    }

    private sortByCheckInPriority(events: Event[]): Event[] {
        return [...events].sort((a, b) => {
            const aStart = new Date(a.startTime).getTime();
            const bStart = new Date(b.startTime).getTime();

            if (aStart !== bStart) {
                return aStart - bStart;
            }

            const aCreated = a.createdAt?.getTime() ?? 0;
            const bCreated = b.createdAt?.getTime() ?? 0;

            if (aCreated !== bCreated) {
                return aCreated - bCreated;
            }

            return a.id.localeCompare(b.id);
        });
    }

    // Verificación de superposición para check-in
    async checkEventOverlapForCheckIn(
        event: Event,
        roomEmail: string,
        now: Date = new Date()
    ): Promise<{ canCheckIn: boolean; errorCode?: CheckInErrorCode }> {

        const overlappingEvents = await eventService.getEventsByRoomIdWithTimeRange(
            roomEmail,
            event.startTime,
            event.endTime
        );

        const otherEvents = overlappingEvents.filter(e =>
            e.id !== event.id && !e.deletedAt
        );

        const nowEvents = otherEvents.filter(e =>
            this.eventsOverlap(e, event) &&
            this.isEventInCheckInWindow(e, now)
        );

        if (nowEvents.length === 0) {
            return { canCheckIn: true };
        }

        const originallyOverlappedEvents = nowEvents.filter(e =>
            this.eventsOverlappedOriginally(event, e)
        );

        if (originallyOverlappedEvents.length === 0) {
            return { canCheckIn: true };
        }

        const scopedEvents: Event[] = [event, ...nowEvents];
        const ordered = this.sortByCheckInPriority(scopedEvents);
        const primary = ordered[0];

        if (event.id === primary.id) {
            return { canCheckIn: true };
        }

        return {
            canCheckIn: false,
            errorCode: CheckInErrorCode.EVENT_OVERLAPPED,
        };
    }

    wasEventTimeModified(event: Event): boolean {
        return event.scheduleUpdatedAt != null;
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

    /**
     * Indica si el evento tiene un "lock" de prioridad vigente.
     * Si el lock ya expiró, se limpia.
     */
    private isProtectedPrimaryCandidate(event: Event, now: Date): boolean {
        const lock = this.primaryLockUntil.get(event.id);
        if (!lock) return false;

        const nowMs = now.getTime();
        const lockMs = lock.getTime();

        if (nowMs >= lockMs) {
            this.primaryLockUntil.delete(event.id);
            return false;
        }

        return true;
    }

    /**
     * Criterio de selección de primario para un grupo de eventos superpuestos.
     * Se usa desde OverlapSyncService (eventos activos).
     *
     * Reglas:
     * - Candidatos prioritarios:
     *   - Eventos NO modificados.
     *   - Eventos con lock de prioridad vigente.
     * - Si hay candidatos, el primario sale de ese subconjunto.
     * - Si NO hay candidatos, todos se consideran modificados sin protección:
     *   primario por evaluatePriority sobre todo el grupo.
     * - SOLO se pone lock cuando:
     *   - El primario es NO modificado, y
     *   - Hay al menos otro evento MODIFICADO en el grupo.
     */
    selectPrimaryForOverlapGroup(
        events: Event[],
        now: Date
    ): { primary: Event; reason: string } {
        if (events.length === 0) {
            throw new Error("[OverlapService] selectPrimaryForOverlapGroup llamado con grupo vacío");
        }

        const priorityCandidates = events.filter(ev => {
            const isModified = this.wasEventTimeModified(ev);
            if (!isModified) return true;
            return this.isProtectedPrimaryCandidate(ev, now);
        });

        const hasAnyModified = events.some(ev => this.wasEventTimeModified(ev));
        let primary: Event;
        let reason: string;

        if (priorityCandidates.length > 0) {
            const ordered = this.evaluatePriority(priorityCandidates, now);
            primary = ordered[0];

            const allCandidatesNonModified = priorityCandidates.every(
                ev => !this.wasEventTimeModified(ev)
            );

            if (allCandidatesNonModified && !hasAnyModified) {
                reason =
                    "Prioridad por antigüedad/horario";
            } else if (allCandidatesNonModified && hasAnyModified) {
                reason =
                    "Se priorizan los no modificados";
            } else {
                reason =
                    "Candidatos protegidos por lock de prioridad frente a otros modificados";
            }

            const primaryIsUnmodified = !this.wasEventTimeModified(primary);
            const hasModifiedOtherThanPrimary = events.some(
                ev => ev.id !== primary.id && this.wasEventTimeModified(ev)
            );

            if (primaryIsUnmodified && hasModifiedOtherThanPrimary) {
                this.primaryLockUntil.set(primary.id, new Date(primary.endTime));
            }
        } else {
            const ordered = this.evaluatePriority(events, now);
            primary = ordered[0];
            reason =
                "Prioridad por updatedAt/createdAt/startTime";
        }

        return { primary, reason };
    }
}

export default new OverlapService();
