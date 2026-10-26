import { Router } from "express";
import {
  getActiveVehicles,
  getVehicleById,
  getVehicleLocationHistory,
  updateVehicleLocation,
  updateVehicleStatus,
  dispatchVehicle,
} from "../controllers/emergencyVehicleController";
import { authenticateToken, optionalAuthenticateToken } from "../middleware/authMiddleware";

const router = Router();

// Public / All-Users View of active emergency vehicles
router.get("/active", optionalAuthenticateToken, getActiveVehicles);

// Single vehicle details
router.get("/:id", optionalAuthenticateToken, getVehicleById);

// Vehicle location history points
router.get("/:id/location-history", optionalAuthenticateToken, getVehicleLocationHistory);

// Dispatch vehicle to incident or hospital
router.post("/dispatch", optionalAuthenticateToken, dispatchVehicle);

// Authorized / Controller updates
router.patch("/:id/location", optionalAuthenticateToken, updateVehicleLocation);
router.patch("/:id/status", optionalAuthenticateToken, updateVehicleStatus);

export default router;
