import { Router } from "express";
import authController from "../controllers/authController";
import { authenticate } from "../middleware/auth";

const router = Router();

router.get("/google", authController.authRedirect);
router.get("/oauth2callback", authController.oauth2Callback);
router.post("/refresh", authController.refresh);
router.post("/logout", authenticate, authController.logout);

export default router;
