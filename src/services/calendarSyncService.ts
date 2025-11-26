import { google, Auth } from 'googleapis';
import path from 'path';
import roomService from '../services/roomService';
import eventService from '../services/eventService';
import { mapResponseToEventDTO, mapUpdatedEvent } from '../utils/mappers/eventMapper';
import { getCalendarSyncRange, getLocalTimestamp } from '../utils/dateUtils';
import checkInService from './checkInService';
import overlapService from './overlapService';
import auditService from './auditService';

// Servicio encargado de sincronizar eventos de Google Calendar con la base local.
class CalendarSyncService {
    private readonly SERVICE_ACCOUNT_FILE: string;
    private readonly SCOPES: string[];

    constructor() {
        this.SERVICE_ACCOUNT_FILE = path.join(__dirname, '../../auth/service_account_key.json');
        this.SCOPES = ['https://www.googleapis.com/auth/calendar'];
    }

    private async getCalendarClient(adminEmail: string) {
        try {
            const auth = new google.auth.GoogleAuth({
                keyFile: this.SERVICE_ACCOUNT_FILE,
                scopes: this.SCOPES,
                clientOptions: {
                    subject: adminEmail,
                },
            });

            const authClient = await auth.getClient();
            return google.calendar({ version: 'v3', auth: authClient as Auth.JWT });
        } catch (error) {
            console.error(`[CalendarSyncService] Error al obtener cliente de calendario: ${adminEmail}`, error);
            throw error;
        }
    }

    // Helper para validar si el creador del evento pertenece al dominio permitido
    private isInternalCreator(event: any): boolean {
        const allowedDomain = process.env.GOOGLE_ALLOWED_DOMAIN;
        if (!allowedDomain) {
            console.warn('[CalendarSyncService] GOOGLE_ALLOWED_DOMAIN no está configurado');
            return true;
        }

        const creatorEmail = event.creator?.email || event.organizer?.email;
        if (!creatorEmail) {
            console.warn('[CalendarSyncService] Evento sin información de creador:', event.id);
            return false;
        }

        return creatorEmail.toLowerCase().endsWith(`@${allowedDomain.toLowerCase()}`);
    }

    // Helper para validar si la sala del evento pertenece a la organización
    private isAuthorizedRoom(event: any, calendarEmail: string, authorizedRoomEmails: string[]): boolean {
        const eventRoomEmail = this.getRoomEmailFromEvent(event, calendarEmail);
        return authorizedRoomEmails.includes(eventRoomEmail);
    }

    // Helper para eliminar un evento no válido de la base local si existe
    private async softDeleteInvalidEvent(eventId: string, eventName: string, reason: string): Promise<void> {
        const existingEvent = await eventService.getEventById(eventId);
        if (existingEvent && !existingEvent.deletedAt) {
            await eventService.softDeleteEvent(eventId);
        }
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
        try {
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

                    // Filtra eventos creados por usuarios externos a la organización
                    // y eventos cuya sala ya no pertenece a la organización
                    const validEvents = events.filter(event => {
                        const isInternal = this.isInternalCreator(event);

                        if (!isInternal) {
                            this.softDeleteInvalidEvent(
                                event.id!,
                                event.summary || 'Sin nombre',
                                'externo a los recursos de la organización');
                            return false;
                        }

                        const isValidRoom = this.isAuthorizedRoom(event, email, roomEmails);

                        if (!isValidRoom) {
                            const eventRoomEmail = this.getRoomEmailFromEvent(event, email);
                            this.softDeleteInvalidEvent(
                                event.id!,
                                event.summary || 'Sin nombre',
                                `con sala no autorizada: ${eventRoomEmail}`
                            );
                            return false;
                        }

                        return true;
                    });

                    const eventIdsFromCalendar = validEvents.map(event => event.id!);
                    const localEvents = await eventService.getEventsByRoomId(email);

                    // Soft delete de eventos que ya no están en Google Calendar
                    for (const localEvent of localEvents) {
                        if (!eventIdsFromCalendar.includes(localEvent.id)) {
                            await this.softDeleteInvalidEvent(
                                localEvent.id,
                                localEvent.title,
                                `ya no se encuentra en el calendario de la sala: ${email}`
                            );
                        }
                    }

                    // Upsert / restauración de eventos que vienen del Calendar
                    for (const event of validEvents) {

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
                            const recalculateCheckIn = hasRoomChange || hasTimeChanges;

                            const hasChanges =
                                eventSearched.title !== updatedEvent.title ||
                                eventSearched.creatorMail !== updatedEvent.creatorMail ||
                                attendeesChanged() ||
                                hasRoomChange ||
                                hasTimeChanges;

                            if (hasChanges) {
                                // Si cambió de sala o de horario, recalculamos el check-in antes del upsert
                                if (recalculateCheckIn) {
                                    const checkInStatus = checkInService.determineCheckInStatus(
                                        updatedEvent.startTime,
                                        updatedEvent.endTime,
                                        hasTimeChanges ? updatedEvent.checkInStatus : undefined
                                    );

                                    if (checkInStatus !== updatedEvent.checkInStatus) {
                                        updatedEvent.checkInStatus = checkInStatus;
                                    }
                                }

                                if (hasTimeChanges) {
                                    overlapService.saveOriginalScheduleFromDTO(
                                        eventSearched.id,
                                        eventSearched.startTime,
                                        eventSearched.endTime
                                    );

                                    updatedEvent.scheduleUpdatedAt = new Date();
                                }

                                await eventService.upsertEvent(updatedEvent);
                            }

                        } else {
                            // Evento nuevo (no existente en la DB). Se mapea desde la respuesta de Google
                            const roomEmailForNewEvent = this.getRoomEmailFromEvent(event, email);
                            const eventDTO = mapResponseToEventDTO(event, roomEmailForNewEvent);
                            
                            await eventService.upsertEvent(eventDTO);
                            await roomService.getRoomById(roomEmailForNewEvent);
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
        } catch (error) {
            console.error('[CalendarSyncService] Error en sincronización de eventos:', error);
            throw error;
        }
    }
}

export default new CalendarSyncService();
