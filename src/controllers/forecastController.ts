import { Request, Response } from "express";
import ForecastService from "../services/forecastService";

class ForecastController {
    async fetchForecast(req: Request, res: Response): Promise<void> {
        try {
            const { roomEmail } = req.query;

            const forecasts = await ForecastService.getForecastsForRooms(
                roomEmail as string | undefined
            );

            res.status(200).json({
                success: true,
                data: forecasts,
            });
        } catch (error: any) {
            res.status(500).json({
                success: false,
                message: error.message || "Error al obtener pronósticos",
            });
        }
    }
}

export default new ForecastController();