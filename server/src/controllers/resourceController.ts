import { Request, Response, NextFunction } from "express";
import { prisma } from "../prisma/client";
import { calculateDistanceKm } from "../services/distanceService";

export async function getNearbyResources(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { latitude, longitude, type, limit } = req.query;

    if (latitude === undefined || longitude === undefined) {
      res.status(400).json({
        success: false,
        message: "Latitude and longitude query parameters are required.",
      });
      return;
    }

    const userLat = parseFloat(latitude as string);
    const userLon = parseFloat(longitude as string);

    if (isNaN(userLat) || isNaN(userLon)) {
      res.status(400).json({
        success: false,
        message: "Invalid latitude or longitude coordinates.",
      });
      return;
    }

    const whereClause: any = {};
    if (type && typeof type === "string" && type.trim() !== "" && type.trim().toUpperCase() !== "ALL") {
      whereClause.type = type.trim().toUpperCase();
    }

    const resources = await prisma.emergencyResource.findMany({
      where: whereClause,
    });

    // Calculate distance using Haversine formula and sort nearest first
    const resourcesWithDistance = resources.map((r) => {
      const distanceKm = calculateDistanceKm(userLat, userLon, r.latitude, r.longitude);
      return {
        id: r.id,
        name: r.name,
        type: r.type,
        distanceKm,
        phone: r.phone,
        address: r.address,
        availability: r.availability,
        isDemo: r.isDemo,
        latitude: r.latitude,
        longitude: r.longitude,
      };
    });

    resourcesWithDistance.sort((a, b) => a.distanceKm - b.distanceKm);

    const maxResults = limit ? Math.min(parseInt(limit as string, 10) || 50, 100) : 50;
    const finalResources = resourcesWithDistance.slice(0, maxResults);

    res.status(200).json({
      success: true,
      data: {
        origin: {
          latitude: userLat,
          longitude: userLon,
        },
        count: finalResources.length,
        resources: finalResources,
      },
    });
  } catch (error) {
    next(error);
  }
}
