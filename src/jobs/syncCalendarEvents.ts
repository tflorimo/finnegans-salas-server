import { google, Auth } from 'googleapis';
import path from 'path';
import { JobRemoto } from '../schedulers/cronSetup';
import RoomService from '../services/roomService';
import EventService from '../services/eventService';
import { mapResponseToEventDTO } from '../utils/mappers/eventMapper';
import { updateEvent } from '../utils/mappers/eventMapper';
import { Event } from '../models';
import { CheckInStatus } from '../dtos/eventDTO';

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
                
                // Marca como eliminados los eventos que ya no están en Calendar
                for (const localEvent of localEvents) {
                    if (!eventIdsFromCalendar.includes(localEvent.id)) {
                        console.log(`[SyncCalendarEvents] Evento ${localEvent.id} eliminado del calendar, marcando deletedAt...`);
                        await EventService.softDeleteEvent(localEvent.id);
                    }
                }

                for (const event of events) {
                    const eventSearched = await EventService.getEventById(event.id!);

                    if (eventSearched) {
                        // Si el evento existe, actualizarlo con el checkInStatus correcto
                        const updatedEvent = updateEvent(event, eventSearched);
                        
                        // Determinar el checkInStatus correcto según el tiempo
                        const correctStatus = EventService.determineCheckInStatus(
                            updatedEvent.startTime, 
                            eventSearched.checkInStatus
                        );

                        updatedEvent.checkInStatus = correctStatus;
                        await EventService.upsertEvent(updatedEvent);

                        // Si estaba eliminado (deletedAt), restaurarlo (por las dudas)
                        if (eventSearched.deletedAt) {
                            await EventService.restoreEvent(event.id!);
                            console.log(`[SyncCalendarEvents] Evento ${event.id} restaurado`);
                        }

                    } else {
                        const eventDTO = mapResponseToEventDTO(event, email);
                        await EventService.upsertEvent(eventDTO);
                    }
                }

                // Después de procesar todos los eventos, verificamos superposiciones
                for (const event of events) {
                    if (!event.id) continue;
                    
                    const startTime = new Date(event.start?.dateTime!);
                    const endTime = new Date(event.end?.dateTime!);
                    
                    const overlapInfo = await EventService.checkEventOverlap(
                        event.id,
                        email,
                        startTime,
                        endTime
                    );

                    if (overlapInfo.isOverlapping && !overlapInfo.isPrimary) {
                        // Este es un evento secundario superpuesto 
                        const eventToUpdate = await EventService.getEventById(event.id);
                        if (eventToUpdate) {
                            // Marcar como EXPIRED y agregar indicador en el título
                            let newTitle = eventToUpdate.title;
                            if (!newTitle.includes('(Evento Superpuesto)')) {
                                newTitle = `${newTitle} (Evento Superpuesto)`;
                            }

                            await Event.update(
                                { 
                                    checkInStatus: CheckInStatus.EXPIRED,
                                    title: newTitle
                                },
                                { where: { id: event.id } }
                            );

                            console.log(`[SyncCalendarEvents] Evento ${event.id} marcado como superpuesto (EXPIRED). Primario: ${overlapInfo.primaryEventId}`);
                        }
                    }
                }

            } catch (error: any | string) {
                console.error(`Error al obtener eventos para la sala "${email}": ${error.message}`);
            }
        }
    }
}