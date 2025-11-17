import { google, Auth } from 'googleapis';
import path from 'path';
import roomService from '../services/roomService';
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
                console.log(
                    `► [RoomResourceSyncService] sin room resources:` +
                    `\n  no se encontraron recursos de salas en la API`
                );
                return;
            }

            const roomEmailsFromApi = roomResources.map(resource => resource.resourceEmail!);
            const localRooms = await roomService.getAllRooms();

            // Marca como eliminadas las rooms que ya no están en la API (soft delete)
            for (const localRoom of localRooms) {
                if (!roomEmailsFromApi.includes(localRoom.email)) {
                    // @LOG
                    console.log(
                        `► [RoomResourceSyncService] sala eliminada de la API:` +
                        `\n  id: ${localRoom.email}` +
                        `\n  nombre: ${localRoom.name || "Sin nombre"}` +
                        `\n  acción: marcando deletedAt...`
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
                            `► [RoomResourceSyncService] sala restaurada:` +
                            `\n  id: ${resource.resourceEmail}` +
                            `\n  nombre: ${resource.resourceName || "Sin nombre"}`
                        );
                    }

                } else {
                    // Recursos nuevos
                    const RoomRequestDTO = mapResponseToRoomRequestDTO(resource);
                    const roomDTO = mapRoomResponseToRoomDTO(RoomRequestDTO);

                    if (roomDTO) {
                        await roomService.upsertRoom(roomDTO);
                        console.log(
                            `► [RoomResourceSyncService] sala agregada a la base de datos:` +
                            `\n  id: ${resource.resourceEmail}` +
                            `\n  nombre: ${resource.resourceName || "Sin nombre"}`
                        );
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