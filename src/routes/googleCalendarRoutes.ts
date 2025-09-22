// src/routes/googleCalendarRoutes.ts
import { Router } from 'express';
import googleCalendarController from '../controllers/googleCalendarController';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

/**
 * GET /api/calendar/events
 * Permite a cualquier usuario autenticado .. obtener eventos de Google Calendar.
 * Se exige un JWT válido generado por el AuthController.
 */
router.get(
    '/events',
    authenticate, // requiere usuario logueado (admin o user)
    googleCalendarController.getEvents
);

/*
  Si en el futuro queremos agregar  rutas para crear, actualizar o eliminar eventos,
  podrías protegerlas solo para administradores, por ejemplo   solo administradores
 
  router.post(
   '/events',
   authenticate,
   requireAdmin,        ---> aca se valida solo admin
    googleCalendarController.createEvent
  );
 
  router.patch(
    '/events/:eventId',
   authenticate,
   requireAdmin,
    googleCalendarController.updateEvent
  );
 
  router.delete(
    '/events/:eventId',
   authenticate,
   requireAdmin,
   googleCalendarController.deleteEvent
  );
 */

export default router;
