import {Router} from 'express';
import RoomController from '../controllers/roomController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, RoomController.getAllRooms);
router.get('/:id', authenticate, RoomController.getRoomById);
router.patch('/:id/checkin', authenticate, RoomController.checkIn);

export default router;