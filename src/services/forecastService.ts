import { HourlyForecastDTO, RoomHourlyForecastDTO } from "../dtos/forecastDTO";
import { Forecast } from "../models";
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
        const whereClause: any = {};

        if (roomEmail) {
            whereClause.roomEmail = roomEmail;
        }

        const forecasts = await Forecast.findAll({
            where: whereClause,
            order: [['roomEmail', 'ASC'], ['date', 'ASC']],
        });

        const grouped = new Map<string, HourlyForecastDTO[]>();

        forecasts.forEach((forecast) => {
            const record: HourlyForecastDTO = {
                roomEmail: forecast.roomEmail,
                date: forecast.date,
                occupancyPredicted: forecast.occupancyPredicted,
                lower: forecast.lower,
                upper: forecast.upper,
            };

            if (!grouped.has(forecast.roomEmail)) {
                grouped.set(forecast.roomEmail, []);
            }
            grouped.get(forecast.roomEmail)!.push(record);
        });

        const result: RoomHourlyForecastDTO[] = Array.from(grouped.entries()).map(
            ([email, forecasts]) => ({
                roomEmail: email,
                forecasts,
            })
        );

        return result;
    }
}

export default new ForecastService();