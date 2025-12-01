import { Room } from "../models";
import { CheckInStatus } from "../constants/eventStatuses";
import eventService from "./eventService";
import { getEventTimestamps } from "../utils/checkInUtils";
import checkInService from "./checkInService";
import nodemailerService from "./nodemailerService";
import auditService from "./auditService";

class CheckInSyncService {

    // Memoria en RAM de recordatorios ya enviados por evento + usuario 
    private sentReminders: Map<string, number> = new Map();

    private cleanupOldReminders(): void {
        const now = Date.now();
        const oneDayMs = 24 * 60 * 60 * 1000;

        for (const [key, timestamp] of this.sentReminders.entries()) {
            if (now - timestamp > oneDayMs) {
                this.sentReminders.delete(key);
            }
        }
    }

    async processCheckInEventsStatuses(room: Room): Promise<void> {
        this.cleanupOldReminders();
        const events = await eventService.getEventsByRoomId(room.email);
        const now = Date.now();

        for (const event of events) {
            const newStatus = checkInService.determineCheckInStatus(
                event.startTime,
                event.endTime,
                event.checkInStatus
            );

            const { tenMinutesBefore, start } = getEventTimestamps(event.startTime, event.endTime);
            const isInReminderWindow =
                now >= tenMinutesBefore &&
                now <= start;

            const cleanedAttendees = event.attendees?.filter(attendee => {
                return attendee.email.toLowerCase() !== room.email.toLowerCase();
            });

            // Aviso por email de 10 a 8 min antes del inicio del evento a toda la lista de attendees
            if (isInReminderWindow && newStatus === CheckInStatus.PENDING) {
                for (const attendee of cleanedAttendees) {

                    const reminderKey = `${event.id}-${attendee.email}`;

                    if (!this.sentReminders.has(reminderKey)) { // Para evitar envíos duplicados
                        this.sentReminders.set(reminderKey, Date.now());

                        nodemailerService.sendNotificationEmail({
                            type: 'CHECK_IN_REMINDER',
                            userEmail: attendee.email,
                            eventId: event.id,
                            roomEmail: room.email,
                        })
                            .catch((error) => {
                                console.error('[CheckInService] Error al enviar recordatorio de check-in:', error);
                            });
                    }
                }
            }

            if (newStatus !== event.checkInStatus) {
                await eventService.updateEventCheckInStatus(event.id, newStatus);

                if (newStatus === CheckInStatus.EXPIRED) {


                    await auditService.recordCheckInExpired(event.id, event.title, room.name);
                }
            }
        }
    }
}

export default new CheckInSyncService();