import { google, Auth } from 'googleapis';
import path from 'path';
import { JobRemoto } from '../schedulers/cronSetup';
import roomService from '../services/roomService';
import eventService from '../services/eventService';
import { mapResponseToEventDTO } from '../utils/mappers/eventMapper';

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
        const roomEmails = await roomService.getAllRoomEmails();
        if(roomEmails.length === 0) {
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

        const promesas = roomEmails.map(async (email) => {
            try {
                const response = await calendar.events.list({
                    calendarId: email,
                    maxResults: 10,
                    singleEvents: true,
                    orderBy: 'startTime',
                });

                const events = response.data.items || [];
                for(const event of events) {
                    const eventDTO = mapResponseToEventDTO(event, email);
                    await eventService.upsertEvent(eventDTO);
                }

            } catch (error: any | string) {
                console.error(`Error al obtener eventos para la sala "${email}": ${error.message}`);
            }
        });
    }
}