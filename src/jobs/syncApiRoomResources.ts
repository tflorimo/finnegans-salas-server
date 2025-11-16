import { JobRemoto } from '../schedulers/cronSetup';
import { google, Auth } from 'googleapis';
import path from 'path';
import { updateRoom, mapRoomResponseToRoomDTO, mapResponseToRoomResponseDTO } from '../utils/mappers/roomMapper';
import roomService from '../services/roomService';
export class SyncApiRoomResourcesJob implements JobRemoto {
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
        const admin = google.admin({ version: 'directory_v1', auth: authClient as Auth.JWT });

        try {
            const response = await admin.resources.calendars.list({
                customer: process.env.CUSTOMER_ID,
                maxResults: 30,
            });

            const roomResources = response.data.items || [];
            if (!roomResources.length) {
                console.log('No se encontraron room resources.');
                return;
            }

            const roomEmailsFromApi = roomResources.map(resource => resource.resourceEmail!);
            const localRooms = await roomService.getAllRooms();

            // Marca como eliminadas las rooms que ya no están en la API (soft delete)
            for (const localRoom of localRooms) {
                if (!roomEmailsFromApi.includes(localRoom.email)) {
                    console.log(
                        `[SyncApiRoomResources] Room ${localRoom.email} eliminada de la API, marcando deletedAt...`
                    );
                    await roomService.softDeleteRoom(localRoom.email);
                }
            }

            for (const resource of roomResources) {

                const roomModel = await roomService.fetchRoom(resource.resourceEmail!);

                if (roomModel) {
                    // Lógica para los recursos ya existentes en la DB
                    const updatedRoom = updateRoom(resource, roomModel);
                    await roomService.upsertRoom(updatedRoom);

                    if (roomModel.deletedAt) {
                        await roomService.restoreRoom(resource.resourceEmail!);
                        console.log(`[SyncApiRoomResources] Room ${resource.resourceEmail} restaurada`);
                    }

                } else {
                    // Lógica para las nuevos recursos
                    const roomResponseDTO = mapResponseToRoomResponseDTO(resource);
                    const roomDTO = mapRoomResponseToRoomDTO(roomResponseDTO);

                    if (roomDTO) {
                        await roomService.upsertRoom(roomDTO);
                    }
                }
            }

        } catch (error) {
            console.error('Error al sincronizar room resources:', error);
        }

    }

}