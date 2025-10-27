import { JobRemoto } from '../schedulers/cronSetup';
import { google, Auth } from 'googleapis';
import path from 'path';
import { mapRoomResponseToRoomDTO, mapResponseToRoomResponseDTO } from '../utils/mappers/roomMapper';
import RoomService from '../services/roomService';


export class SyncRoomResourcesJob implements JobRemoto {
    ADMIN_ACCOUNT_IMPERSONATE: string;
    SERVICE_ACCOUNT_FILE: string;
    SCOPES: string[];
    
    constructor() {
        this.ADMIN_ACCOUNT_IMPERSONATE = process.env.ADMIN_EMAIL_FOR_SERVICE_ACCOUNT!;
        this.SERVICE_ACCOUNT_FILE = path.join(__dirname, '../../auth/service_account_key.json');
        this.SCOPES = ['https://www.googleapis.com/auth/admin.directory.resource.calendar.readonly'];
    }

    async execute(): Promise<void> {
        console.log('Iniciando sincronización de room resources...');
        const auth = new google.auth.GoogleAuth({
            keyFile: this.SERVICE_ACCOUNT_FILE,
            scopes: this.SCOPES,
            clientOptions: {
                subject: this.ADMIN_ACCOUNT_IMPERSONATE,
            },
        });

        const authClient = await auth.getClient();
        const admin = google.admin({ version: 'directory_v1', auth: authClient as Auth.JWT});

        try {
            const response = await admin.resources.calendars.list({
                customer: process.env.CUSTOMER_ID,
                maxResults: 25,
            });

            const roomResources = response.data.items || [];
            if(!roomResources.length) {
                console.log('No se encontraron room resources.');
                return;
            }

            for (const resource of roomResources) {

                const roomResponseDTO = mapResponseToRoomResponseDTO(resource);

                const roomDTO = mapRoomResponseToRoomDTO(roomResponseDTO);

                if(roomDTO) {
                    await RoomService.upsertRoom(roomDTO);
                }                
            }

        } catch (error) {
            console.error('Error al sincronizar room resources:', error);
        }

    }

}