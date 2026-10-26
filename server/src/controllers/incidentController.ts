import { Response, NextFunction } from "express";
import { prisma } from "../prisma/client";
import { AuthenticatedRequest } from "../middleware/authMiddleware";
import { analyzeEmergencyIncident } from "../services/emergencyAnalysisService";

export async function createIncident(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Unauthorized." });
      return;
    }

    const {
      incidentType,
      description,
      peopleAffected = 1,
      vehiclesInvolved = 0,
      anyoneTrapped = false,
      smokeOrFire = false,
      latitude,
      longitude,
      locationAccuracy = null,
    } = req.body;

    // Run AI analysis triage
    const analysis = analyzeEmergencyIncident({
      incidentType,
      description,
      peopleAffected,
      vehiclesInvolved,
      anyoneTrapped,
      smokeOrFire,
    });

    const incident = await prisma.incident.create({
      data: {
        userId: req.user.id,
        incidentType,
        description,
        peopleAffected: Number(peopleAffected),
        vehiclesInvolved: Number(vehiclesInvolved),
        anyoneTrapped: Boolean(anyoneTrapped),
        smokeOrFire: Boolean(smokeOrFire),
        latitude: Number(latitude),
        longitude: Number(longitude),
        locationAccuracy: locationAccuracy !== null ? Number(locationAccuracy) : null,
        aiSummary: analysis.summary,
        aiPriority: analysis.suggestedPriority,
        recommendedResources: JSON.stringify(analysis.recommendedResources),
        status: "REPORT_CREATED",
      },
    });

    res.status(201).json({
      success: true,
      message: "Incident report created successfully.",
      data: {
        incident: {
          ...incident,
          recommendedResources: analysis.recommendedResources,
          analysis,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getIncidents(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Unauthorized." });
      return;
    }

    const { search, type, priority, status } = req.query;

    const whereClause: any = {
      userId: req.user.id,
    };

    if (type && typeof type === "string" && type.trim() !== "") {
      whereClause.incidentType = type.trim();
    }

    if (priority && typeof priority === "string" && priority.trim() !== "") {
      whereClause.aiPriority = priority.trim();
    }

    if (status && typeof status === "string" && status.trim() !== "") {
      whereClause.status = status.trim();
    }

    if (search && typeof search === "string" && search.trim() !== "") {
      const searchTerm = search.trim();
      whereClause.OR = [
        { incidentType: { contains: searchTerm } },
        { description: { contains: searchTerm } },
        { aiSummary: { contains: searchTerm } },
      ];
    }

    const incidents = await prisma.incident.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
    });

    const parsedIncidents = incidents.map((inc) => {
      let parsedRec: string[] = [];
      try {
        parsedRec = inc.recommendedResources ? JSON.parse(inc.recommendedResources) : [];
      } catch {
        parsedRec = [];
      }
      return {
        ...inc,
        recommendedResources: parsedRec,
      };
    });

    res.status(200).json({
      success: true,
      data: {
        incidents: parsedIncidents,
        total: parsedIncidents.length,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getIncidentById(
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

    const incident = await prisma.incident.findUnique({
      where: { id },
    });

    if (!incident || incident.userId !== req.user.id) {
      res.status(404).json({
        success: false,
        message: "Incident not found.",
      });
      return;
    }

    let parsedRec: string[] = [];
    try {
      parsedRec = incident.recommendedResources ? JSON.parse(incident.recommendedResources) : [];
    } catch {
      parsedRec = [];
    }

    res.status(200).json({
      success: true,
      data: {
        incident: {
          ...incident,
          recommendedResources: parsedRec,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function updateIncidentStatus(
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
    const { status } = req.body;

    const incident = await prisma.incident.findUnique({
      where: { id },
    });

    if (!incident || incident.userId !== req.user.id) {
      res.status(404).json({
        success: false,
        message: "Incident not found.",
      });
      return;
    }

    const updated = await prisma.incident.update({
      where: { id },
      data: { status },
    });

    let parsedRec: string[] = [];
    try {
      parsedRec = updated.recommendedResources ? JSON.parse(updated.recommendedResources) : [];
    } catch {
      parsedRec = [];
    }

    res.status(200).json({
      success: true,
      message: `Incident status updated to ${status}.`,
      data: {
        incident: {
          ...updated,
          recommendedResources: parsedRec,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteIncident(
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

    const incident = await prisma.incident.findUnique({
      where: { id },
    });

    if (!incident || incident.userId !== req.user.id) {
      res.status(404).json({
        success: false,
        message: "Incident not found.",
      });
      return;
    }

    await prisma.incident.delete({
      where: { id },
    });

    res.status(200).json({
      success: true,
      message: "Incident deleted successfully.",
    });
  } catch (error) {
    next(error);
  }
}

export async function getIncidentShareData(
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

    const incident = await prisma.incident.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            name: true,
            phoneNumber: true,
          },
        },
      },
    });

    if (!incident || incident.userId !== req.user.id) {
      res.status(404).json({
        success: false,
        message: "Incident not found.",
      });
      return;
    }

    const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${incident.latitude},${incident.longitude}`;

    // Safe, sanitized share payload without credentials
    const shareData = {
      incidentId: incident.id,
      incidentType: incident.incidentType,
      summary: incident.aiSummary || incident.description,
      priority: incident.aiPriority,
      status: incident.status,
      location: {
        latitude: incident.latitude,
        longitude: incident.longitude,
        accuracyMeters: incident.locationAccuracy,
        mapUrl: googleMapsUrl,
      },
      peopleAffected: incident.peopleAffected,
      smokeOrFire: incident.smokeOrFire,
      anyoneTrapped: incident.anyoneTrapped,
      reportedBy: incident.user.name,
      timestamp: incident.createdAt.toISOString(),
      formattedShareText: `[RakshAI Emergency Alert]\nType: ${incident.incidentType}\nPriority: ${incident.aiPriority}\nSummary: ${incident.aiSummary || incident.description}\nLocation: ${googleMapsUrl}\nTime: ${incident.createdAt.toLocaleString()}\nRef: #${incident.id.slice(-6)}`,
    };

    res.status(200).json({
      success: true,
      data: { shareData },
    });
  } catch (error) {
    next(error);
  }
}
