import { Router } from "express";
import { getNearbyResources } from "../controllers/resourceController";

const router = Router();

// GET /api/resources/nearby?latitude=...&longitude=...&type=AMBULANCE
router.get("/nearby", getNearbyResources);

export default router;
