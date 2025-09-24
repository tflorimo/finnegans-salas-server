import { Router } from 'express';
import googleCalendarRoutes from './googleCalendarRoutes';
import authRoutes from './authRoutes';
const router = Router();

router.use('/auth', authRoutes);
router.use('/calendar', googleCalendarRoutes);

export default router;
