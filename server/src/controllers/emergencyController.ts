import { Request, Response, NextFunction } from "express";
import { prisma } from "../prisma/client";
import { AuthenticatedRequest } from "../middleware/authMiddleware";
import { analyzeEmergencyIncident } from "../services/emergencyAnalysisService";
import { calculateDistanceKm } from "../services/distanceService";
import { seedDatabase } from "../prisma/seedData";

/**
 * GET /api/emergency/hospitals/nearby
 * Finds verified demo hospitals sorted by Haversine distance from user's current GPS location
 */
export async function getNearbyHospitals(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const latStr = req.query.latitude as string;
    const lonStr = req.query.longitude as string;
    const categoryFilter = ((req.query.type || req.query.category || "ALL") as string).toUpperCase();
    const radiusKm = req.query.radiusKm ? Number(req.query.radiusKm) : 25;
    const limit = req.query.limit ? Math.min(Math.max(Number(req.query.limit), 1), 50) : 20;

    if (!latStr || !lonStr || isNaN(Number(latStr)) || isNaN(Number(lonStr))) {
      res.status(400).json({
        success: false,
        message: "Valid numeric latitude and longitude query parameters are required.",
      });
      return;
    }

    const latitude = Number(latStr);
    const longitude = Number(lonStr);

    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      res.status(400).json({
        success: false,
        message: "Latitude must be between -90 and 90, and longitude between -180 and 180.",
      });
      return;
    }

    // Auto-seed if database is empty
    let count = await prisma.hospital.count();
    if (count === 0) {
      await seedDatabase(prisma);
    }

    // Build database query
    const whereClause: any = { isActive: true };
    if (categoryFilter === "GOVERNMENT" || categoryFilter === "PRIVATE") {
      whereClause.category = categoryFilter;
    }

    const hospitals = await prisma.hospital.findMany({
      where: whereClause,
    });

    const hospitalsWithDistance = hospitals.map((h) => {
      const distanceKm = calculateDistanceKm(latitude, longitude, h.latitude, h.longitude);
      return {
        id: h.id,
        name: h.name,
        category: h.category as "GOVERNMENT" | "PRIVATE",
        address: h.address,
        latitude: h.latitude,
        longitude: h.longitude,
        phone: h.phone || null,
        ambulancePhone: h.ambulancePhone || null,
        emergencyDepartment: h.emergencyDepartment || "24/7 Emergency Department Available",
        source: h.source || "DEMO DATA - Health Directory",
        lastVerified: h.lastVerified || "2026-08-01",
        distanceKm,
        isNearest: false,
      };
    });

    // Sort strictly by nearest distance
    hospitalsWithDistance.sort((a, b) => a.distanceKm - b.distanceKm);

    // Apply radiusKm filter if specified (> 0)
    const withinRadius = radiusKm > 0
      ? hospitalsWithDistance.filter((h) => h.distanceKm <= radiusKm)
      : hospitalsWithDistance;

    if (withinRadius.length > 0) {
      withinRadius[0].isNearest = true;
    }

    const sliced = withinRadius.slice(0, limit);

    res.status(200).json({
      success: true,
      data: sliced,
      hospitals: sliced,
      origin: { latitude, longitude },
      filter: categoryFilter,
      radiusKm,
      count: sliced.length,
      totalFound: withinRadius.length,
      nearestHospital: sliced[0] || null,
      nearestAvailableDistanceKm: hospitalsWithDistance[0]?.distanceKm || null,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/emergency/fire-services/nearby
 * Finds verified fire stations / brigades sorted by Haversine distance
 */
export async function getNearbyFireServices(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const latStr = req.query.latitude as string;
    const lonStr = req.query.longitude as string;
    const radiusKm = req.query.radiusKm ? Number(req.query.radiusKm) : 25;
    const limit = req.query.limit ? Math.min(Math.max(Number(req.query.limit), 1), 50) : 20;

    if (!latStr || !lonStr || isNaN(Number(latStr)) || isNaN(Number(lonStr))) {
      res.status(400).json({
        success: false,
        message: "Valid numeric latitude and longitude query parameters are required.",
      });
      return;
    }

    const latitude = Number(latStr);
    const longitude = Number(lonStr);

    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      res.status(400).json({
        success: false,
        message: "Latitude must be between -90 and 90, and longitude between -180 and 180.",
      });
      return;
    }

    // Auto-seed if database is empty
    let count = await prisma.fireService.count();
    if (count === 0) {
      await seedDatabase(prisma);
    }

    const fireStations = await prisma.fireService.findMany({
      where: { isActive: true },
    });

    const fireStationsWithDistance = fireStations.map((f) => {
      const distanceKm = calculateDistanceKm(latitude, longitude, f.latitude, f.longitude);
      return {
        id: f.id,
        name: f.name,
        address: f.address,
        latitude: f.latitude,
        longitude: f.longitude,
        phone: f.phone || null,
        emergencyContact: f.emergencyContact || null,
        source: f.source || "DEMO DATA - Fire & Rescue Directory",
        lastVerified: f.lastVerified || "2026-08-01",
        distanceKm,
        isNearest: false,
      };
    });

    fireStationsWithDistance.sort((a, b) => a.distanceKm - b.distanceKm);

    const withinRadius = radiusKm > 0
      ? fireStationsWithDistance.filter((f) => f.distanceKm <= radiusKm)
      : fireStationsWithDistance;

    if (withinRadius.length > 0) {
      withinRadius[0].isNearest = true;
    }

    const sliced = withinRadius.slice(0, limit);

    res.status(200).json({
      success: true,
      data: sliced,
      fireServices: sliced,
      origin: { latitude, longitude },
      radiusKm,
      count: sliced.length,
      totalFound: withinRadius.length,
      nearestFireService: sliced[0] || null,
      nearestAvailableDistanceKm: fireStationsWithDistance[0]?.distanceKm || null,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/emergency/resources/nearby
 * Returns nearby emergency resources based on resourceType filter
 */
export async function getNearbyUnifiedResources(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const latStr = req.query.latitude as string;
    const lonStr = req.query.longitude as string;
    const resourceType = ((req.query.resourceType || req.query.type || "ALL") as string).toUpperCase();
    const limit = req.query.limit ? Math.min(Math.max(Number(req.query.limit), 1), 50) : 20;

    if (!latStr || !lonStr || isNaN(Number(latStr)) || isNaN(Number(lonStr))) {
      res.status(400).json({
        success: false,
        message: "Valid numeric latitude and longitude parameters are required.",
      });
      return;
    }

    const latitude = Number(latStr);
    const longitude = Number(lonStr);

    const results: any[] = [];

    // Query Hospitals if ALL or HOSPITAL
    if (resourceType === "ALL" || resourceType === "HOSPITAL") {
      const hospitals = await prisma.hospital.findMany({ where: { isActive: true } });
      hospitals.forEach((h) => {
        results.push({
          id: h.id,
          name: h.name,
          type: "HOSPITAL",
          category: h.category,
          address: h.address,
          latitude: h.latitude,
          longitude: h.longitude,
          phone: h.phone,
          ambulancePhone: h.ambulancePhone,
          emergencyDepartment: h.emergencyDepartment,
          source: h.source,
          lastVerified: h.lastVerified,
          distanceKm: calculateDistanceKm(latitude, longitude, h.latitude, h.longitude),
        });
      });
    }

    // Query Fire Services if ALL or FIRE_SERVICE
    if (resourceType === "ALL" || resourceType === "FIRE_SERVICE" || resourceType === "FIRE") {
      const fireServices = await prisma.fireService.findMany({ where: { isActive: true } });
      fireServices.forEach((f) => {
        results.push({
          id: f.id,
          name: f.name,
          type: "FIRE_SERVICE",
          address: f.address,
          latitude: f.latitude,
          longitude: f.longitude,
          phone: f.phone,
          emergencyContact: f.emergencyContact,
          source: f.source,
          lastVerified: f.lastVerified,
          distanceKm: calculateDistanceKm(latitude, longitude, f.latitude, f.longitude),
        });
      });
    }

    // Query generic emergency resources (ambulances, police stations, etc.)
    const genericWhere: any = {};
    if (resourceType === "AMBULANCE" || resourceType === "POLICE") {
      genericWhere.type = resourceType;
    }
    const genericResources = await prisma.emergencyResource.findMany({
      where: genericWhere,
    });
    genericResources.forEach((r) => {
      // Avoid duplicate hospitals/fire services if already added
      if (resourceType === "ALL" && (r.type === "HOSPITAL" || r.type === "FIRE_SERVICE")) {
        return;
      }
      results.push({
        id: r.id,
        name: r.name,
        type: r.type,
        address: r.address,
        latitude: r.latitude,
        longitude: r.longitude,
        phone: r.phone,
        availability: r.availability,
        source: "RakshAI Emergency Responder Network",
        lastVerified: "2026-08-01",
        distanceKm: calculateDistanceKm(latitude, longitude, r.latitude, r.longitude),
      });
    });

    // Sort all combined resources by distance
    results.sort((a, b) => a.distanceKm - b.distanceKm);

    res.status(200).json({
      success: true,
      data: {
        origin: { latitude, longitude },
        resourceType,
        count: Math.min(results.length, limit),
        resources: results.slice(0, limit),
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/emergency/incidents
 * Saves the emergency incident and current GPS location to the backend database
 */
export async function createEmergencyIncident(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const {
      type = "ROAD_ACCIDENT",
      latitude,
      longitude,
      accuracy,
      description = "",
      nearestHospitalId,
      nearestFireServiceId,
    } = req.body;

    if (latitude === undefined || longitude === undefined || isNaN(Number(latitude)) || isNaN(Number(longitude))) {
      res.status(400).json({
        success: false,
        message: "Valid numeric latitude and longitude coordinates are required.",
      });
      return;
    }

    const latNum = Number(latitude);
    const lonNum = Number(longitude);
    const accNum = accuracy !== undefined && !isNaN(Number(accuracy)) ? Number(accuracy) : null;
    const userId = req.user?.id || null;

    // Save location log for the incident
    await prisma.userLocation.create({
      data: {
        userId,
        latitude: latNum,
        longitude: lonNum,
        accuracy: accNum,
      },
    });

    // Save emergency incident in database
    const incident = await prisma.emergencyIncident.create({
      data: {
        userId,
        type: String(type).toUpperCase(),
        latitude: latNum,
        longitude: lonNum,
        accuracy: accNum,
        description: description || `Emergency help requested for ${type}`,
        nearestHospitalId: nearestHospitalId ? String(nearestHospitalId) : null,
        nearestFireServiceId: nearestFireServiceId ? String(nearestFireServiceId) : null,
      },
    });

    // If authenticated, also create in legacy Incident table for full dashboard syncing
    if (userId) {
      await prisma.incident.create({
        data: {
          userId,
          incidentType: String(type).toUpperCase(),
          description: description || `Emergency reported at ${latNum.toFixed(4)}, ${lonNum.toFixed(4)}`,
          latitude: latNum,
          longitude: lonNum,
          locationAccuracy: accNum,
          aiPriority: type === "FIRE" || type === "MEDICAL" ? "CRITICAL" : "HIGH",
          status: "HELP_IDENTIFIED",
        },
      });
    }

    res.status(201).json({
      success: true,
      message: "Emergency incident and location saved successfully.",
      data: {
        incidentId: incident.id,
        type: incident.type,
        latitude: incident.latitude,
        longitude: incident.longitude,
        accuracy: incident.accuracy,
        timestamp: incident.createdAt.toISOString(),
        nearestHospitalId: incident.nearestHospitalId,
        nearestFireServiceId: incident.nearestFireServiceId,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function analyzeEmergency(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const {
      incidentType,
      description = "",
      peopleAffected = 1,
      vehiclesInvolved = 0,
      anyoneTrapped = false,
      smokeOrFire = false,
    } = req.body;

    const analysis = analyzeEmergencyIncident({
      incidentType,
      description,
      peopleAffected,
      vehiclesInvolved,
      anyoneTrapped,
      smokeOrFire,
    });

    res.status(200).json({
      success: true,
      message: "Emergency incident analyzed successfully.",
      data: analysis,
    });
  } catch (error) {
    next(error);
  }
}

export async function startEmergencyWorkflow(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Unauthorized." });
      return;
    }

    const { latitude, longitude, locationAccuracy } = req.body;

    const workflow = await prisma.emergencyWorkflow.create({
      data: {
        userId: req.user.id,
        status: "STARTED",
        latitude: latitude !== undefined ? Number(latitude) : null,
        longitude: longitude !== undefined ? Number(longitude) : null,
        locationAccuracy: locationAccuracy !== undefined ? Number(locationAccuracy) : null,
      },
    });

    res.status(201).json({
      success: true,
      message: "Emergency workflow session initiated.",
      data: {
        emergencyId: workflow.id,
        timestamp: workflow.createdAt.toISOString(),
        userId: workflow.userId,
        status: workflow.status,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function analyzeEmergencyWorkflow(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Unauthorized." });
      return;
    }

    const { id } = req.params;
    const {
      incidentType,
      description = "",
      peopleAffected = 1,
      vehiclesInvolved = 0,
      anyoneTrapped = false,
      smokeOrFire = false,
      latitude,
      longitude,
      locationAccuracy,
    } = req.body;

    const workflow = await prisma.emergencyWorkflow.findUnique({
      where: { id },
    });

    if (!workflow || workflow.userId !== req.user.id) {
      res.status(404).json({
        success: false,
        message: "Emergency workflow not found.",
      });
      return;
    }

    const analysis = analyzeEmergencyIncident({
      incidentType,
      description,
      peopleAffected,
      vehiclesInvolved,
      anyoneTrapped,
      smokeOrFire,
    });

    const updatedWorkflow = await prisma.emergencyWorkflow.update({
      where: { id },
      data: {
        incidentType,
        description,
        peopleAffected: Number(peopleAffected),
        anyoneTrapped: Boolean(anyoneTrapped),
        smokeOrFire: Boolean(smokeOrFire),
        ...(latitude !== undefined && { latitude: Number(latitude) }),
        ...(longitude !== undefined && { longitude: Number(longitude) }),
        ...(locationAccuracy !== undefined && { locationAccuracy: Number(locationAccuracy) }),
        aiSummary: analysis.summary,
        aiPriority: analysis.suggestedPriority,
        recommendedResources: JSON.stringify(analysis.recommendedResources),
        status: "ANALYZED",
      },
    });

    res.status(200).json({
      success: true,
      message: "Workflow analyzed successfully.",
      data: {
        workflow: updatedWorkflow,
        analysis,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getWorkflowResources(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Unauthorized." });
      return;
    }

    const { id } = req.params;
    const { latitude, longitude } = req.body;

    const workflow = await prisma.emergencyWorkflow.findUnique({
      where: { id },
    });

    if (!workflow || workflow.userId !== req.user.id) {
      res.status(404).json({
        success: false,
        message: "Emergency workflow not found.",
      });
      return;
    }

    const targetLat = latitude !== undefined ? Number(latitude) : workflow.latitude;
    const targetLon = longitude !== undefined ? Number(longitude) : workflow.longitude;

    if (targetLat === null || targetLon === null || isNaN(targetLat) || isNaN(targetLon)) {
      res.status(400).json({
        success: false,
        message: "Valid coordinates required to fetch nearby resources.",
      });
      return;
    }

    let recommendedTypes: string[] = [];
    try {
      recommendedTypes = workflow.recommendedResources ? JSON.parse(workflow.recommendedResources) : [];
    } catch {
      recommendedTypes = [];
    }

    const allResources = await prisma.emergencyResource.findMany();

    const resourcesWithDistance = allResources.map((r) => {
      const distanceKm = calculateDistanceKm(targetLat, targetLon, r.latitude, r.longitude);
      const isRecommended = recommendedTypes.length === 0 || recommendedTypes.includes(r.type);
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
        isRecommended,
      };
    });

    // Sort recommended first, then by distance
    resourcesWithDistance.sort((a, b) => {
      if (a.isRecommended && !b.isRecommended) return -1;
      if (!a.isRecommended && b.isRecommended) return 1;
      return a.distanceKm - b.distanceKm;
    });

    res.status(200).json({
      success: true,
      data: {
        workflowId: workflow.id,
        recommendedTypes,
        resources: resourcesWithDistance,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function completeEmergencyWorkflow(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Unauthorized." });
      return;
    }

    const { id } = req.params;

    const workflow = await prisma.emergencyWorkflow.findUnique({
      where: { id },
    });

    if (!workflow || workflow.userId !== req.user.id) {
      res.status(404).json({
        success: false,
        message: "Emergency workflow not found.",
      });
      return;
    }

    if (!workflow.incidentType || workflow.latitude === null || workflow.longitude === null) {
      res.status(400).json({
        success: false,
        message: "Cannot complete incomplete workflow: incident details and coordinates are required.",
      });
      return;
    }

    // Save as persistent incident
    const incident = await prisma.incident.create({
      data: {
        userId: req.user.id,
        incidentType: workflow.incidentType,
        description: workflow.description || "Emergency report filed via workflow",
        peopleAffected: workflow.peopleAffected || 1,
        vehiclesInvolved: 0,
        anyoneTrapped: workflow.anyoneTrapped || false,
        smokeOrFire: workflow.smokeOrFire || false,
        latitude: workflow.latitude,
        longitude: workflow.longitude,
        locationAccuracy: workflow.locationAccuracy,
        aiSummary: workflow.aiSummary,
        aiPriority: workflow.aiPriority || "HIGH",
        recommendedResources: workflow.recommendedResources,
        status: "HELP_IDENTIFIED",
      },
    });

    // Update workflow status
    await prisma.emergencyWorkflow.update({
      where: { id },
      data: { status: "COMPLETED" },
    });

    res.status(201).json({
      success: true,
      message: "Emergency workflow completed and incident record created.",
      data: {
        incident,
      },
    });
  } catch (error) {
    next(error);
  }
}

