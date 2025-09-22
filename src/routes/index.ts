import { Router } from 'express';
import googleCalendarRoutes from './googleCalendarRoutes';
import authRoutes from './authRoutes';
const router = Router();

// Monta las rutas de autenticación bajo /api/auth
router.use('/auth', authRoutes);
// Monta las rutas del calendar bajo /api/calendar
router.use('/calendar', googleCalendarRoutes);


export default router;
