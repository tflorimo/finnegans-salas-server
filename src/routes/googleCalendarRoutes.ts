import { Router } from 'express';
import googleCalendarController from '../controllers/googleCalendarController';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

router.get(
    '/events',
    authenticate, // requiere usuario logueado (admin o user)
    googleCalendarController.getEvents
);

export default router;
/*
  En el futuro si queremos agregar  rutas para crear, actualizar o eliminar eventos,
  podemos protegerlo , por ejemplo   solo administradores
 
  router.post(
   '/events',
   authenticate,
   requireAdmin,        ---> aca se valida solo admin
    googleCalendarController.createEvent
  );
 
 */