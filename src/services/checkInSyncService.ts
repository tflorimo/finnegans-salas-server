import { Room } from "../models";
import { CheckInStatus } from "../dtos/eventDTO";
import eventService from "./eventService";
import { getEventTimestamps } from "../utils/checkInUtils";
import checkInService from "./checkInService";
import nodemailerService from "./nodemailerService";

class CheckInSyncService {

    // Memoria en RAM de recordatorios ya enviados por evento + usuario (para evitar mails duplicados)
    private sentReminders: Set<string> = new Set();

    async processCheckInEventsStatuses(room: Room): Promise<void> {
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
                        this.sentReminders.add(reminderKey);

                        nodemailerService.sendNotificationEmail({
                            type: 'CHECK_IN_REMINDER',
                            userEmail: attendee.email,
                            eventId: event.id,
                            roomEmail: room.email,
                        })
                            .catch((error) => {
                                console.error('[CheckInService] Falló envío de recordatorio de check-in:', error);
                            });
                    }
                }
            }

            if (newStatus !== event.checkInStatus) {
                await eventService.updateEventCheckInStatus(event.id, newStatus);

                if (newStatus === CheckInStatus.EXPIRED) {
                    console.log(
                        `► [CheckInService] Check-in expirado del evento:` +
                        `\n  id evento: ${event.id}` +
                        `\n  nombre evento: ${event.title || "Sin nombre"}` +
                        `\n  acción: checkInStatus actualizado a ${newStatus}`
                    );
                }
            }
        }
    }
}

export default new CheckInSyncService();