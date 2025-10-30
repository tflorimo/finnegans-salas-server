import { Router } from 'express';
import EventController from '../controllers/eventController';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, requireAdmin, EventController.getAllEvents);
router.get('/:id', authenticate, EventController.getEventById);
// router.patch('/:id/checkin', EventController.checkInEvent);

export default router;