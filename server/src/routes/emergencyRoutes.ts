import { Router } from "express";
import {
  getNearbyHospitals,
  getNearbyFireServices,
  getNearbyUnifiedResources,
  createEmergencyIncident,
  analyzeEmergency,
  startEmergencyWorkflow,
  analyzeEmergencyWorkflow,
  getWorkflowResources,
  completeEmergencyWorkflow,
} from "../controllers/emergencyController";
import { authenticateToken, optionalAuthenticateToken } from "../middleware/authMiddleware";
import { validateBody, analyzeEmergencySchema } from "../middleware/validationMiddleware";

const router = Router();

// Nearby Emergency Services Search APIs (Calculates Haversine distance, sorts by nearest)
router.get("/hospitals/nearby", getNearbyHospitals);
router.get("/fire-services/nearby", getNearbyFireServices);
router.get("/resources/nearby", getNearbyUnifiedResources);

// Save emergency incident & location in backend (Supports both authenticated users & emergency guests)
router.post("/incidents", optionalAuthenticateToken, createEmergencyIncident);

// Public / quick triage analysis endpoint
router.post("/analyze", validateBody(analyzeEmergencySchema), analyzeEmergency);

// Protected workflow endpoints
router.post("/start", authenticateToken, startEmergencyWorkflow);
router.post("/:id/analyze", authenticateToken, analyzeEmergencyWorkflow);
router.post("/:id/resources", authenticateToken, getWorkflowResources);
router.post("/:id/complete", authenticateToken, completeEmergencyWorkflow);

export default router;

