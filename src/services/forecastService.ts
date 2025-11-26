import { HourlyForecastDTO, RoomHourlyForecastDTO } from "../dtos/forecastDTO";
import { Forecast, Room } from "../models";
class ForecastService {
    /**
     * Obtiene las predicciones de ocupación horaria para las salas.
     * Si se proporciona un email de sala, filtra las predicciones para esa sala específica.
     * De lo contrario, devuelve las predicciones para todas las salas.
     *
     * @param roomEmail - (Opcional) El email de la sala para filtrar las predicciones.
     * @return Una promesa que resuelve a una lista de objetos RoomHourlyForecastDTO.
     * 
     * @example
     * Respuesta:
     * 
     * [
     *   {
     *     roomEmail: "example@domain.com",
     *      forecasts: [
     *      {
     *       roomEmail: "example@domain.com",
     *       date: "2024-06-01T10:00:00Z",
     *      occupancyPredicted: 15,
     *      lower: 10,
     *      upper: 20
     *      },
     *      ...
     *    }
     * ]
     */
    async getForecastsForRooms(roomEmail?: string): Promise<RoomHourlyForecastDTO[]> {
        try {
            const whereClause: any = {};

            if (roomEmail) {
                whereClause.roomEmail = roomEmail;
            }

            const forecasts = await Forecast.findAll({
                where: whereClause,
                include: [{
                    model: Room,
                    as: 'room',
                    attributes: ['name'] // nombre de la sala
                }],
                order: [['roomEmail', 'ASC'], ['date', 'ASC']],
            });

            const grouped = new Map<string, {name: string, list: HourlyForecastDTO[]}>();

            forecasts.forEach((forecast: any) => {

                const currRoomName = forecast.room?.name || "Sala desconocida";

                const record: HourlyForecastDTO = {
                    roomEmail: forecast.roomEmail,
                    date: forecast.date,
                    occupancyPredicted: forecast.occupancyPredicted,
                    lower: forecast.lower,
                    upper: forecast.upper,
                };

                if (!grouped.has(forecast.roomEmail)) {
                    grouped.set(forecast.roomEmail, {name: currRoomName, list: []});
                }
                grouped.get(forecast.roomEmail)!.list.push(record);
            });

            const result: RoomHourlyForecastDTO[] = Array.from(grouped.entries()).map(
                ([email, forecasts]) => ({
                    roomEmail: email,
                    roomName: forecasts.name,
                    forecasts: forecasts.list,
                })
            );

            return result;
        } catch (error) {
            console.error(`[ForecastService] Error al obtener forecasts: ${roomEmail || 'todas las salas'}`, error);
            throw error;
        }
    }
}

export default new ForecastService();