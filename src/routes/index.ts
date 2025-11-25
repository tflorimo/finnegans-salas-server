import { Router } from 'express';
import authRoutes from './authRoutes';
import eventRoutes from './eventRoutes';
import forecastRoutes from './forecastRoutes';
import roomRoutes from './roomRoutes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/rooms', roomRoutes);
router.use('/events', eventRoutes);
router.use('/forecast', forecastRoutes);

export default router;
