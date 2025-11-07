import { Router } from 'express';
import EventController from '../controllers/eventController';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, requireAdmin, EventController.getAllEvents);
router.get('/:id', authenticate, EventController.getEventById); // TODO: No se está utilizando, quizá se puede borrar

export default router;