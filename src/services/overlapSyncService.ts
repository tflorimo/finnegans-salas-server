import { Event } from "../models";
import { OverlapStatus } from "../constants/eventStatuses";
import eventService from "./eventService";
import overlapService from "./overlapService";
import auditService from "./auditService";

// Servicio dedicado a la sincronización local de overlapping
class OverlapSyncService {
    private isEventActive(event: Event, now: Date): boolean {
        const nowMs = now.getTime();
        const start = new Date(event.startTime).getTime();
        const end = new Date(event.endTime).getTime();

        return nowMs >= start && nowMs < end;
    }

    /**
     * Agrupa eventos activos en "componentes de superposición":
     * si A se solapa con B y B con C, van al mismo grupo, aunque A y C
     * no se solapen directamente.
     */
    private buildOverlapGroups(events: Event[]): Event[][] {
        if (events.length <= 1) return events.length === 0 ? [] : [events];

        const sorted = [...events].sort(
            (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
        );

        const groups: Event[][] = [];
        let currentGroup: Event[] = [sorted[0]];
        let currentGroupEnd = new Date(sorted[0].endTime).getTime();

        for (let i = 1; i < sorted.length; i++) {
            const ev = sorted[i];
            const evStart = new Date(ev.startTime).getTime();
            const evEnd = new Date(ev.endTime).getTime();

            if (evStart <= currentGroupEnd) {
                currentGroup.push(ev);
                if (evEnd > currentGroupEnd) {
                    currentGroupEnd = evEnd;
                }
            } else {
                groups.push(currentGroup);
                currentGroup = [ev];
                currentGroupEnd = evEnd;
            }
        }

        if (currentGroup.length > 0) {
            groups.push(currentGroup);
        }

        return groups;
    }

    // Aplica las reglas de prioridad a un grupo de eventos superpuestos en un instante dado.
    private async resolveGroupOverlap(group: Event[], now: Date): Promise<void> {
        if (group.length === 0) return;

        const { primary, reason } = overlapService.selectPrimaryForOverlapGroup(group, now);

        for (const ev of group) {
            const newStatus =
                ev.id === primary.id ? OverlapStatus.PRIMARY : OverlapStatus.OVERLAPPED;

            const changed = await eventService.setEventOverlapStatus(ev.id, newStatus);

            if (changed) {
                if (newStatus === OverlapStatus.OVERLAPPED) {
                    auditService.recordEventMarkedOverlap(ev.id, ev.title, reason).catch(err => {
                        console.error('[OverlapSyncService][audit] recordEventMarkedOverlap failed:', err);
                    });
                }
            }
        }
    }

    /**
     * Sincroniza el overlap de una sala en función de la hora actual,
     * tomando los eventos activos que ya están en memoria.
     * Llamado desde LocalStatusService.
     */
    async syncOverlapForActiveEvents(
        activeEvents: Event[] | undefined,
        now: Date
    ): Promise<void> {
        if (!activeEvents || activeEvents.length === 0) {
            return;
        }

        const currentActive = activeEvents.filter(ev =>
            !ev.deletedAt && this.isEventActive(ev, now)
        );

        if (currentActive.length === 0) {
            return;
        }

        const groups = this.buildOverlapGroups(currentActive);

        for (const group of groups) {
            await this.resolveGroupOverlap(group, now);
        }

        // Limpieza de schedules originales expirados en memoria
        overlapService.cleanExpiredOriginalSchedules(now);
    }
}

export default new OverlapSyncService();
