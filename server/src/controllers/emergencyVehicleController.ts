import { Request, Response, NextFunction } from "express";
import { prisma } from "../prisma/client";
import { AuthenticatedRequest } from "../middleware/authMiddleware";
import { calculateDistanceKm } from "../services/distanceService";

function formatClockTime(date: Date | string | null | undefined): string | null {
  if (!date) return null;
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return null;
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

/**
 * Format vehicle response object with computed clocks, distance, and freshness
 */
function formatVehiclePayload(v: any) {
  const now = Date.now();
  const updatedAtTime = new Date(v.lastUpdated).getTime();
  const ageMs = now - updatedAtTime;
  const isStale = ageMs > 2 * 60 * 1000; // > 2 mins stale
  const minutesAgo = Math.max(0, Math.floor(ageMs / 60000));

  // Compute expected arrival clock time if etaSeconds is present
  let expectedArrivalClockText: string | null = null;
  if (v.status === "ARRIVED") {
    expectedArrivalClockText = v.actualArrivalTime ? `Arrived at ${formatClockTime(v.actualArrivalTime)}` : "Arrived";
  } else if (v.expectedArrivalTime) {
    expectedArrivalClockText = formatClockTime(v.expectedArrivalTime);
  } else if (v.etaSeconds !== null && v.etaSeconds !== undefined && v.etaSeconds > 0) {
    const arrivalDate = new Date(now + v.etaSeconds * 1000);
    expectedArrivalClockText = formatClockTime(arrivalDate);
  }

  const actualArrivalClockText = v.actualArrivalTime ? formatClockTime(v.actualArrivalTime) : null;
  const lastUpdatedClockText = formatClockTime(v.lastUpdated);

  return {
    id: v.id,
    vehicleType: v.vehicleType,
    unitCode: v.unitCode,
    status: v.status,
    latitude: v.latitude,
    longitude: v.longitude,
    previousLatitude: v.previousLatitude || null,
    previousLongitude: v.previousLongitude || null,
    startLatitude: v.startLatitude || null,
    startLongitude: v.startLongitude || null,
    startLocationName: v.startLocationName || "Depot Base",
    currentLocationName: v.currentLocationName || "En Route",
    speed: v.speed,
    heading: v.heading,
    destinationLatitude: v.destinationLatitude,
    destinationLongitude: v.destinationLongitude,
    destinationName: v.destinationName,
    distanceTravelled: v.distanceTravelled !== null && v.distanceTravelled !== undefined ? Math.round(Number(v.distanceTravelled) * 10) / 10 : 0.0,
    distanceRemaining: v.distanceRemaining !== null && v.distanceRemaining !== undefined ? Math.round(Number(v.distanceRemaining) * 10) / 10 : null,
    etaSeconds: v.etaSeconds,
    etaMinutes: v.etaSeconds !== null && v.etaSeconds !== undefined ? Math.ceil(v.etaSeconds / 60) : null,
    expectedArrivalTime: v.expectedArrivalTime ? v.expectedArrivalTime.toISOString() : null,
    expectedArrivalClockText,
    actualArrivalTime: v.actualArrivalTime ? v.actualArrivalTime.toISOString() : null,
    actualArrivalClockText,
    assignedIncidentId: v.assignedIncidentId,
    routeId: v.routeId,
    lastUpdated: v.lastUpdated.toISOString(),
    lastUpdatedClockText,
    isStale,
    isLive: v.isLive !== false,
    dataFreshnessText: isStale
      ? `Last updated ${minutesAgo > 0 ? `${minutesAgo} min ago` : "recently"}`
      : "LIVE",
    isDemo: v.isDemo,
  };
}

/**
 * GET /api/emergency-vehicles/active
 * Returns all active emergency vehicles with real-time location, ETA, distance, and data freshness
 */
export async function getActiveVehicles(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const typeFilter = req.query.type ? String(req.query.type).toUpperCase() : undefined;
    const statusFilter = req.query.status ? String(req.query.status).toUpperCase() : undefined;
    const incidentIdFilter = req.query.incidentId ? String(req.query.incidentId) : undefined;

    const whereClause: any = {};
    if (typeFilter && typeFilter !== "ALL") {
      whereClause.vehicleType = typeFilter;
    }
    if (statusFilter && statusFilter !== "ALL") {
      whereClause.status = statusFilter;
    }
    if (incidentIdFilter) {
      whereClause.assignedIncidentId = incidentIdFilter;
    }

    const vehicles = await prisma.emergencyVehicle.findMany({
      where: whereClause,
      orderBy: [
        { status: "asc" },
        { lastUpdated: "desc" },
      ],
    });

    const formatted = vehicles.map(formatVehiclePayload);

    res.status(200).json({
      success: true,
      data: {
        vehicles: formatted,
        count: formatted.length,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/emergency-vehicles/:id
 */
export async function getVehicleById(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;

    const vehicle = await prisma.emergencyVehicle.findUnique({
      where: { id },
      include: {
        locationHistories: {
          orderBy: { timestamp: "desc" },
          take: 30,
        },
        dispatchEvents: {
          orderBy: { timestamp: "desc" },
          take: 20,
        },
      },
    });

    if (!vehicle) {
      res.status(404).json({
        success: false,
        message: "Emergency vehicle not found.",
      });
      return;
    }

    const formatted = formatVehiclePayload(vehicle);

    res.status(200).json({
      success: true,
      data: {
        vehicle: {
          ...formatted,
          locationHistories: vehicle.locationHistories.map((lh) => ({
            id: lh.id,
            latitude: lh.latitude,
            longitude: lh.longitude,
            speed: lh.speed,
            heading: lh.heading,
            locationName: lh.locationName,
            distanceTravelled: lh.distanceTravelled,
            timestamp: lh.timestamp.toISOString(),
            clockTime: formatClockTime(lh.timestamp),
          })),
          dispatchEvents: vehicle.dispatchEvents.map((ev) => ({
            id: ev.id,
            eventType: ev.eventType,
            description: ev.description,
            latitude: ev.latitude,
            longitude: ev.longitude,
            timestamp: ev.timestamp.toISOString(),
            clockTime: formatClockTime(ev.timestamp),
          })),
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/emergency-vehicles/:id/location-history
 */
export async function getVehicleLocationHistory(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const limit = req.query.limit ? Math.min(Number(req.query.limit), 100) : 50;

    const histories = await prisma.vehicleLocationHistory.findMany({
      where: { vehicleId: id },
      orderBy: { timestamp: "desc" },
      take: limit,
    });

    res.status(200).json({
      success: true,
      data: {
        vehicleId: id,
        histories: histories.map((h) => ({
          id: h.id,
          latitude: h.latitude,
          longitude: h.longitude,
          speed: h.speed,
          heading: h.heading,
          locationName: h.locationName,
          distanceTravelled: h.distanceTravelled,
          timestamp: h.timestamp.toISOString(),
          clockTime: formatClockTime(h.timestamp),
        })),
        count: histories.length,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/emergency-vehicles/:id/location
 * Updates vehicle real-time GPS coordinates, speed, heading, computes distance/ETA,
 * and executes AUTOMATIC ARRIVAL DETECTION.
 */
export async function updateVehicleLocation(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const {
      latitude,
      longitude,
      speed = null,
      heading = null,
      locationName = null,
      distanceRemaining = null,
      etaSeconds = null,
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
    const speedNum = speed !== null && !isNaN(Number(speed)) ? Number(speed) : 0.0;
    const headingNum = heading !== null && !isNaN(Number(heading)) ? Number(heading) : 0.0;

    const existing = await prisma.emergencyVehicle.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({
        success: false,
        message: "Emergency vehicle not found.",
      });
      return;
    }

    // Compute incremental distance travelled from previous point
    const stepDist = calculateDistanceKm(existing.latitude, existing.longitude, latNum, lonNum);
    const newDistanceTravelled = Math.round(((existing.distanceTravelled || 0) + (stepDist > 0.005 ? stepDist : 0)) * 10) / 10;

    // Compute distance remaining to destination if available
    let calculatedDistRemaining = distanceRemaining !== null && distanceRemaining !== undefined
      ? Number(distanceRemaining)
      : existing.distanceRemaining;

    if (existing.destinationLatitude && existing.destinationLongitude) {
      const liveDistToDest = calculateDistanceKm(
        latNum,
        lonNum,
        existing.destinationLatitude,
        existing.destinationLongitude
      );
      calculatedDistRemaining = Math.round(liveDistToDest * 10) / 10;
    }

    // Compute ETA in seconds
    let calculatedEtaSeconds = etaSeconds !== null && etaSeconds !== undefined
      ? Number(etaSeconds)
      : existing.etaSeconds;

    if (calculatedDistRemaining !== null && calculatedDistRemaining !== undefined) {
      const effSpeed = speedNum > 10 ? speedNum : (existing.vehicleType === "AMBULANCE" ? 42 : 36);
      calculatedEtaSeconds = Math.round((calculatedDistRemaining / effSpeed) * 3600);
    }

    // Compute Expected Arrival Time
    let expectedArrivalTime: Date | null = existing.expectedArrivalTime;
    if (calculatedEtaSeconds !== null && calculatedEtaSeconds > 0) {
      expectedArrivalTime = new Date(Date.now() + calculatedEtaSeconds * 1000);
    }

    // ==========================================
    // 🚨 ARRIVAL DETECTION LOGIC
    // ==========================================
    let newStatus = existing.status;
    let actualArrivalTime: Date | null = existing.actualArrivalTime;
    let isNewlyArrived = false;

    // If within 50 meters (0.05 km) of destination and currently dispatched or en route
    if (
      calculatedDistRemaining !== null &&
      calculatedDistRemaining <= 0.05 &&
      (existing.status === "DISPATCHED" || existing.status === "EN_ROUTE")
    ) {
      newStatus = "ARRIVED";
      actualArrivalTime = new Date();
      calculatedDistRemaining = 0.0;
      calculatedEtaSeconds = 0;
      expectedArrivalTime = null;
      isNewlyArrived = true;
    }

    const updateData: any = {
      previousLatitude: existing.latitude,
      previousLongitude: existing.longitude,
      latitude: latNum,
      longitude: lonNum,
      speed: newStatus === "ARRIVED" ? 0.0 : speedNum,
      heading: headingNum,
      currentLocationName: locationName || existing.currentLocationName || "En Route",
      distanceTravelled: newDistanceTravelled,
      distanceRemaining: calculatedDistRemaining,
      etaSeconds: calculatedEtaSeconds,
      expectedArrivalTime,
      actualArrivalTime,
      status: newStatus,
      lastUpdated: new Date(),
    };

    const updated = await prisma.emergencyVehicle.update({
      where: { id },
      data: updateData,
    });

    // Save Location History point
    await prisma.vehicleLocationHistory.create({
      data: {
        vehicleId: id,
        latitude: latNum,
        longitude: lonNum,
        speed: speedNum,
        heading: headingNum,
        locationName: locationName || existing.currentLocationName || undefined,
        distanceTravelled: newDistanceTravelled,
      },
    });

    // If newly arrived, create DispatchEvent and update Incident Timeline
    if (isNewlyArrived) {
      const arrivedDesc = `✅ ${updated.unitCode} (${updated.vehicleType}) has ARRIVED at ${updated.destinationName || "emergency scene"}`;
      await prisma.dispatchEvent.create({
        data: {
          vehicleId: id,
          incidentId: updated.assignedIncidentId || undefined,
          eventType: "ARRIVED",
          latitude: latNum,
          longitude: lonNum,
          description: arrivedDesc,
        },
      });

      if (updated.assignedIncidentId) {
        const incident = await prisma.emergencyIncident.findUnique({
          where: { id: updated.assignedIncidentId },
        });
        if (incident) {
          let parsedTimeline: any[] = [];
          try {
            if (incident.timelineEvents) parsedTimeline = JSON.parse(incident.timelineEvents);
          } catch {}

          parsedTimeline.push({
            id: `tl-arr-${Date.now()}`,
            timestamp: formatClockTime(new Date()) || "Now",
            title: `Unit ${updated.unitCode} ARRIVED`,
            description: arrivedDesc,
            type: "RESPONSE",
            actorBadge: `${updated.unitCode} Arrived`,
          });

          await prisma.emergencyIncident.update({
            where: { id: incident.id },
            data: {
              timelineEvents: JSON.stringify(parsedTimeline),
            },
          });
        }
      }
    }

    res.status(200).json({
      success: true,
      message: `Vehicle ${updated.unitCode} location updated successfully.`,
      data: { vehicle: formatVehiclePayload(updated) },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/emergency-vehicles/:id/status
 * Transitions vehicle status: AVAILABLE, DISPATCHED, EN_ROUTE, ARRIVED, COMPLETED, ON_BREAK
 */
export async function updateVehicleStatus(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const { status, destinationName, destinationLatitude, destinationLongitude, assignedIncidentId } = req.body;

    const validStatuses = ["AVAILABLE", "DISPATCHED", "EN_ROUTE", "ARRIVED", "COMPLETED", "ON_BREAK"];
    if (!status || !validStatuses.includes(status)) {
      res.status(400).json({
        success: false,
        message: `Invalid vehicle status. Must be one of: ${validStatuses.join(", ")}`,
      });
      return;
    }

    const vehicle = await prisma.emergencyVehicle.findUnique({ where: { id } });
    if (!vehicle) {
      res.status(404).json({
        success: false,
        message: "Emergency vehicle not found.",
      });
      return;
    }

    const updateData: any = {
      status,
      lastUpdated: new Date(),
    };

    if (destinationName !== undefined) updateData.destinationName = destinationName;
    if (destinationLatitude !== undefined) updateData.destinationLatitude = destinationLatitude;
    if (destinationLongitude !== undefined) updateData.destinationLongitude = destinationLongitude;
    if (assignedIncidentId !== undefined) updateData.assignedIncidentId = assignedIncidentId;

    if (status === "ARRIVED") {
      updateData.etaSeconds = 0;
      updateData.distanceRemaining = 0;
      updateData.speed = 0;
      updateData.actualArrivalTime = new Date();
      updateData.expectedArrivalTime = null;
    } else if (status === "COMPLETED" || status === "AVAILABLE") {
      updateData.assignedIncidentId = null;
      updateData.etaSeconds = null;
      updateData.distanceRemaining = null;
      updateData.speed = 0;
      updateData.expectedArrivalTime = null;
      updateData.actualArrivalTime = null;
    }

    const updated = await prisma.emergencyVehicle.update({
      where: { id },
      data: updateData,
    });

    // Create DispatchEvent
    let eventType = "STATUS_UPDATE";
    let desc = `${vehicle.unitCode} status changed to ${status}`;
    if (status === "DISPATCHED") {
      eventType = "DISPATCHED";
      desc = `🚨 ${vehicle.unitCode} dispatched to ${updated.destinationName || "emergency scene"}`;
    } else if (status === "EN_ROUTE") {
      eventType = "EN_ROUTE";
      desc = `🚑 ${vehicle.unitCode} is now EN ROUTE to destination`;
    } else if (status === "ARRIVED") {
      eventType = "ARRIVED";
      desc = `🏥 ${vehicle.unitCode} has arrived at destination`;
    } else if (status === "COMPLETED") {
      eventType = "COMPLETED";
      desc = `✅ Emergency response mission completed by ${vehicle.unitCode}`;
    }

    await prisma.dispatchEvent.create({
      data: {
        vehicleId: id,
        incidentId: updated.assignedIncidentId || undefined,
        eventType,
        latitude: updated.latitude,
        longitude: updated.longitude,
        description: desc,
      },
    });

    // If an incident is linked, synchronize incident status & timeline
    if (updated.assignedIncidentId) {
      const incident = await prisma.emergencyIncident.findUnique({
        where: { id: updated.assignedIncidentId },
      });
      if (incident) {
        let incidentNewStatus = incident.status;
        if (status === "DISPATCHED" && incident.status === "REPORTED") {
          incidentNewStatus = "RESPONSE_INITIATED";
        } else if (status === "EN_ROUTE") {
          incidentNewStatus = "HELP_ARRIVING";
        } else if (status === "ARRIVED" || status === "COMPLETED") {
          incidentNewStatus = "RESOLVED";
        }

        let parsedTimeline: any[] = [];
        try {
          if (incident.timelineEvents) parsedTimeline = JSON.parse(incident.timelineEvents);
        } catch {}

        parsedTimeline.push({
          id: `tl-veh-${Date.now()}`,
          timestamp: formatClockTime(new Date()) || "Now",
          title: `Vehicle ${vehicle.unitCode} ${status}`,
          description: desc,
          type: "RESPONSE",
          actorBadge: `Unit ${vehicle.unitCode}`,
        });

        await prisma.emergencyIncident.update({
          where: { id: incident.id },
          data: {
            status: incidentNewStatus,
            timelineEvents: JSON.stringify(parsedTimeline),
          },
        });
      }
    }

    res.status(200).json({
      success: true,
      message: `Vehicle ${vehicle.unitCode} status changed to ${status}.`,
      data: { vehicle: formatVehiclePayload(updated) },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/emergency-vehicles/dispatch
 * Dispatches an available emergency vehicle to an incident or destination
 */
export async function dispatchVehicle(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const {
      vehicleId,
      vehicleType = "AMBULANCE",
      incidentId = null,
      destinationName = "Incident Location",
      destinationLatitude = 18.5284,
      destinationLongitude = 73.8742,
    } = req.body;

    let targetVehicle = null;
    if (vehicleId) {
      targetVehicle = await prisma.emergencyVehicle.findUnique({ where: { id: vehicleId } });
    } else {
      // Find closest available vehicle of requested type
      targetVehicle = await prisma.emergencyVehicle.findFirst({
        where: {
          vehicleType: String(vehicleType).toUpperCase(),
          status: { in: ["AVAILABLE", "ON_BREAK", "COMPLETED"] },
        },
      });
      if (!targetVehicle) {
        // Fallback to any vehicle of that type
        targetVehicle = await prisma.emergencyVehicle.findFirst({
          where: { vehicleType: String(vehicleType).toUpperCase() },
        });
      }
    }

    if (!targetVehicle) {
      res.status(404).json({
        success: false,
        message: "No emergency vehicle available for dispatch.",
      });
      return;
    }

    const distKm = calculateDistanceKm(
      targetVehicle.latitude,
      targetVehicle.longitude,
      Number(destinationLatitude),
      Number(destinationLongitude)
    );
    const avgSpeed = targetVehicle.vehicleType === "AMBULANCE" ? 42 : targetVehicle.vehicleType === "POLICE" ? 38 : 35;
    const estEtaSec = Math.round((distKm / avgSpeed) * 3600);
    const expectedArrivalTime = new Date(Date.now() + estEtaSec * 1000);

    const updatedVehicle = await prisma.emergencyVehicle.update({
      where: { id: targetVehicle.id },
      data: {
        status: "DISPATCHED",
        assignedIncidentId: incidentId || null,
        startLatitude: targetVehicle.latitude,
        startLongitude: targetVehicle.longitude,
        startLocationName: targetVehicle.currentLocationName || "Depot Base",
        destinationLatitude: Number(destinationLatitude),
        destinationLongitude: Number(destinationLongitude),
        destinationName: String(destinationName),
        distanceTravelled: 0.0,
        distanceRemaining: Math.round(distKm * 10) / 10,
        etaSeconds: estEtaSec,
        expectedArrivalTime,
        actualArrivalTime: null,
        speed: avgSpeed,
        lastUpdated: new Date(),
      },
    });

    // Create Dispatch Event
    await prisma.dispatchEvent.create({
      data: {
        vehicleId: targetVehicle.id,
        incidentId: incidentId || undefined,
        eventType: "DISPATCHED",
        latitude: targetVehicle.latitude,
        longitude: targetVehicle.longitude,
        description: `🚨 ${targetVehicle.unitCode} dispatched to ${destinationName} (ETA ~${Math.ceil(estEtaSec / 60)} min)`,
      },
    });

    res.status(200).json({
      success: true,
      message: `Emergency vehicle ${targetVehicle.unitCode} dispatched successfully.`,
      data: {
        vehicle: formatVehiclePayload(updatedVehicle),
        etaMinutes: Math.ceil(estEtaSec / 60),
        distanceKm: Math.round(distKm * 10) / 10,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/incidents/:id/dispatch
 * Dispatches all required emergency responders (Ambulance, Police, Fire Brigade) to an incident
 */
export async function dispatchIncidentResponders(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const { services = ["AMBULANCE", "POLICE", "FIRE_BRIGADE"], notes = "" } = req.body;

    const incident = await prisma.emergencyIncident.findUnique({
      where: { id },
    });

    if (!incident) {
      res.status(404).json({
        success: false,
        message: "Incident not found.",
      });
      return;
    }

    const dispatchedVehicles: any[] = [];

    for (const serviceType of services) {
      const normType = String(serviceType).toUpperCase();
      // Find candidate vehicle
      let vehicle = await prisma.emergencyVehicle.findFirst({
        where: {
          vehicleType: normType,
          status: { in: ["AVAILABLE", "ON_BREAK", "COMPLETED"] },
        },
      });

      if (!vehicle) {
        vehicle = await prisma.emergencyVehicle.findFirst({
          where: { vehicleType: normType },
        });
      }

      if (vehicle) {
        const distKm = calculateDistanceKm(
          vehicle.latitude,
          vehicle.longitude,
          incident.latitude,
          incident.longitude
        );
        const avgSpeed = normType === "AMBULANCE" ? 42 : normType === "POLICE" ? 38 : 35;
        const estEtaSec = Math.round((distKm / avgSpeed) * 3600);
        const expectedArrivalTime = new Date(Date.now() + estEtaSec * 1000);

        const updated = await prisma.emergencyVehicle.update({
          where: { id: vehicle.id },
          data: {
            status: "EN_ROUTE",
            assignedIncidentId: incident.id,
            startLatitude: vehicle.latitude,
            startLongitude: vehicle.longitude,
            destinationLatitude: incident.latitude,
            destinationLongitude: incident.longitude,
            destinationName: incident.address || `Incident #${incident.incidentCode || incident.id.slice(0, 4)}`,
            distanceRemaining: Math.round(distKm * 10) / 10,
            distanceTravelled: 0.1,
            etaSeconds: estEtaSec,
            expectedArrivalTime,
            actualArrivalTime: null,
            speed: avgSpeed,
            lastUpdated: new Date(),
          },
        });

        dispatchedVehicles.push(formatVehiclePayload(updated));

        await prisma.dispatchEvent.create({
          data: {
            vehicleId: vehicle.id,
            incidentId: incident.id,
            eventType: "DISPATCHED",
            latitude: vehicle.latitude,
            longitude: vehicle.longitude,
            description: `🚨 ${vehicle.unitCode} (${normType}) dispatched to ${incident.address || "Emergency Scene"} (ETA ${Math.ceil(estEtaSec / 60)} min)`,
          },
        });
      }
    }

    // Update Incident status
    let parsedTimeline: any[] = [];
    try {
      if (incident.timelineEvents) parsedTimeline = JSON.parse(incident.timelineEvents);
    } catch {}

    parsedTimeline.push({
      id: `tl-dispatch-${Date.now()}`,
      timestamp: formatClockTime(new Date()) || "Now",
      title: "Emergency Responders Dispatched",
      description: `Dispatched: ${dispatchedVehicles.map((v) => v.unitCode).join(", ")}. Green response priority enabled.`,
      type: "RESPONSE",
      actorBadge: "Central Dispatch",
    });

    await prisma.emergencyIncident.update({
      where: { id: incident.id },
      data: {
        status: "RESPONSE_INITIATED",
        timelineEvents: JSON.stringify(parsedTimeline),
      },
    });

    res.status(200).json({
      success: true,
      message: `Emergency responders successfully dispatched to incident #${incident.incidentCode || incident.id.slice(0, 6)}.`,
      data: {
        incidentId: incident.id,
        dispatchedCount: dispatchedVehicles.length,
        vehicles: dispatchedVehicles,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/incidents/:id/response
 * Returns full real-time response payload: Incident + Assigned Responders (Ambulance, Police, Fire) +
 * Response Timeline + Corridor + Route Geometry + Expected arrival clocks.
 */
export async function getIncidentResponseData(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const userLatStr = req.query.userLat as string | undefined;
    const userLngStr = req.query.userLng as string | undefined;

    const incident = await prisma.emergencyIncident.findUnique({
      where: { id },
      include: {
        evidence: { take: 5, orderBy: { createdAt: "desc" } },
        verifications: { take: 10, orderBy: { createdAt: "desc" } },
      },
    });

    if (!incident) {
      res.status(404).json({
        success: false,
        message: "Incident not found.",
      });
      return;
    }

    // Query all vehicles assigned to this incident OR nearby active emergency vehicles
    const assignedVehicles = await prisma.emergencyVehicle.findMany({
      where: {
        OR: [
          { assignedIncidentId: incident.id },
          { status: { in: ["EN_ROUTE", "DISPATCHED", "ARRIVED"] } },
        ],
      },
      include: {
        locationHistories: { take: 10, orderBy: { timestamp: "desc" } },
        dispatchEvents: { take: 10, orderBy: { timestamp: "desc" } },
      },
      orderBy: { lastUpdated: "desc" },
    });

    // If none found, fetch demo / active vehicles
    let vehiclesList = assignedVehicles;
    if (vehiclesList.length === 0) {
      vehiclesList = await prisma.emergencyVehicle.findMany({
        take: 6,
        orderBy: { lastUpdated: "desc" },
        include: {
          locationHistories: { take: 10, orderBy: { timestamp: "desc" } },
          dispatchEvents: { take: 10, orderBy: { timestamp: "desc" } },
        },
      });
    }

    const formattedVehicles = vehiclesList.map(formatVehiclePayload);

    // Identify primary units by type
    const ambulanceUnit = formattedVehicles.find((v) => v.vehicleType === "AMBULANCE") || null;
    const policeUnit = formattedVehicles.find((v) => v.vehicleType === "POLICE") || null;
    const fireUnit = formattedVehicles.find((v) => v.vehicleType === "FIRE_BRIGADE") || null;

    // Query active corridor if any
    const corridor = await prisma.emergencyCorridor.findFirst({
      where: {
        status: "ACTIVE",
      },
      include: {
        junctions: { orderBy: { sequence: "asc" } },
        recommendations: true,
      },
    });

    // Parse Timeline
    let parsedTimeline: any[] = [];
    try {
      if (incident.timelineEvents) parsedTimeline = JSON.parse(incident.timelineEvents);
    } catch {}

    // Calculate user distance to incident if coordinates provided
    let userDistanceKm: number | null = null;
    if (userLatStr && userLngStr && !isNaN(Number(userLatStr)) && !isNaN(Number(userLngStr))) {
      userDistanceKm = Math.round(calculateDistanceKm(
        Number(userLatStr),
        Number(userLngStr),
        incident.latitude,
        incident.longitude
      ) * 10) / 10;
    }

    res.status(200).json({
      success: true,
      data: {
        incident: {
          id: incident.id,
          incidentCode: incident.incidentCode || `RK-${incident.id.slice(0, 4)}`,
          type: incident.type,
          latitude: incident.latitude,
          longitude: incident.longitude,
          address: incident.address,
          description: incident.description,
          status: incident.status,
          severity: incident.severity || "CRITICAL",
          detectedAt: incident.detectedAt.toISOString(),
          reportedAtClock: formatClockTime(incident.detectedAt),
          ambulanceNeeded: incident.ambulanceNeeded,
          policeNeeded: incident.policeNeeded,
          fireServiceNeeded: incident.fireServiceNeeded,
          userDistanceKm,
          timeline: parsedTimeline,
        },
        responders: {
          ambulance: ambulanceUnit,
          police: policeUnit,
          fireBrigade: fireUnit,
          all: formattedVehicles,
        },
        corridor: corridor
          ? {
              id: corridor.id,
              name: corridor.name,
              status: corridor.status,
              priority: corridor.priority,
              totalDistanceKm: corridor.totalDistanceKm,
              estimatedEtaMinutes: corridor.estimatedEtaMinutes,
              trafficCondition: corridor.trafficCondition,
              junctions: corridor.junctions,
              recommendations: corridor.recommendations,
              waypoints: corridor.waypointsJson ? JSON.parse(corridor.waypointsJson) : [],
            }
          : null,
      },
    });
  } catch (error) {
    next(error);
  }
}
