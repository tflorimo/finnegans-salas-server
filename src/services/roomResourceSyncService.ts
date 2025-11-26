import { google, Auth } from 'googleapis';
import path from 'path';
import roomService from '../services/roomService';
import auditService from './auditService';
import {
    updateRoomMapper,
    mapRoomResponseToRoomDTO,
    mapResponseToRoomRequestDTO
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
        try {
            const auth = new google.auth.GoogleAuth({
                keyFile: this.SERVICE_ACCOUNT_FILE,
                scopes: this.SCOPES,
                clientOptions: {
                    subject: adminEmail,
                },
            });

            const authClient = await auth.getClient();
            return google.admin({ version: 'directory_v1', auth: authClient as Auth.JWT });
        } catch (error) {
            console.error(`[RoomResourceSyncService] Error al obtener cliente admin: ${adminEmail}`, error);
            throw error;
        }
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
                return;
            }

            const roomEmailsFromApi = roomResources.map(resource => resource.resourceEmail!);
            const localRooms = await roomService.getAllRooms();

            // Marca como eliminadas las rooms que ya no están en la API (soft delete)
            for (const localRoom of localRooms) {
                if (!roomEmailsFromApi.includes(localRoom.email)) {
                    await roomService.softDeleteRoom(localRoom.email);
                    auditService.recordRoomDeleted(localRoom.email, localRoom.name).catch(err => {
                        console.error('[RoomResourceSyncService][audit] recordRoomDeleted failed:', err);
                    });
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

                        auditService.recordRoomRestored(resource.resourceEmail!, resource.resourceName).catch(err => {
                            console.error('[RoomResourceSyncService][audit] recordRoomRestored failed:', err);
                        });
                    }

                } else {
                    // Recursos nuevos
                    const RoomRequestDTO = mapResponseToRoomRequestDTO(resource);
                    const roomDTO = mapRoomResponseToRoomDTO(RoomRequestDTO);

                    if (roomDTO) {
                        await roomService.upsertRoom(roomDTO);

                        auditService.recordRoomAdded(resource.resourceEmail!, resource.resourceName).catch(err => {
                            console.error('[RoomResourceSyncService][audit] recordRoomAdded failed:', err);
                        });
                    }
                }
            }

        } catch (error) {
            console.error(
                `► [RoomResourceSyncService] error al sincronizar room resources:` +
                `\n  detalle del error:`,
                error
            );
        }
    }
}

export default new RoomResourceSyncService();