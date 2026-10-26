import { PrismaClient } from "@prisma/client";
import path from "path";
import fs from "fs";

declare global {
  // eslint-disable-next-line no-var
  var prismaGlobal: PrismaClient | undefined;
}

const prismaDir = path.join(process.cwd(), "prisma");
if (!fs.existsSync(prismaDir)) {
  try {
    fs.mkdirSync(prismaDir, { recursive: true });
  } catch (_e) {
    // Ignore if already created
  }
}

const defaultDbPath = path.join(prismaDir, "dev.db");

function getResolvedDatabaseUrl(): string {
  const envUrl = process.env.DATABASE_URL;
  if (!envUrl) {
    return `file:${defaultDbPath}`;
  }
  // If it's a relative SQLite file path like file:./dev.db or file:dev.db
  if (envUrl.startsWith("file:")) {
    const rawPath = envUrl.replace("file:", "");
    if (!path.isAbsolute(rawPath)) {
      // If it points to ./prisma/dev.db or ./dev.db
      if (rawPath.includes("prisma")) {
        return `file:${path.resolve(process.cwd(), rawPath)}`;
      }
      return `file:${path.resolve(prismaDir, rawPath)}`;
    }
  }
  return envUrl;
}

const dbUrl = getResolvedDatabaseUrl();
process.env.DATABASE_URL = dbUrl;

export const prisma =
  global.prismaGlobal ||
  new PrismaClient({
    datasources: {
      db: {
        url: dbUrl,
      },
    },
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  global.prismaGlobal = prisma;
}
