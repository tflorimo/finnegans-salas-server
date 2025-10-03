import { Router } from 'express';
import googleCalendarRoutes from './googleCalendarRoutes';
import authRoutes from './authRoutes';
import roomRoutes from './roomRoutes';
import eventRoutes from './eventRoutes';
// import userRoutes from './userRoutes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/calendar', googleCalendarRoutes);
router.use('/rooms', roomRoutes);
router.use('/events', eventRoutes);
// router.use('/user', userRoutes);
// router.use('/email', emailRoutes);

export default router;
