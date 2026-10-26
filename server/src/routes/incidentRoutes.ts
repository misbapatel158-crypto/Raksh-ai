import { Router } from "express";
import {
  createIncident,
  getIncidents,
  getIncidentById,
  updateIncidentStatus,
  deleteIncident,
  getIncidentShareData,
} from "../controllers/incidentController";
import {
  createPossibleAccident,
  reportAccidentEmergency,
  addIncidentEvidence,
  classifyIncidentWithAI,
  simulateEmergencyDemo,
  confirmIncident,
  cancelIncident,
  getNearbyIncidents,
  getEmergencyIncidentDetails,
  verifyIncident,
  updateEmergencyIncidentStatus,
} from "../controllers/accidentAlertController";
import {
  getIncidentResponseData,
  dispatchIncidentResponders,
} from "../controllers/emergencyVehicleController";
import { authenticateToken, optionalAuthenticateToken } from "../middleware/authMiddleware";
import {
  validateBody,
  createIncidentSchema,
  updateIncidentStatusSchema,
} from "../middleware/validationMiddleware";

const router = Router();

// ==========================================
// 🚨 RAKSHAI EMERGENCY & CITIZEN REPORTING
// ==========================================

// Report accident / emergency with multi-report grouping & evidence
router.post("/report", optionalAuthenticateToken, reportAccidentEmergency);

// AI Incident Classification & Decision Engine
router.post("/ai-classify", optionalAuthenticateToken, classifyIncidentWithAI);

// Demo / Simulation mode for presentations
router.post("/simulate", optionalAuthenticateToken, simulateEmergencyDemo);

// Upload photo evidence to an existing incident
router.post("/:id/evidence", optionalAuthenticateToken, addIncidentEvidence);

// Create possible road accident (sensor-detected)
router.post("/possible-accident", optionalAuthenticateToken, createPossibleAccident);

// Query nearby active emergency incidents (Haversine distance, privacy-masked)
router.get("/nearby", optionalAuthenticateToken, getNearbyIncidents);

// Confirm user needs help for a detected possible accident
router.post("/:id/confirm", optionalAuthenticateToken, confirmIncident);

// Cancel a possible accident alert (user is OK)
router.post("/:id/cancel", optionalAuthenticateToken, cancelIncident);

// Emergency Incident Live Vehicle Tracking & Response Payload
router.get("/:id/response", optionalAuthenticateToken, getIncidentResponseData);

// Dispatch emergency services to incident
router.post("/:id/dispatch", optionalAuthenticateToken, dispatchIncidentResponders);

// Submit a community verification report
router.post("/:id/verify", optionalAuthenticateToken, verifyIncident);

// Update incident status (POSSIBLE, REPORTED, UNDER_REVIEW, HELP_REQUESTED, RESPONSE_INITIATED, RESPONSE_REPORTED, HELP_ARRIVING, RESOLVED, CANCELLED)
router.patch("/:id/status", optionalAuthenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;
    const isEmergencyIncident = await (await import("../prisma/client")).prisma.emergencyIncident.findUnique({
      where: { id },
    });
    if (isEmergencyIncident) {
      return updateEmergencyIncidentStatus(req, res, next);
    }
    return updateIncidentStatus(req, res, next);
  } catch (err) {
    next(err);
  }
});

// View single incident details (checks EmergencyIncident first, fallback to Incident)
router.get("/:id", optionalAuthenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;
    const isEmergencyIncident = await (await import("../prisma/client")).prisma.emergencyIncident.findUnique({
      where: { id },
    });
    if (isEmergencyIncident) {
      return getEmergencyIncidentDetails(req, res, next);
    }
    return getIncidentById(req, res, next);
  } catch (err) {
    next(err);
  }
});

// ==========================================
// 📋 USER INCIDENT HISTORY & LEGACY ROUTES
// ==========================================

router.post("/", authenticateToken, validateBody(createIncidentSchema), createIncident);
router.get("/", authenticateToken, getIncidents);
router.delete("/:id", authenticateToken, deleteIncident);
router.post("/:id/share-data", authenticateToken, getIncidentShareData);

export default router;
