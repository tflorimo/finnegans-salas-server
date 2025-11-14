import { google, Auth } from 'googleapis';
import path from 'path';
import { JobRemoto } from '../schedulers/cronSetup';
import roomService from '../services/roomService';
import eventService from '../services/eventService';
import { mapResponseToEventDTO } from '../utils/mappers/eventMapper';
import { updateEvent } from '../utils/mappers/eventMapper';
import checkInService from '../services/checkInService';
import { getCalendarSyncRange } from '../utils/dateUtils';
export class SyncCalendarEventsJob implements JobRemoto {

    ADMIN_ACCOUNT_IMPERSONATE: string;
    SERVICE_ACCOUNT_FILE: string;
    SCOPES: string[];

    constructor() {
        this.ADMIN_ACCOUNT_IMPERSONATE = process.env.ADMIN_EMAIL_FOR_SERVICE_ACCOUNT!;
        this.SERVICE_ACCOUNT_FILE = path.join(__dirname, '../../auth/service_account_key.json');
        this.SCOPES = ['https://www.googleapis.com/auth/calendar'];
    }

    async execute(): Promise<void> {

        const roomEmails = await roomService.getAllRoomEmails();
        console.log('[SyncCalendarEvents] Sincronizando eventos de calendario...');

        const auth = new google.auth.GoogleAuth({
            keyFile: this.SERVICE_ACCOUNT_FILE,
            scopes: this.SCOPES,
            clientOptions: {
                subject: this.ADMIN_ACCOUNT_IMPERSONATE,
            },
        });

        const authClient = await auth.getClient();
        const calendar = google.calendar({ version: 'v3', auth: authClient as Auth.JWT });
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

                for (const localEvent of localEvents) {
                    if (!eventIdsFromCalendar.includes(localEvent.id)) {
                        console.log(
                            `[SyncCalendarEvents] Evento ${localEvent.id} ` +
                            `eliminado del calendar, marcando deletedAt...`
                        );
                        await eventService.softDeleteEvent(localEvent.id);
                    }
                }

                for (const event of events) {
                    const eventSearched = await eventService.getEventById(event.id!);

                    if (eventSearched) {
                        const updatedEvent = updateEvent(event, eventSearched);
                        const correctStatus = checkInService.determineCheckInStatus(
                            updatedEvent.startTime,
                            updatedEvent.endTime,
                            eventSearched.checkInStatus
                        );

                        updatedEvent.checkInStatus = correctStatus;

                        const attendeesChanged = () => {
                            const existing = eventSearched.attendees || [];
                            const updated = updatedEvent.attendees || [];

                            if (existing.length !== updated.length) return true;

                            const existingEmails = existing.map(a => a.email).sort();
                            const updatedEmails = updated.map(a => a.email).sort();

                            return JSON.stringify(existingEmails) !== JSON.stringify(updatedEmails);
                        };

                        const hasChanges =
                            new Date(eventSearched.startTime).getTime() !==
                            new Date(updatedEvent.startTime).getTime() ||
                            new Date(eventSearched.endTime).getTime() !==
                            new Date(updatedEvent.endTime).getTime() ||
                            eventSearched.title !== updatedEvent.title ||
                            eventSearched.checkInStatus !== updatedEvent.checkInStatus ||
                            eventSearched.creatorMail !== updatedEvent.creatorMail ||
                            attendeesChanged();

                        if (hasChanges) {
                            await eventService.upsertEvent(updatedEvent);
                        }

                        if (eventSearched.deletedAt) {
                            await eventService.restoreEvent(event.id!);
                            console.log(`[SyncCalendarEvents] Evento ${event.id} restaurado`);
                        }

                    } else {
                        const eventDTO = mapResponseToEventDTO(event, email);
                        await eventService.upsertEvent(eventDTO);
                    }
                }

            } catch (error: any | string) {
                console.error(`Error al obtener eventos para la sala "${email}": ${error.message}`);
            }
        }
    }
}