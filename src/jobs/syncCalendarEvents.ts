import { google, Auth } from 'googleapis';
import path from 'path';
import { JobRemoto } from '../schedulers/cronSetup';
import RoomService from '../services/roomService';
import EventService from '../services/eventService';
import { mapResponseToEventDTO } from '../utils/mappers/eventMapper';
import { updateEvent } from '../utils/mappers/eventMapper';
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
        
        const roomEmails = await RoomService.getAllRoomEmails();
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

        for (const email of roomEmails) {
            try {
                const response = await calendar.events.list({
                    calendarId: email,
                    maxResults: 100,
                    singleEvents: true,
                    orderBy: 'startTime',
                });

                const events = response.data.items || [];
                const eventIdsFromCalendar = events.map(event => event.id!);
                const localEvents = await EventService.getEventsByRoomId(email);

                for (const localEvent of localEvents) {
                    if (!eventIdsFromCalendar.includes(localEvent.id)) {
                        console.log(`[SyncCalendarEvents] Evento ${localEvent.id} eliminado del calendar, marcando deletedAt...`);
                        await EventService.softDeleteEvent(localEvent.id);
                    }
                }

                for (const event of events) {
                    const eventSearched = await EventService.getEventById(event.id!);

                    if (eventSearched) {
                        const updatedEvent = updateEvent(event, eventSearched);
                        const correctStatus = EventService.determineCheckInStatus(
                            updatedEvent.startTime,
                            updatedEvent.endTime,
                            eventSearched.checkInStatus
                        );

                        updatedEvent.checkInStatus = correctStatus;
                        
                        const hasChanges = 
                            new Date(eventSearched.startTime).getTime() !== new Date(updatedEvent.startTime).getTime() ||
                            new Date(eventSearched.endTime).getTime() !== new Date(updatedEvent.endTime).getTime() ||
                            eventSearched.title !== updatedEvent.title ||
                            eventSearched.checkInStatus !== updatedEvent.checkInStatus;
                        
                        if (hasChanges) {
                            await EventService.upsertEvent(updatedEvent);
                        }

                        if (eventSearched.deletedAt) {
                            await EventService.restoreEvent(event.id!);
                            console.log(`[SyncCalendarEvents] Evento ${event.id} restaurado`);
                        }

                    } else {
                        const eventDTO = mapResponseToEventDTO(event, email);
                        await EventService.upsertEvent(eventDTO);
                    }
                }

            } catch (error: any | string) {
                console.error(`Error al obtener eventos para la sala "${email}": ${error.message}`);
            }
        }
    }
}