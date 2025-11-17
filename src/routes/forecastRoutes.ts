import { Router } from "express";
import ForecastController from "../controllers/forecastController";
import { authenticate } from "../middleware/auth";

const router = Router();
router.get('/fetch', authenticate, ForecastController.fetchForecast);

export default router;