import express, { Express } from "express";
import cors from "cors";
import helmet from "helmet";
import authRoutes from "./routes/authRoutes";
import userRoutes from "./routes/userRoutes";
import contactRoutes from "./routes/contactRoutes";
import incidentRoutes from "./routes/incidentRoutes";
import resourceRoutes from "./routes/resourceRoutes";
import emergencyRoutes from "./routes/emergencyRoutes";
import alertRoutes from "./routes/alertRoutes";
import emergencyVehicleRoutes from "./routes/emergencyVehicleRoutes";
import emergencyCorridorRoutes from "./routes/emergencyCorridorRoutes";
import { errorHandler } from "./middleware/errorHandler";

export function createApp(): Express {
  const app = express();

  // Security Middleware
  app.use(
    helmet({
      contentSecurityPolicy: false, // Allows Vite development & inline preview scripts
      crossOriginEmbedderPolicy: false,
    })
  );

  // CORS Middleware
  app.use(
    cors({
      origin: true, // Allow same-origin and development requests
      credentials: true,
    })
  );

  // Body Parsing Middleware
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true }));

  // Health Check Endpoint
  app.get("/api/health", (req, res) => {
    res.status(200).json({
      success: true,
      message: "RakshAI backend is running",
    });
  });

  // Mount API Sub-routers
  app.use("/api/auth", authRoutes);
  app.use("/api/users", userRoutes);
  app.use("/api/contacts", contactRoutes);
  app.use("/api/incidents", incidentRoutes);
  app.use("/api/resources", resourceRoutes);
  app.use("/api/emergency", emergencyRoutes);
  app.use("/api/alerts", alertRoutes);
  app.use("/api/notifications", alertRoutes);
  app.use("/api/emergency-vehicles", emergencyVehicleRoutes);
  app.use("/api/emergency-corridors", emergencyCorridorRoutes);

  // Global Error Handler
  app.use(errorHandler);

  return app;
}

