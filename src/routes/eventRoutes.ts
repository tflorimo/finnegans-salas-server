import {Router} from 'express';
import EventController from '../controllers/eventController';
import { authenticate, requireAdmin } from '../middleware/auth';
const router = Router();

