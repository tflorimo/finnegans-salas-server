import { google, Auth } from 'googleapis';
import path from 'path';
import roomService from '../services/roomService';
import {
    updateRoomMapper,
    mapRoomResponseToRoomDTO,
    mapResponseToRoomResponseDTO
} from '../utils/mappers/roomMapper';

/**
 * Servicio encargado de sincronizar los recursos de salas (rooms) desde la API Admin
 * hacia la base local.
 */
class RoomResourceSyncService {
    private readonly SERVICE_ACCOUNT_FILE: string;
    private readonly SCOPES: string[];

    constructor() {
        this.SERVICE_ACCOUNT_FILE = path.join(__dirname, '../../auth/service_account_key.json');
        this.SCOPES = [
            'https://www.googleapis.com/auth/admin.directory.resource.calendar.readonly'
        ];
    }

    private async getAdminClient(adminEmail: string) {
        const auth = new google.auth.GoogleAuth({
            keyFile: this.SERVICE_ACCOUNT_FILE,
            scopes: this.SCOPES,
            clientOptions: {
                subject: adminEmail,
            },
        });

        const authClient = await auth.getClient();
        return google.admin({ version: 'directory_v1', auth: authClient as Auth.JWT });
    }

    async syncRoomResources(adminEmail: string): Promise<void> {
        const admin = await this.getAdminClient(adminEmail);

        try {
            const response = await admin.resources.calendars.list({
                customer: process.env.CUSTOMER_ID,
                maxResults: 30,
            });

            const roomResources = response.data.items || [];
            if (!roomResources.length) {
                console.log('[RoomResourceSyncService] No se encontraron room resources.');
                return;
            }

            const roomEmailsFromApi = roomResources.map(resource => resource.resourceEmail!);
            const localRooms = await roomService.getAllRooms();

            // Marca como eliminadas las rooms que ya no están en la API (soft delete)
            for (const localRoom of localRooms) {
                if (!roomEmailsFromApi.includes(localRoom.email)) {
                    // @LOG
                    console.log(
                        `[RoomResourceSyncService] Room ${localRoom.email} eliminada de la API, marcando deletedAt...`
                    );
                    await roomService.softDeleteRoom(localRoom.email);
                }
            }

            for (const resource of roomResources) {
                const roomModel = await roomService.fetchRoom(resource.resourceEmail!);

                if (roomModel) {
                    // Recursos ya existentes en la DB
                    const updatedRoom = updateRoomMapper(resource, roomModel.is_busy, roomModel.current_event);
                    await roomService.upsertRoom(updatedRoom);

                    if (roomModel.deletedAt) {
                        await roomService.restoreRoom(resource.resourceEmail!);
                        // @LOG
                        console.log(
                            `[RoomResourceSyncService] Room ${resource.resourceEmail} restaurada`
                        );
                    }
                    
                } else {
                    // Recursos nuevos
                    const roomResponseDTO = mapResponseToRoomResponseDTO(resource);
                    const roomDTO = mapRoomResponseToRoomDTO(roomResponseDTO);

                    if (roomDTO) {
                        await roomService.upsertRoom(roomDTO);
                    }
                }
            }

        } catch (error) {
            console.error('[RoomResourceSyncService] Error al sincronizar room resources:', error);
        }
    }
}

export default new RoomResourceSyncService();