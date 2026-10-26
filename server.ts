import express from "express";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
dotenv.config();

// Ensure prisma directory and database URL fallbacks
const prismaDir = path.join(process.cwd(), "prisma");
if (!fs.existsSync(prismaDir)) {
  fs.mkdirSync(prismaDir, { recursive: true });
}

const defaultDbPath = path.join(prismaDir, "dev.db");
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = `file:${defaultDbPath}`;
}
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = "resqai-super-secret-jwt-key-2026";
}

import { createApp } from "./server/src/app";
import { prisma } from "./server/src/prisma/client";
import { seedDatabase } from "./server/src/prisma/seedData";

const PORT = 3000;

async function ensureDatabaseSeeded() {
  try {
    const resourceCount = await prisma.emergencyResource.count();
    const hospitalCount = await prisma.hospital.count();
    if (resourceCount === 0 || hospitalCount === 0) {
      console.log("Empty emergency database detected. Running in-process initial seed...");
      await seedDatabase(prisma);
    }
  } catch (error) {
    console.warn("Database auto-seed check:", (error as Error).message);
  }
}

async function startServer() {
  const app = createApp();

  // Vite middleware for development vs static serve for production
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Start listening on port 3000 for Cloud Run ingress
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`ResQAI Full-Stack Server active on http://0.0.0.0:${PORT}`);
    // Run database seed check asynchronously after server is listening
    ensureDatabaseSeeded().catch((err) => {
      console.warn("Non-fatal background seed notice:", err);
    });
  });
}

startServer().catch((err) => {
  console.error("Failed to start ResQAI server:", err);
  process.exit(1);
});
