import { Event } from "../models";
import { OverlapStatus } from "../dtos/eventDTO";
import eventService from "./eventService";
import overlapService from "./overlapService";

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
        const groups: Event[][] = [];
        const visited = new Set<string>();

        for (const ev of events) {
            if (!visited.has(ev.id)) {

                const group: Event[] = [];
                const stack: Event[] = [ev];

                while (stack.length > 0) {
                    const current = stack.pop()!;
                    if (!visited.has(current.id)) {

                        visited.add(current.id);
                        group.push(current);

                        for (const other of events) {
                            const shouldGroup =
                                !visited.has(other.id) && overlapService.eventsOverlap(current, other);

                            if (shouldGroup) stack.push(other);
                        }
                    }
                }

                if (group.length > 0) groups.push(group);
            }
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
                console.log(
                    `► [OverlapSyncService] actualización de overlapStatus en grupo:` +
                    `\n   id: ${ev.id}` +
                    `\n   nombre: ${ev.title || "Sin nombre"}` +
                    `\n   nuevo estado: ${newStatus}` +
                    `\n   primario de grupo: ${primary.id}` +
                    `\n   motivo: ${reason}`
                );
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
