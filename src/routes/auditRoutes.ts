import { Router } from 'express';
import auditController from '../controllers/auditController';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

router.get('/audits', authenticate, requireAdmin, auditController.getAudits);

export default router;