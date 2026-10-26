import { Request, Response, NextFunction } from "express";
import { prisma } from "../prisma/client";
import { AuthenticatedRequest } from "../middleware/authMiddleware";
import { calculateDistanceKm } from "../services/distanceService";

/**
 * GET /api/emergency-corridors/active
 * Returns current active emergency corridors with assigned vehicles, junctions, traffic states, and live events
 */
export async function getActiveCorridors(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const corridors = await prisma.emergencyCorridor.findMany({
      include: {
        vehicle: true,
        junctions: {
          orderBy: { sequence: "asc" },
        },
        recommendations: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const dispatchEvents = await prisma.dispatchEvent.findMany({
      orderBy: { timestamp: "desc" },
      take: 20,
    });

    res.status(200).json({
      success: true,
      data: {
        corridors: corridors.map((c) => ({
          ...c,
          waypoints: c.waypointsJson ? JSON.parse(c.waypointsJson) : [],
          routeRecommendation: c.recommendations[0] || null,
        })),
        recentDispatchEvents: dispatchEvents,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/emergency-corridors/:id
 */
export async function getCorridorById(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;

    const corridor = await prisma.emergencyCorridor.findUnique({
      where: { id },
      include: {
        vehicle: true,
        junctions: {
          orderBy: { sequence: "asc" },
        },
        recommendations: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!corridor) {
      res.status(404).json({
        success: false,
        message: "Emergency corridor not found.",
      });
      return;
    }

    const dispatchEvents = await prisma.dispatchEvent.findMany({
      where: {
        OR: [
          { vehicleId: corridor.vehicleId || undefined },
          { incidentId: corridor.incidentId || undefined },
        ],
      },
      orderBy: { timestamp: "desc" },
      take: 20,
    });

    res.status(200).json({
      success: true,
      data: {
        corridor: {
          ...corridor,
          waypoints: corridor.waypointsJson ? JSON.parse(corridor.waypointsJson) : [],
          routeRecommendation: corridor.recommendations[0] || null,
          dispatchEvents,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/emergency-corridors/recommend-route
 * AI Route Recommendation with reasoning
 */
export async function getAiRouteRecommendation(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const {
      originLat = 18.5265,
      originLng = 73.8490,
      destinationLat = 18.5284,
      destinationLng = 73.8742,
      corridorId = null,
      vehicleId = null,
      incidentId = null,
      trafficCondition = "MODERATE",
    } = req.body;

    const distKm = calculateDistanceKm(
      Number(originLat),
      Number(originLng),
      Number(destinationLat),
      Number(destinationLng)
    );

    // Compute route variants
    const routeADistance = Math.max(1.2, Math.round(distKm * 10) / 10);
    const routeAEta = Math.max(2, Math.round(routeADistance * 2.2)); // ~4 min

    const routeBDistance = Math.round((routeADistance * 1.4) * 10) / 10;
    const routeBEta = Math.round(routeAEta * 1.7); // ~7 min

    let reason = "Route A has lower estimated congestion and automated junction clearance priority.";
    if (trafficCondition === "HEAVY") {
      reason = "Route A utilizes signal-coordinated smart green wave to bypass peak arterial delay.";
    } else if (trafficCondition === "CLEAR") {
      reason = "Route A provides direct corridor access with minimal intersection transit delay.";
    }

    const recommendation = await prisma.routeRecommendation.create({
      data: {
        corridorId: corridorId || undefined,
        vehicleId: vehicleId || undefined,
        incidentId: incidentId || undefined,
        recommendedRouteName: "Route A - Smart Corridor",
        recommendedEtaMinutes: routeAEta,
        recommendedDistanceKm: routeADistance,
        alternativeRouteName: "Route B - Arterial Bypass",
        alternativeEtaMinutes: routeBEta,
        alternativeDistanceKm: routeBDistance,
        reason,
        aiPriority: "CRITICAL",
        confidence: 94,
      },
    });

    res.status(200).json({
      success: true,
      message: "AI Route Recommendation generated.",
      data: { recommendation },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/emergency-corridors/simulate-step
 * Interactive Hackathon Demo Simulation Engine
 * Advances vehicle along route, updates distance, ETA, speed, junctions, and logs dispatch events
 */
export async function simulateCorridorStep(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const {
      vehicleId = null,
      step = 0, // 0: Start/Dispatched, 1: En Route (2.8km), 2: En Route (1.8km), 3: Approaching (0.5km), 4: Arrived, 5: Completed
      action = "STEP", // STEP, START, PAUSE, RESET
      incidentId = null,
      destinationName = "Sassoon General Hospital",
      destinationLat = 18.5284,
      destinationLng = 73.8742,
    } = req.body;

    // Find target vehicle or default to A-102
    let vehicle = null;
    if (vehicleId) {
      vehicle = await prisma.emergencyVehicle.findUnique({ where: { id: vehicleId } });
    }
    if (!vehicle) {
      vehicle = await prisma.emergencyVehicle.findFirst({
        where: { unitCode: "A-102" },
      });
      if (!vehicle) {
        vehicle = await prisma.emergencyVehicle.findFirst();
      }
    }

    if (!vehicle) {
      res.status(404).json({ success: false, message: "No emergency vehicle available for simulation." });
      return;
    }

    // Waypoints for simulation
    const simulationStages = [
      {
        stage: 0,
        status: "DISPATCHED",
        lat: 18.5265,
        lng: 73.8490,
        speed: 25.0,
        distance: 2.8,
        etaSeconds: 420,
        desc: `🚨 ${vehicle.unitCode} Dispatched from Base (Distance: 2.8 km, ETA: 7 min)`,
        j1: { traffic: "CLEAR", corridor: "ACTIVE" },
        j2: { traffic: "MODERATE", corridor: "ACTIVE" },
        j3: { traffic: "CLEAR", corridor: "ACTIVE" },
      },
      {
        stage: 1,
        status: "EN_ROUTE",
        lat: 18.5270,
        lng: 73.8520,
        speed: 42.0,
        distance: 2.1,
        etaSeconds: 300,
        desc: `🚑 ${vehicle.unitCode} En Route — Approaching Junction 1 (Distance: 2.1 km, ETA: 5 min)`,
        j1: { traffic: "CLEAR", corridor: "ACTIVE" },
        j2: { traffic: "HEAVY", corridor: "REDIRECTED" },
        j3: { traffic: "CLEAR", corridor: "ACTIVE" },
      },
      {
        stage: 2,
        status: "EN_ROUTE",
        lat: 18.5290,
        lng: 73.8560,
        speed: 46.0,
        distance: 1.4,
        etaSeconds: 180,
        desc: `📍 ${vehicle.unitCode} Cleared Junction 1 & 2 — 1.4 km Remaining (ETA: 3 min)`,
        j1: { traffic: "CLEAR", corridor: "ACTIVE" },
        j2: { traffic: "CLEAR", corridor: "ACTIVE" },
        j3: { traffic: "CLEAR", corridor: "ACTIVE" },
      },
      {
        stage: 3,
        status: "EN_ROUTE",
        lat: 18.5285,
        lng: 73.8680,
        speed: 38.0,
        distance: 0.5,
        etaSeconds: 60,
        desc: `🚨 ${vehicle.unitCode} Approaching Destination Perimeter (Distance: 0.5 km, ETA: 1 min)`,
        j1: { traffic: "CLEAR", corridor: "ACTIVE" },
        j2: { traffic: "CLEAR", corridor: "ACTIVE" },
        j3: { traffic: "CLEAR", corridor: "ACTIVE" },
      },
      {
        stage: 4,
        status: "ARRIVED",
        lat: Number(destinationLat) || 18.5284,
        lng: Number(destinationLng) || 73.8742,
        speed: 0.0,
        distance: 0.0,
        etaSeconds: 0,
        desc: `🏥 ${vehicle.unitCode} Arrived on scene at ${destinationName}`,
        j1: { traffic: "CLEAR", corridor: "STANDBY" },
        j2: { traffic: "CLEAR", corridor: "STANDBY" },
        j3: { traffic: "CLEAR", corridor: "STANDBY" },
      },
      {
        stage: 5,
        status: "COMPLETED",
        lat: Number(destinationLat) || 18.5284,
        lng: Number(destinationLng) || 73.8742,
        speed: 0.0,
        distance: 0.0,
        etaSeconds: 0,
        desc: `✅ Emergency response mission completed successfully by ${vehicle.unitCode}`,
        j1: { traffic: "CLEAR", corridor: "STANDBY" },
        j2: { traffic: "CLEAR", corridor: "STANDBY" },
        j3: { traffic: "CLEAR", corridor: "STANDBY" },
      },
    ];

    if (action === "RESET") {
      const resetStage = simulationStages[0];
      const updatedVehicle = await prisma.emergencyVehicle.update({
        where: { id: vehicle.id },
        data: {
          status: "AVAILABLE",
          latitude: 18.5265,
          longitude: 73.8490,
          speed: 0.0,
          heading: 90.0,
          distanceRemaining: null,
          etaSeconds: null,
          assignedIncidentId: null,
          lastUpdated: new Date(),
        },
      });

      // Reset corridor
      const corridor = await prisma.emergencyCorridor.findFirst();
      if (corridor) {
        await prisma.emergencyCorridor.update({
          where: { id: corridor.id },
          data: { status: "ACTIVE", totalDistanceKm: 1.8, estimatedEtaMinutes: 4 },
        });
        const junctions = await prisma.corridorJunction.findMany({ where: { corridorId: corridor.id } });
        for (const j of junctions) {
          await prisma.corridorJunction.update({
            where: { id: j.id },
            data: { trafficStatus: "CLEAR", corridorStatus: "ACTIVE", lastUpdated: new Date() },
          });
        }
      }

      res.status(200).json({
        success: true,
        message: "Simulation reset to initial standby state.",
        data: {
          currentStage: 0,
          vehicle: updatedVehicle,
          isCompleted: false,
        },
      });
      return;
    }

    const currentStepIndex = Math.min(Math.max(Number(step), 0), simulationStages.length - 1);
    const targetStage = simulationStages[currentStepIndex];

    // Update vehicle
    const updatedVehicle = await prisma.emergencyVehicle.update({
      where: { id: vehicle.id },
      data: {
        status: targetStage.status,
        latitude: targetStage.lat,
        longitude: targetStage.lng,
        speed: targetStage.speed,
        heading: 90.0,
        distanceRemaining: targetStage.distance,
        etaSeconds: targetStage.etaSeconds,
        destinationName: destinationName || vehicle.destinationName || "Sassoon General Hospital",
        destinationLatitude: Number(destinationLat),
        destinationLongitude: Number(destinationLng),
        assignedIncidentId: incidentId || vehicle.assignedIncidentId,
        lastUpdated: new Date(),
      },
    });

    // Record Location History
    await prisma.vehicleLocationHistory.create({
      data: {
        vehicleId: vehicle.id,
        latitude: targetStage.lat,
        longitude: targetStage.lng,
        speed: targetStage.speed,
        heading: 90.0,
      },
    });

    // Record Dispatch Event
    await prisma.dispatchEvent.create({
      data: {
        vehicleId: vehicle.id,
        incidentId: incidentId || vehicle.assignedIncidentId || undefined,
        eventType: targetStage.status,
        latitude: targetStage.lat,
        longitude: targetStage.lng,
        description: targetStage.desc,
      },
    });

    // Update Corridor and Junctions
    const corridor = await prisma.emergencyCorridor.findFirst();
    if (corridor) {
      await prisma.emergencyCorridor.update({
        where: { id: corridor.id },
        data: {
          totalDistanceKm: targetStage.distance,
          estimatedEtaMinutes: Math.ceil(targetStage.etaSeconds / 60),
          status: targetStage.status === "COMPLETED" ? "COMPLETED" : "ACTIVE",
          updatedAt: new Date(),
        },
      });

      const junctions = await prisma.corridorJunction.findMany({
        where: { corridorId: corridor.id },
        orderBy: { sequence: "asc" },
      });

      if (junctions.length >= 3) {
        await prisma.corridorJunction.update({
          where: { id: junctions[0].id },
          data: { trafficStatus: targetStage.j1.traffic, corridorStatus: targetStage.j1.corridor, lastUpdated: new Date() },
        });
        await prisma.corridorJunction.update({
          where: { id: junctions[1].id },
          data: { trafficStatus: targetStage.j2.traffic, corridorStatus: targetStage.j2.corridor, lastUpdated: new Date() },
        });
        await prisma.corridorJunction.update({
          where: { id: junctions[2].id },
          data: { trafficStatus: targetStage.j3.traffic, corridorStatus: targetStage.j3.corridor, lastUpdated: new Date() },
        });
      }
    }

    // Sync incident if linked
    if (vehicle.assignedIncidentId || incidentId) {
      const incId = incidentId || vehicle.assignedIncidentId;
      const incident = await prisma.emergencyIncident.findUnique({ where: { id: incId } });
      if (incident) {
        let newIncStatus = incident.status;
        if (targetStage.status === "DISPATCHED") newIncStatus = "RESPONSE_INITIATED";
        if (targetStage.status === "EN_ROUTE") newIncStatus = "HELP_ARRIVING";
        if (targetStage.status === "ARRIVED" || targetStage.status === "COMPLETED") newIncStatus = "RESOLVED";

        let parsedTimeline: any[] = [];
        try {
          if (incident.timelineEvents) parsedTimeline = JSON.parse(incident.timelineEvents);
        } catch {}

        parsedTimeline.push({
          id: `tl-sim-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }),
          title: `Vehicle ${vehicle.unitCode} ${targetStage.status}`,
          description: targetStage.desc,
          type: targetStage.status === "ARRIVED" ? "RESOLVED" : "RESPONSE",
          actorBadge: `Unit ${vehicle.unitCode}`,
        });

        await prisma.emergencyIncident.update({
          where: { id: incId },
          data: {
            status: newIncStatus,
            timelineEvents: JSON.stringify(parsedTimeline),
          },
        });
      }
    }

    res.status(200).json({
      success: true,
      message: `Simulation step ${currentStepIndex} executed: ${targetStage.status}.`,
      data: {
        currentStage: currentStepIndex,
        stageDetails: targetStage,
        vehicle: updatedVehicle,
        nextStage: currentStepIndex < simulationStages.length - 1 ? currentStepIndex + 1 : null,
        isCompleted: targetStage.status === "COMPLETED" || targetStage.status === "ARRIVED",
      },
    });
  } catch (error) {
    next(error);
  }
}
