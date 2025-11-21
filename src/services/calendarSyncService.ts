import { google, Auth } from 'googleapis';
import path from 'path';
import roomService from '../services/roomService';
import eventService from '../services/eventService';
import { mapResponseToEventDTO, mapUpdatedEvent } from '../utils/mappers/eventMapper';
import { getCalendarSyncRange, getLocalTimestamp } from '../utils/dateUtils';
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

        /* Si tiene una o más salas como resource, tomamos la primera de la lista.
           Esto hace que, en escenarios de múltiples salas, la fuente de verdad sea el orden de los attendees. */
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
                            `► [CalendarSyncService] Evento` +
                            `\n  id: ${localEvent.id}` +
                            `\n  nombre: ${localEvent.title} ` +
                            `\n  ya no se encuentra en el calendario de la sala` +
                            `\n  id sala: ${email}` +
                            `\n  acción: marcando como deletedAt`
                        );
                        await eventService.softDeleteEvent(localEvent.id);
                    }
                }

                // Upsert / restauración de eventos que vienen del Calendar
                for (const event of events) {
                    const eventSearched = await eventService.getEventById(event.id!);

                    if (eventSearched) {
                        const updatedEvent = mapUpdatedEvent(event, eventSearched);

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
                            // Si cambió de sala, recalculamos el check-in antes del upsert
                            if (hasRoomChange) {
                                const checkInStatus = checkInService.determineCheckInStatus(
                                    updatedEvent.startTime,
                                    updatedEvent.endTime
                                );

                                if (checkInStatus !== updatedEvent.checkInStatus) {
                                    updatedEvent.checkInStatus = checkInStatus;
                                }

                                // @LOG
                                console.log(
                                    `► [CalendarSyncService] Evento` +
                                    `\n  id: ${event.id}` +
                                    `\n  nombre: ${event.summary}` +
                                    `\n► Cambió de sala:` +
                                    `\n  id anterior: ${eventSearched.roomEmail}` +
                                    `\n  id nuevo: ${newRoomEmail}`
                                );
                            }

                            if (hasTimeChanges) {
                                updatedEvent.scheduleUpdatedAt = new Date();
                                console.log(
                                    `► [CalendarSyncService] El evento` +
                                    `\n  id: ${event.id}` +
                                    `\n  nombre: ${event.summary}` +
                                    `\n  cambió de horario:` +
                                    `\n  inicio: ${getLocalTimestamp(eventSearched.startTime)}` +
                                    ` → ${getLocalTimestamp(updatedEvent.startTime)}` +
                                    `\n  fin: ${getLocalTimestamp(eventSearched.endTime)}` +
                                    ` → ${getLocalTimestamp(updatedEvent.endTime)}`
                                );
                            }

                            await eventService.upsertEvent(updatedEvent);
                            console.log(
                                `► [CalendarSyncService] Evento ` +
                                `actualizado con éxito:` +
                                `\n  id: ${updatedEvent.id}` +
                                `\n  nombre: ${updatedEvent.title}`
                            );
                        }

                        // Restaura solo si estaba eliminado y ahora existe en calendar
                        if (eventSearched.deletedAt) {
                            await eventService.restoreEvent(event.id!);
                            // @LOG
                            console.log(
                                `► [CalendarSyncService] Evento restaurado: ` +
                                `\n  id: ${event.id} ` +
                                `\n  nombre: ${event.summary} ` +
                                `\n  Ahora en la sala:` +
                                `\n  id: ${newRoomEmail}`
                            );
                        }

                    } else {
                        // Evento nuevo (no existente en la DB). Se mapea desde la respuesta de Google
                        const roomEmailForNewEvent = this.getRoomEmailFromEvent(event, email);
                        const eventDTO = mapResponseToEventDTO(event, roomEmailForNewEvent);
                        await eventService.upsertEvent(eventDTO);

                        const roomForNewEvent = await roomService.getRoomById(roomEmailForNewEvent);
                        console.log(
                            `► [CalendarSyncService] Nuevo evento agregado con éxito:` +
                            `\n  id evento: ${eventDTO.id}` +
                            `\n  nombre evento: ${eventDTO.title}` +
                            `\n  id sala: ${roomForNewEvent?.email || roomEmailForNewEvent}` +
                            `\n  nombre sala: ${roomForNewEvent?.name || 'Desconocida'}`
                        );
                    }
                }

            } catch (error: any | string) {
                console.error(
                    `► [CalendarSyncService] Error al obtener eventos:` +
                    `\n  Sala: ${email}` +
                    `\n  Detalle: ${(error as any)?.message || error}`
                );
            }
        }
    }
}

export default new CalendarSyncService();
