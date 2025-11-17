import { ForecastDTO, RoomForecastDTO } from "../dtos/forecastDTO";
import { Forecast } from "../models";

import { Op } from "sequelize";

class ForecastService {
    /**
     * Obtiene las predicciones de ocupación para las salas.
     * Si se proporciona un email de sala, filtra las predicciones para esa sala específica.
     * De lo contrario, devuelve las predicciones para todas las salas.
     *
     * @param roomEmail - (Opcional) El email de la sala para filtrar las predicciones, trayendo así solo las de esa sala.
     * @return Una promesa que resuelve a una lista de objetos RoomForecastDTO, cada uno conteniendo el email de la sala y una lista de predicciones asociadas (cada elemento de la lista es un ForecastDTO).
     * 
     * @example
     * Respuesta de ejemplo:
     * [
     *   {
     *     roomEmail: "mail@delasala.com",
     *     forecasts: [
     *       {
     *         roomEmail: "sala-a@company.com",
     *         date: "2025-11-18T00:00:00.000Z",
     *         occupancyPredicted: 0.65,
     *         lower: 0.50,
     *         upper: 0.80
     *       },
     *       {
     *         roomEmail: "sala-a@company.com",
     *         date: "2025-11-19T00:00:00.000Z",
     *         occupancyPredicted: 0.72,
     *         lower: 0.58,
     *         upper: 0.86
     *       }
     *     ]
     *   },
     *   {
     *     roomEmail: "sala-b@company.com",
     *     forecasts: [
     *       {
     *         roomEmail: "sala-b@company.com",
     *         date: "2025-11-18T00:00:00.000Z",
     *         occupancyPredicted: 0.45,
     *         lower: 0.30,
     *         upper: 0.60
     *       }
     *     ]
     *   }
     * ]
     */
    async getForecastsForRooms(roomEmail?: string): Promise<RoomForecastDTO[]> {
        const whereClause: any = {};

        if (roomEmail) {
            whereClause.roomEmail = roomEmail;
        }

        const forecasts = await Forecast.findAll({
            where: whereClause,
            order: [['roomEmail', 'ASC'], ['date', 'ASC']],
        });

        const grouped = new Map<string, ForecastDTO[]>();

        forecasts.forEach((forecast) => {
            const record: ForecastDTO = {
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

        const result: RoomForecastDTO[] = Array.from(grouped.entries()).map(
            ([email, forecasts]) => ({
                roomEmail: email,
                forecasts,
            })
        );

        return result;
    }
}

export default new ForecastService();