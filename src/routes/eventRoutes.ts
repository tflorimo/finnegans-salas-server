import { Router } from 'express';
import EventController from '../controllers/eventController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, EventController.getAllEvents);
router.get('/:id', authenticate, EventController.getEventById);
router.patch('/:id/checkin', authenticate, EventController.checkInEvent);

export default router;