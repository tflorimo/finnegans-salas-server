import { google, Auth } from 'googleapis';
import path from 'path';
import roomService from '../services/roomService';
import eventService from '../services/eventService';
import { mapResponseToEventDTO, updateEvent } from '../utils/mappers/eventMapper';
import { getCalendarSyncRange } from '../utils/dateUtils';
import checkInService from './checkInService';

// Servicio encargado de sincronizar eventos de Google Calendar con la base local.
class CalendarSyncService {
    private readonly SERVICE_ACCOUNT_FILE: string;
    private readonly SCOPES: string[];

    constructor() {
        this.SERVICE_ACCOUNT_FILE = path.join(__dirname, '../../auth/service_account_key.json');
        this.SCOPES = ['https://www.googleapis.com/auth/calendar'];
    }

    private async getCalendarClient(adminEmail: string) {
        const auth = new google.auth.GoogleAuth({
            keyFile: this.SERVICE_ACCOUNT_FILE,
            scopes: this.SCOPES,
            clientOptions: {
                subject: adminEmail,
            },
        });

        const authClient = await auth.getClient();
        return google.calendar({ version: 'v3', auth: authClient as Auth.JWT });
    }

    // Helper para determinar la sala real de un evento a partir de sus attendees
    private getRoomEmailFromEvent(
        event: any,
        calendarEmail: string,
    ): string {
        const attendees = event.attendees || [];
        const roomAttendees = attendees.filter(
            (a: any) =>
                a &&
                a.resource &&
                a.responseStatus !== 'declined' &&
                typeof a.email === 'string'
        );

        // Si tiene una o más salas como resource, tomamos la primera de la lista.
        // Esto hace que, en escenarios de múltiples salas, la fuente de verdad sea el orden
        // de los attendees y no el roomEmail previamente guardado
        if (roomAttendees.length > 0) {
            return roomAttendees[0].email as string;
        }

        return calendarEmail;
    }

    // Sincroniza los eventos de todas las rooms obtenidas desde roomService.
    async syncAllRoomsEvents(adminEmail: string): Promise<void> {
        const roomEmails = await roomService.getAllRoomEmails();
        const calendar = await this.getCalendarClient(adminEmail);
        const { start, end } = getCalendarSyncRange();

        for (const email of roomEmails) {
            try {
                const response = await calendar.events.list({
                    calendarId: email,
                    timeMin: start.toISOString(),
                    timeMax: end.toISOString(),
                    maxResults: 250,
                    singleEvents: true,
                    orderBy: 'startTime',
                });

                const events = response.data.items || [];
                const eventIdsFromCalendar = events.map(event => event.id!);
                const localEvents = await eventService.getEventsByRoomId(email);

                // Soft delete de eventos que ya no están en Google Calendar
                for (const localEvent of localEvents) {
                    if (!eventIdsFromCalendar.includes(localEvent.id)) {
                        // @LOG
                        console.log(
                            `[CalendarSyncService] Evento ${localEvent.id} ya no se encuentra` +
                            `\nen el calendario de la sala ${email}, marcando deletedAt...`
                        );
                        await eventService.softDeleteEvent(localEvent.id);
                    }
                }

                // Upsert / restauración de eventos que vienen del Calendar
                for (const event of events) {
                    const eventSearched = await eventService.getEventById(event.id!);

                    if (eventSearched) {
                        const updatedEvent = updateEvent(event, eventSearched);

                        updatedEvent.checkInStatus = eventSearched.checkInStatus;
                        updatedEvent.overlapStatus = eventSearched.overlapStatus;
                        updatedEvent.scheduleUpdatedAt = eventSearched.scheduleUpdatedAt;

                        // Determina la sala real desde el evento
                        const newRoomEmail = this.getRoomEmailFromEvent(
                            event,
                            email,
                        );
                        updatedEvent.roomEmail = newRoomEmail;

                        const attendeesChanged = () => {
                            const existing = eventSearched.attendees || [];
                            const updated = updatedEvent.attendees || [];

                            if (existing.length !== updated.length) return true;

                            const existingEmails = existing.map(a => a.email).sort();
                            const updatedEmails = updated.map(a => a.email).sort();

                            return JSON.stringify(existingEmails) !== JSON.stringify(updatedEmails);
                        };

                        const hasTimeChanges =
                            new Date(eventSearched.startTime).getTime() !==
                            new Date(updatedEvent.startTime).getTime() ||
                            new Date(eventSearched.endTime).getTime() !==
                            new Date(updatedEvent.endTime).getTime();

                        const hasRoomChange = eventSearched.roomEmail !== newRoomEmail;

                        const hasChanges =
                            eventSearched.title !== updatedEvent.title ||
                            eventSearched.creatorMail !== updatedEvent.creatorMail ||
                            attendeesChanged() ||
                            hasRoomChange;

                        if (hasTimeChanges || hasChanges) {
                            // Si cambió de sala, recalculamos el check-in ANTES del upsert
                            if (hasRoomChange) {
                                updatedEvent.checkInStatus = checkInService.determineCheckInStatus(
                                    updatedEvent.startTime,
                                    updatedEvent.endTime
                                );
                            }

                            await eventService.upsertEvent(updatedEvent);

                            if (hasRoomChange) {
                                // @LOG
                                console.log(
                                    `[CalendarSyncService] Evento ${event.id} ` +
                                    `cambió de sala: ${eventSearched.roomEmail} → ${newRoomEmail}`
                                );
                            }

                            if (hasTimeChanges) {
                                await eventService.updateScheduleUpdatedAt(
                                    event.id!,
                                    new Date()
                                );
                            }
                        }

                        // Restaura solo si estaba eliminado y ahora existe en calendar
                        if (eventSearched.deletedAt) {
                            await eventService.restoreEvent(event.id!);
                            // @LOG
                            console.log(
                                `[CalendarSyncService] Evento ${event.id} restaurado ` +
                                `(ahora en ${updatedEvent.roomEmail})`
                            );
                        }

                    } else {
                        // Evento nuevo se mapea desde la respuesta de Google
                        const roomEmailForNewEvent = this.getRoomEmailFromEvent(event, email);
                        const eventDTO = mapResponseToEventDTO(event, roomEmailForNewEvent);
                        await eventService.upsertEvent(eventDTO);
                    }
                }

            } catch (error: any | string) {
                console.error(
                    `[CalendarSyncService] Error al obtener eventos para la sala "${email}":`,
                    (error as any)?.message || error
                );
            }
        }
    }
}

export default new CalendarSyncService();
