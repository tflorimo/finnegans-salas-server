import { Router } from "express";
import auditController from "../controllers/auditController";
import { authenticate, requireAdmin } from "../middleware/auth";

const router = Router();

// GET /api/audits/ -> listado de auditorías (solo admin)
router.get("/", authenticate, requireAdmin, auditController.getAll);

export default router;