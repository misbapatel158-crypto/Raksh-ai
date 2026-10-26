import { Router } from "express";
import { getUserProfile, updateUserProfile } from "../controllers/userController";
import { authenticateToken } from "../middleware/authMiddleware";
import { validateBody, updateProfileSchema } from "../middleware/validationMiddleware";

const router = Router();

router.use(authenticateToken);

router.get("/me", getUserProfile);
router.patch("/me", validateBody(updateProfileSchema), updateUserProfile);

export default router;
