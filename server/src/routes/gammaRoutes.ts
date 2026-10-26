import { Router } from "express";
import rateLimit from "express-rate-limit";
import {
  getGammaStatus,
  generatePresentation,
  getHistory,
  deleteHistory,
} from "../controllers/gammaController";

const router = Router();

// Rate limiter for presentation generation: 30 requests per 15 minutes
const generateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: {
    success: false,
    message: "Too many presentation generation requests. Please try again after a few minutes.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Configuration and API capability status
router.get("/status", getGammaStatus);

// Generate presentation (calls Gamma API or generates structured prompt)
router.post("/generate", generateLimiter, generatePresentation);

// Presentation History
router.get("/history", getHistory);
router.delete("/history/:id", deleteHistory);

export default router;
