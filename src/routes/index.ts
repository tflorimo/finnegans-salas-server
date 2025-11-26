import { Router } from 'express';
import authRoutes from './authRoutes';
import eventRoutes from './eventRoutes';
import forecastRoutes from './forecastRoutes';
import roomRoutes from './roomRoutes';
import auditRoutes from './auditRoutes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/rooms', roomRoutes);
router.use('/events', eventRoutes);
router.use('/forecast', forecastRoutes);
router.use('/audits', auditRoutes);

export default router;
