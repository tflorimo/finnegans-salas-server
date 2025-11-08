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
        console.log('Iniciando sincronización de eventos de calendario...');
        const roomEmails = await RoomService.getAllRoomEmails();
        if (roomEmails.length === 0) {
            console.log('No se pudo obtener los correos de las salas!');
            return;
        }

        const auth = new google.auth.GoogleAuth({
            keyFile: this.SERVICE_ACCOUNT_FILE,
            scopes: this.SCOPES,
            clientOptions: {
                subject: this.ADMIN_ACCOUNT_IMPERSONATE,
            },
        });

        const authClient = await auth.getClient();
        const calendar = google.calendar({ version: 'v3', auth: authClient as Auth.JWT });

        roomEmails.map(async (email) => {
            try {
                const response = await calendar.events.list({
                    calendarId: email,
                    maxResults: 100,
                    singleEvents: true,
                    orderBy: 'startTime',
                });

                const events = response.data.items || [];
                const eventIdsFromCalendar = events.map(event => event.id!);

                // Obtiene todos los eventos actuales de esta sala en la BD
                const localEvents = await EventService.getEventsByRoomId(email);
                
                // Marca como eliminados los eventos que ya no están en Calendar
                for (const localEvent of localEvents) {
                    if (!eventIdsFromCalendar.includes(localEvent.id)) {
                        console.log(`[SyncCalendarEvents] Evento ${localEvent.id} eliminado del calendar, marcando deletedAt...`);
                        await EventService.softDeleteEvent(localEvent.id);
                    }
                }

                for (const event of events) {
                    const eventSearched = await EventService.getEventById(event.id!)

                    if (eventSearched) {
                        // Si el evento existe, actualizarlo
                        const updatedEvent = updateEvent(event, eventSearched);

                        if (updatedEvent) {
                            await EventService.updateCheckedInStatus(updatedEvent);
                        }
                        await EventService.upsertEvent(updatedEvent);

                        // Si estaba eliminado (deletedAt), restaurarlo
                        if (eventSearched.deletedAt) {
                            await EventService.restoreEvent(event.id!);
                            console.log(`[SyncCalendarEvents] Evento ${event.id} restaurado`);
                        }

                    } else {
                        // Crea los nuevos eventos
                        const eventDTO = mapResponseToEventDTO(event, email);
                        await EventService.upsertEvent(eventDTO);
                    }
                }

            } catch (error: any | string) {
                console.error(`Error al obtener eventos para la sala "${email}": ${error.message}`);
            }
        });
    }
}