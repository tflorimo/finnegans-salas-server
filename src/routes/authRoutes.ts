import { Router } from 'express';
import authController from '../controllers/authController';

const router = Router();

router.get('/google', authController.authRedirect);
router.get('/oauth2callback', authController.oauth2Callback);
router.get('/token-status', authController.tokenStatus);

export default router;