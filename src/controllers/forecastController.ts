import { Request, Response, NextFunction } from "express";
import ForecastService from "../services/forecastService";

class ForecastController {
    async fetchForecast(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { roomEmail } = req.query;

            const forecasts = await ForecastService.getForecastsForRooms(
                roomEmail as string | undefined
            );

            res.status(200).json({
                success: true,
                data: forecasts,
            });
        } catch (error) {
            next(error);
        }
    }
}

export default new ForecastController();