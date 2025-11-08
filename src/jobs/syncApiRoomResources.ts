import { JobRemoto } from '../schedulers/cronSetup';
import { google, Auth } from 'googleapis';
import path from 'path';
import { updateRoom, mapRoomResponseToRoomDTO, mapResponseToRoomResponseDTO } from '../utils/mappers/roomMapper';
import RoomService from '../services/roomService';

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
                maxResults: 25,
            });

            const roomResources = response.data.items || [];
            if (!roomResources.length) {
                console.log('No se encontraron room resources.');
                return;
            }

            const roomEmailsFromApi = roomResources.map(resource => resource.resourceEmail!);

            // Obtener todas las rooms actuales de la BD
            const localRooms = await RoomService.getAllRooms();
            
            // Marcar como eliminadas las rooms que ya no están en la API
            for (const localRoom of localRooms) {
                if (!roomEmailsFromApi.includes(localRoom.email)) {
                    console.log(`[SyncApiRoomResources] Room ${localRoom.email} eliminada de la API, marcando deletedAt...`);
                    await RoomService.softDeleteRoom(localRoom.email);
                }
            }

            // Procesar room resources de la API
            for (const resource of roomResources) {
                // Buscar la room directamente del modelo para tener acceso a deletedAt
                const roomModel = await RoomService.fetchRoom(resource.resourceEmail!);

                if (roomModel) {
                    // Si la room existe, actualizarla
                    const updatedRoom = updateRoom(resource, roomModel);

                    // Primero actualizar current_event si existe
                    if (updatedRoom.current_event) {
                        await RoomService.updateRoomCurrentEvent(updatedRoom.email, updatedRoom.current_event);
                    }

                    // Luego actualizar is_busy basado en el estado del evento
                    await RoomService.updateIsBussyStatus(updatedRoom.email);

                    await RoomService.upsertRoom(updatedRoom);

                    // Si estaba eliminada (deletedAt), restaurarla
                    if (roomModel.deletedAt) {
                        await RoomService.restoreRoom(resource.resourceEmail!);
                        console.log(`[SyncApiRoomResources] Room ${resource.resourceEmail} restaurada`);
                    }

                } else {
                    // Crear nueva room
                    const roomResponseDTO = mapResponseToRoomResponseDTO(resource);
                    const roomDTO = mapRoomResponseToRoomDTO(roomResponseDTO);

                    if (roomDTO) {
                        await RoomService.upsertRoom(roomDTO);
                    }
                }
            }

        } catch (error) {
            console.error('Error al sincronizar room resources:', error);
        }

    }

}