import { Router } from "express";
import {
  getActiveCorridors,
  getCorridorById,
  getAiRouteRecommendation,
  simulateCorridorStep,
} from "../controllers/emergencyCorridorController";
import { optionalAuthenticateToken } from "../middleware/authMiddleware";

const router = Router();

// Get all active corridors & recent dispatch events
router.get("/active", optionalAuthenticateToken, getActiveCorridors);

// Get single corridor details
router.get("/:id", optionalAuthenticateToken, getCorridorById);

// AI Route Recommendation
router.post("/recommend-route", optionalAuthenticateToken, getAiRouteRecommendation);

// Hackathon Demo Simulation step runner
router.post("/simulate-step", optionalAuthenticateToken, simulateCorridorStep);

export default router;
