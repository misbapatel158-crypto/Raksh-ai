import { Router } from "express";
import { signup, login, getMe, logout } from "../controllers/authController";
import { authenticateToken } from "../middleware/authMiddleware";
import { authRateLimiter } from "../middleware/rateLimiter";
import { validateBody, signupSchema, loginSchema } from "../middleware/validationMiddleware";

const router = Router();

router.post("/signup", authRateLimiter, validateBody(signupSchema), signup);
router.post("/login", authRateLimiter, validateBody(loginSchema), login);
router.get("/me", authenticateToken, getMe);
router.post("/logout", logout);

export default router;
