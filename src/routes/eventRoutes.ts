import { Router } from 'express';
import EventController from '../controllers/eventController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, EventController.getAllEvents);
router.get('/:id', authenticate, EventController.getEventById);

export default router;