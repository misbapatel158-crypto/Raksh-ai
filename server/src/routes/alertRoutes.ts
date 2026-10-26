import { Router } from "express";
import {
  getAlertSettings,
  updateAlertSettings,
  subscribeNotifications,
} from "../controllers/accidentAlertController";
import { optionalAuthenticateToken } from "../middleware/authMiddleware";

const router = Router();

router.use(optionalAuthenticateToken);

router.get("/settings", getAlertSettings);
router.patch("/settings", updateAlertSettings);
router.post("/subscribe", subscribeNotifications);

export default router;
