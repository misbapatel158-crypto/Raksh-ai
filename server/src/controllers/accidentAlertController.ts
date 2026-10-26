import { Request, Response, NextFunction } from "express";
import { prisma } from "../prisma/client";
import { AuthenticatedRequest } from "../middleware/authMiddleware";
import { calculateDistanceKm } from "../services/distanceService";

function generateIncidentCode(): string {
  const num = Math.floor(1000 + Math.random() * 9000);
  return `RK-${num}`;
}

function formatCurrentTime(): string {
  const d = new Date();
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

interface TimelineItem {
  id: string;
  timestamp: string;
  title: string;
  description: string;
  type: "REPORT" | "LOCATION" | "PHOTO" | "WITNESS" | "ALERT" | "RESPONSE" | "STATUS_CHANGE" | "RESOLVED";
  actorBadge?: string;
}

/**
 * POST /api/incidents/report
 * User / Citizen reporting of emergency with auto GPS, multi-report grouping, evidence photo, and AI classification assist
 */
export async function reportAccidentEmergency(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const {
      type = "ROAD_ACCIDENT",
      latitude,
      longitude,
      accuracy = null,
      address = null,
      description = "",
      helpRequired = { ambulance: true, police: true, fireBrigade: false },
      evidencePhotoBase64 = null,
      evidenceCaption = null,
      isPrivacyBlurred = true,
      source = "USER_REPORT",
      severity: customSeverity = null,
    } = req.body;

    if (
      latitude === undefined ||
      longitude === undefined ||
      isNaN(Number(latitude)) ||
      isNaN(Number(longitude))
    ) {
      res.status(400).json({
        success: false,
        message: "Valid numeric latitude and longitude coordinates are required.",
      });
      return;
    }

    const latNum = Number(latitude);
    const lonNum = Number(longitude);
    const accNum = accuracy !== null && !isNaN(Number(accuracy)) ? Number(accuracy) : null;
    const userId = req.user?.id || null;
    const normType = String(type).toUpperCase();

    // AI Severity estimation
    let severity = customSeverity || "CRITICAL";
    if (!customSeverity) {
      const lowerDesc = String(description).toLowerCase();
      if (lowerDesc.includes("fire") || lowerDesc.includes("flame") || lowerDesc.includes("trapped") || lowerDesc.includes("unconscious") || lowerDesc.includes("critical")) {
        severity = "CRITICAL";
      } else if (lowerDesc.includes("minor") || lowerDesc.includes("scratch") || lowerDesc.includes("block") || lowerDesc.includes("traffic")) {
        severity = "HIGH";
      }
    }

    // AI Classification Confidence
    let aiConfidenceScore = 88;
    let aiClassification = "Road Accident";
    if (normType === "FIRE") {
      aiClassification = "Structure / Vehicle Fire";
      aiConfidenceScore = 93;
    } else if (normType === "MEDICAL") {
      aiClassification = "Medical Emergency";
      aiConfidenceScore = 90;
    } else if (normType === "ROAD_BLOCK") {
      aiClassification = "Road Hazard / Traffic Block";
      aiConfidenceScore = 85;
    } else if (normType === "OTHER") {
      aiClassification = "Unspecified Emergency";
      aiConfidenceScore = 78;
    }

    const timeStr = formatCurrentTime();

    // Grouping check: Look for an active incident of matching or compatible type within 500 meters reported in the last 2 hours
    const groupingCutoff = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const candidateIncidents = await prisma.emergencyIncident.findMany({
      where: {
        createdAt: { gte: groupingCutoff },
        status: { notIn: ["CANCELLED", "RESOLVED"] },
      },
      include: {
        evidence: true,
      },
    });

    const nearbyGroupTarget = candidateIncidents.find((inc) => {
      const dist = calculateDistanceKm(latNum, lonNum, inc.latitude, inc.longitude);
      const sameOrRelatedType = inc.type === normType || (normType === "ROAD_ACCIDENT" && inc.type === "ROAD_ACCIDENT");
      return dist <= 0.5 && sameOrRelatedType; // within 500 meters
    });

    if (nearbyGroupTarget) {
      // Group with existing incident!
      let parsedTimeline: TimelineItem[] = [];
      try {
        if (nearbyGroupTarget.timelineEvents) {
          parsedTimeline = JSON.parse(nearbyGroupTarget.timelineEvents);
        }
      } catch {}

      parsedTimeline.push({
        id: `tl-${Date.now()}-witness`,
        timestamp: timeStr,
        title: "Additional witness report received",
        description: description
          ? `Witness noted: "${description.slice(0, 100)}"`
          : "Nearby citizen submitted corroborating incident report",
        type: "WITNESS",
        actorBadge: "Nearby Witness",
      });

      let newPhotoCount = nearbyGroupTarget.photoCount;

      // Add evidence photo if provided
      if (evidencePhotoBase64) {
        await prisma.incidentEvidence.create({
          data: {
            incidentId: nearbyGroupTarget.id,
            imageUrl: evidencePhotoBase64,
            caption: evidenceCaption || "Citizen witness photo evidence",
            uploaderId: userId,
            approxLatitude: latNum,
            approxLongitude: lonNum,
            aiSuggestedType: aiClassification,
            aiConfidence: aiConfidenceScore,
            isPrivacyBlurred: Boolean(isPrivacyBlurred),
          },
        });
        newPhotoCount += 1;

        parsedTimeline.push({
          id: `tl-${Date.now()}-photo`,
          timestamp: timeStr,
          title: "Incident photo attached",
          description: isPrivacyBlurred
            ? "Photo uploaded with privacy shield (faces & number plates protected)"
            : "Photo evidence submitted",
          type: "PHOTO",
          actorBadge: "Evidence Hub",
        });
      }

      const updatedIncident = await prisma.emergencyIncident.update({
        where: { id: nearbyGroupTarget.id },
        data: {
          reportCount: nearbyGroupTarget.reportCount + 1,
          photoCount: newPhotoCount,
          timelineEvents: JSON.stringify(parsedTimeline),
          confidence: "COMMUNITY_VERIFIED",
        },
        include: {
          evidence: true,
          verifications: true,
        },
      });

      res.status(200).json({
        success: true,
        message: `Report grouped under existing Incident #${updatedIncident.incidentCode || updatedIncident.id.slice(0, 8)}. Total witness reports: ${updatedIncident.reportCount}.`,
        data: {
          incident: {
            ...updatedIncident,
            isGroupedWithExisting: true,
            timeline: parsedTimeline,
          },
        },
      });
      return;
    }

    // Search nearest hospital & fire service for immediate emergency routing
    const hospitals = await prisma.hospital.findMany({ where: { isActive: true } });
    let nearestHospital = null;
    let minHospitalDist = Infinity;
    for (const h of hospitals) {
      const d = calculateDistanceKm(latNum, lonNum, h.latitude, h.longitude);
      if (d < minHospitalDist) {
        minHospitalDist = d;
        nearestHospital = { ...h, distanceKm: d };
      }
    }

    const fireStations = await prisma.fireService.findMany({ where: { isActive: true } });
    let nearestFireService = null;
    let minFireDist = Infinity;
    for (const f of fireStations) {
      const d = calculateDistanceKm(latNum, lonNum, f.latitude, f.longitude);
      if (d < minFireDist) {
        minFireDist = d;
        nearestFireService = { ...f, distanceKm: d };
      }
    }

    const incidentCode = generateIncidentCode();
    const initialTimeline: TimelineItem[] = [
      {
        id: `tl-${Date.now()}-1`,
        timestamp: timeStr,
        title: "Incident reported",
        description: description || `New ${aiClassification} reported via RakshAI`,
        type: "REPORT",
        actorBadge: "Reporter",
      },
      {
        id: `tl-${Date.now()}-2`,
        timestamp: timeStr,
        title: "Location received",
        description: `GPS coordinates fixed (${latNum.toFixed(4)}, ${lonNum.toFixed(4)})${accNum ? ` ±${Math.round(accNum)}m accuracy` : ""}`,
        type: "LOCATION",
        actorBadge: "GPS Subsystem",
      },
    ];

    if (evidencePhotoBase64) {
      initialTimeline.push({
        id: `tl-${Date.now()}-3`,
        timestamp: timeStr,
        title: "First photo uploaded",
        description: isPrivacyBlurred
          ? "Photo uploaded with privacy shield (faces & number plates protected)"
          : "Photo evidence submitted",
        type: "PHOTO",
        actorBadge: "Evidence Hub",
      });
    }

    const expiresAt = new Date(Date.now() + 4 * 60 * 60 * 1000);

    const createdIncident = await prisma.emergencyIncident.create({
      data: {
        incidentCode,
        userId,
        reporterUserId: userId,
        type: normType,
        latitude: latNum,
        longitude: lonNum,
        accuracy: accNum,
        address: address || null,
        description: description || `${aiClassification} reported near location`,
        status: "REPORTED",
        ambulanceNeeded: Boolean(helpRequired.ambulance),
        policeNeeded: Boolean(helpRequired.police),
        fireServiceNeeded: Boolean(helpRequired.fireBrigade),
        source: String(source),
        confidence: "REPORTED",
        severity,
        aiClassification,
        aiConfidenceScore,
        reportCount: 1,
        photoCount: evidencePhotoBase64 ? 1 : 0,
        timelineEvents: JSON.stringify(initialTimeline),
        isPublicAlert: true,
        expiresAt,
        nearestHospitalId: nearestHospital ? nearestHospital.id : null,
        nearestFireServiceId: nearestFireService ? nearestFireService.id : null,
      },
    });

    if (evidencePhotoBase64) {
      await prisma.incidentEvidence.create({
        data: {
          incidentId: createdIncident.id,
          imageUrl: evidencePhotoBase64,
          caption: evidenceCaption || "Initial incident photo evidence",
          uploaderId: userId,
          approxLatitude: latNum,
          approxLongitude: lonNum,
          aiSuggestedType: aiClassification,
          aiConfidence: aiConfidenceScore,
          isPrivacyBlurred: Boolean(isPrivacyBlurred),
        },
      });
    }

    // Save location history for diagnostics
    await prisma.userLocation.create({
      data: {
        userId,
        latitude: latNum,
        longitude: lonNum,
        accuracy: accNum,
      },
    });

    res.status(201).json({
      success: true,
      message: `Emergency incident #${incidentCode} created successfully. Initial status: REPORTED.`,
      data: {
        incident: {
          ...createdIncident,
          nearestHospital,
          nearestFireService,
          timeline: initialTimeline,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/incidents/:id/evidence
 * Uploads additional photo evidence to an incident with privacy blurring option
 */
export async function addIncidentEvidence(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const {
      imageUrl,
      caption = "",
      approxLatitude = null,
      approxLongitude = null,
      isPrivacyBlurred = true,
      aiSuggestedType = null,
    } = req.body;

    if (!imageUrl) {
      res.status(400).json({
        success: false,
        message: "Image URL or Base64 data is required.",
      });
      return;
    }

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

    const userId = req.user?.id || null;

    const evidence = await prisma.incidentEvidence.create({
      data: {
        incidentId: id,
        imageUrl,
        caption: caption ? String(caption).slice(0, 300) : null,
        uploaderId: userId,
        approxLatitude: approxLatitude ? Number(approxLatitude) : null,
        approxLongitude: approxLongitude ? Number(approxLongitude) : null,
        aiSuggestedType: aiSuggestedType || incident.aiClassification || "Incident Evidence",
        aiConfidence: 87,
        isPrivacyBlurred: Boolean(isPrivacyBlurred),
      },
    });

    // Update incident photo count & timeline
    let parsedTimeline: TimelineItem[] = [];
    try {
      if (incident.timelineEvents) {
        parsedTimeline = JSON.parse(incident.timelineEvents);
      }
    } catch {}

    const timeStr = formatCurrentTime();
    parsedTimeline.push({
      id: `tl-${Date.now()}-photo`,
      timestamp: timeStr,
      title: "Additional photo uploaded",
      description: isPrivacyBlurred
        ? "Photo uploaded with privacy shield (faces & number plates protected)"
        : "Photo evidence submitted to Evidence Hub",
      type: "PHOTO",
      actorBadge: "Evidence Hub",
    });

    const updatedIncident = await prisma.emergencyIncident.update({
      where: { id },
      data: {
        photoCount: incident.photoCount + 1,
        timelineEvents: JSON.stringify(parsedTimeline),
      },
    });

    res.status(201).json({
      success: true,
      message: "Evidence submitted successfully with privacy protection.",
      data: {
        evidence,
        incident: updatedIncident,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/incidents/ai-classify
 * AI Emergency Assistant & Decision Engine for rapid incident triage
 */
export async function classifyIncidentWithAI(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { description = "", reportedType = "ROAD_ACCIDENT" } = req.body;
    const text = String(description).toLowerCase();

    let suggestedType: "ROAD_ACCIDENT" | "FIRE" | "MEDICAL" | "ROAD_BLOCK" | "OTHER" = "ROAD_ACCIDENT";
    let suggestedTypeLabel = "Road Accident";
    let confidence = 87;
    let severity: "LOW" | "HIGH" | "CRITICAL" = "CRITICAL";
    let recommendedServices: Array<"AMBULANCE" | "POLICE" | "FIRE_BRIGADE"> = ["AMBULANCE", "POLICE"];
    let reasoning = "Context indicates a vehicle collision or road incident.";
    let triageSummary = "Recommended immediate dispatch of 102/108 Ambulance and 100 Police Control Room.";
    let suggestedActionPlan = [
      "1. Dial 112 / 102 to request ambulance",
      "2. Ensure safe distance from moving traffic",
      "3. Do not move injured individuals unless there is immediate fire danger",
      "4. Share live GPS location with emergency contacts",
    ];

    if (text.includes("fire") || text.includes("smoke") || text.includes("burn") || text.includes("flame") || text.includes("explosion") || reportedType === "FIRE") {
      suggestedType = "FIRE";
      suggestedTypeLabel = "Structure / Vehicle Fire";
      confidence = 94;
      severity = "CRITICAL";
      recommendedServices = ["FIRE_BRIGADE", "POLICE", "AMBULANCE"];
      reasoning = "High risk of flame propagation, hazardous smoke, or structural risk detected.";
      triageSummary = "Immediate 101 Fire Brigade dispatch required. Alert nearby citizens to evacuate upwind.";
      suggestedActionPlan = [
        "1. Immediately call 101 Fire Brigade & 112",
        "2. Evacuate area immediately — move upwind of smoke",
        "3. Do not enter burning structures or vehicles",
        "4. Keep roads clear for fire rescue engines",
      ];
    } else if (text.includes("heart") || text.includes("breathing") || text.includes("unconscious") || text.includes("faint") || text.includes("stroke") || text.includes("seizure") || reportedType === "MEDICAL") {
      suggestedType = "MEDICAL";
      suggestedTypeLabel = "Acute Medical Emergency";
      confidence = 91;
      severity = "CRITICAL";
      recommendedServices = ["AMBULANCE"];
      reasoning = "Patient condition indicates potential cardiovascular or respiratory distress requiring acute medical care.";
      triageSummary = "Priority 102/108 Ambulance dispatch and nearest hospital emergency trauma routing.";
      suggestedActionPlan = [
        "1. Call 108 / 102 Ambulance immediately",
        "2. Check responsiveness and breathing",
        "3. Keep airway open, place in recovery position if breathing but unconscious",
        "4. Prepare to direct incoming paramedics",
      ];
    } else if (text.includes("tree") || text.includes("block") || text.includes("waterlog") || text.includes("landslide") || text.includes("pothole") || text.includes("traffic") || reportedType === "ROAD_BLOCK") {
      suggestedType = "ROAD_BLOCK";
      suggestedTypeLabel = "Road Hazard / Traffic Obstruction";
      confidence = 88;
      severity = "HIGH";
      recommendedServices = ["POLICE"];
      reasoning = "Obstruction on roadway posing collision risk for oncoming vehicles.";
      triageSummary = "Traffic control alert recommended. Notify municipal authorities and police.";
      suggestedActionPlan = [
        "1. Alert Traffic Police via 100 / 112",
        "2. Place warning hazard lights or cones if safe to do so",
        "3. Warn oncoming drivers from safe sidewalk position",
      ];
    }

    res.status(200).json({
      success: true,
      message: "AI incident classification and triage assessment generated.",
      data: {
        analysis: {
          suggestedType,
          suggestedTypeLabel,
          confidence,
          severity,
          recommendedServices,
          reasoning,
          triageSummary,
          suggestedActionPlan,
          disclaimer: "AI suggestions are for triage assistance only. Always verify situational facts and directly dial emergency services.",
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/incidents/simulate
 * Safe Demo Simulation Mode for Hackathon presentation
 */
export async function simulateEmergencyDemo(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { scenario = "ACCIDENT", latitude = 18.5204, longitude = 73.8567 } = req.body;
    const latNum = Number(latitude) || 18.5204;
    const lonNum = Number(longitude) || 73.8567;
    const incidentCode = generateIncidentCode();

    let incidentType = "ROAD_ACCIDENT";
    let desc = "SIMULATION: Multi-vehicle road collision on expressway";
    let aiClass = "Road Accident";
    let reportCount = 1;
    let photoCount = 1;
    let severity = "CRITICAL";

    let sampleTimeline: TimelineItem[] = [
      {
        id: `tl-sim-1`,
        timestamp: "3:42 PM",
        title: "Incident reported",
        description: "Sensor impact detected (31.8g) + initial manual trigger",
        type: "REPORT",
        actorBadge: "Sensor Subsystem",
      },
      {
        id: `tl-sim-2`,
        timestamp: "3:43 PM",
        title: "Location received",
        description: `GPS coordinates locked (${latNum.toFixed(4)}, ${lonNum.toFixed(4)}) ±5m`,
        type: "LOCATION",
        actorBadge: "High-Precision GPS",
      },
      {
        id: `tl-sim-3`,
        timestamp: "3:44 PM",
        title: "First photo uploaded",
        description: "Evidence photo uploaded with privacy blur (license plates masked)",
        type: "PHOTO",
        actorBadge: "Evidence Hub",
      },
      {
        id: `tl-sim-4`,
        timestamp: "3:45 PM",
        title: "Additional report received",
        description: "Nearby commuter corroborated vehicle obstruction",
        type: "WITNESS",
        actorBadge: "Witness #2",
      },
      {
        id: `tl-sim-5`,
        timestamp: "3:46 PM",
        title: "Emergency contact notified",
        description: "Automated SMS/WhatsApp payload prepared for registered guardians",
        type: "ALERT",
        actorBadge: "Guardian Engine",
      },
      {
        id: `tl-sim-6`,
        timestamp: "3:48 PM",
        title: "Response initiated",
        description: "Nearest hospital emergency trauma ward alerted",
        type: "RESPONSE",
        actorBadge: "RakshAI Network",
      },
    ];

    if (scenario === "FIRE") {
      incidentType = "FIRE";
      desc = "SIMULATION: Commercial structure fire with smoke discharge";
      aiClass = "Structure Fire";
      severity = "CRITICAL";
      reportCount = 3;
      photoCount = 2;
    } else if (scenario === "MEDICAL") {
      incidentType = "MEDICAL";
      desc = "SIMULATION: Acute cardiac distress in public transit terminal";
      aiClass = "Medical Emergency";
      severity = "CRITICAL";
      reportCount = 1;
      photoCount = 0;
    } else if (scenario === "CROWD_REPORT") {
      incidentType = "ROAD_ACCIDENT";
      desc = "SIMULATION: Multi-witness aggregated accident with 5 community reports and 8 photos";
      aiClass = "Multi-Vehicle Collision";
      severity = "CRITICAL";
      reportCount = 5;
      photoCount = 8;
    }

    const simIncident = await prisma.emergencyIncident.create({
      data: {
        incidentCode,
        userId: req.user?.id || null,
        reporterUserId: req.user?.id || null,
        type: incidentType,
        latitude: latNum,
        longitude: lonNum,
        accuracy: 4.5,
        address: "Demo Highway Corridor, Sector 4",
        description: `[DEMO SIMULATION] ${desc}`,
        status: "RESPONSE_INITIATED",
        ambulanceNeeded: true,
        policeNeeded: true,
        fireServiceNeeded: scenario === "FIRE",
        source: "DEMO_SIMULATION",
        confidence: "COMMUNITY_VERIFIED",
        severity,
        aiClassification: aiClass,
        aiConfidenceScore: 92,
        reportCount,
        photoCount,
        timelineEvents: JSON.stringify(sampleTimeline),
        isPublicAlert: true,
        expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
      },
    });

    // Seed a sample photo evidence
    await prisma.incidentEvidence.create({
      data: {
        incidentId: simIncident.id,
        imageUrl: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'><rect width='100%' height='100%' fill='%2327272a'/><circle cx='200' cy='150' r='60' fill='%23ef4444'/><text x='200' y='155' font-family='sans-serif' font-size='16' fill='white' text-anchor='middle' font-weight='bold'>DEMO EVIDENCE</text><text x='200' y='180' font-family='sans-serif' font-size='12' fill='%23a1a1aa' text-anchor='middle'>Privacy Shield Active</text></svg>",
        caption: "Simulation incident scene photo with privacy filter",
        approxLatitude: latNum,
        approxLongitude: lonNum,
        aiSuggestedType: aiClass,
        aiConfidence: 92,
        isPrivacyBlurred: true,
      },
    });

    res.status(201).json({
      success: true,
      message: `Demo simulation scenario #${incidentCode} initialized successfully.`,
      data: {
        incident: {
          ...simIncident,
          timeline: sampleTimeline,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/incidents/possible-accident
 * Creates a sensor-detected or manual possible road accident incident
 */
export async function createPossibleAccident(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const {
      latitude,
      longitude,
      accuracy = null,
      description = "Possible road accident impact detected via device sensors",
      source = "SENSOR_POSSIBLE_CRASH",
      confidence = "POSSIBLE",
      status = "REPORTED",
      ambulanceNeeded = true,
      policeNeeded = true,
      fireServiceNeeded = false,
      isPublicAlert = true,
      type = "ROAD_ACCIDENT",
    } = req.body;

    if (
      latitude === undefined ||
      longitude === undefined ||
      isNaN(Number(latitude)) ||
      isNaN(Number(longitude))
    ) {
      res.status(400).json({
        success: false,
        message: "Valid numeric latitude and longitude coordinates are required.",
      });
      return;
    }

    const latNum = Number(latitude);
    const lonNum = Number(longitude);
    const accNum = accuracy !== null && !isNaN(Number(accuracy)) ? Number(accuracy) : null;
    const userId = req.user?.id || null;

    if (latNum < -90 || latNum > 90 || lonNum < -180 || lonNum > 180) {
      res.status(400).json({
        success: false,
        message: "Latitude must be between -90 and 90, and longitude between -180 and 180.",
      });
      return;
    }

    // Search nearest hospital & fire service for immediate emergency routing
    const hospitals = await prisma.hospital.findMany({ where: { isActive: true } });
    let nearestHospital = null;
    let minHospitalDist = Infinity;
    for (const h of hospitals) {
      const d = calculateDistanceKm(latNum, lonNum, h.latitude, h.longitude);
      if (d < minHospitalDist) {
        minHospitalDist = d;
        nearestHospital = { ...h, distanceKm: d };
      }
    }

    const fireStations = await prisma.fireService.findMany({ where: { isActive: true } });
    let nearestFireService = null;
    let minFireDist = Infinity;
    for (const f of fireStations) {
      const d = calculateDistanceKm(latNum, lonNum, f.latitude, f.longitude);
      if (d < minFireDist) {
        minFireDist = d;
        nearestFireService = { ...f, distanceKm: d };
      }
    }

    const expiresAt = new Date(Date.now() + 3 * 60 * 60 * 1000);
    const incidentCode = generateIncidentCode();
    const timeStr = formatCurrentTime();

    const initialTimeline: TimelineItem[] = [
      {
        id: `tl-${Date.now()}-sensor`,
        timestamp: timeStr,
        title: "Possible accident detected",
        description: "Severe impact motion vector registered on device sensors",
        type: "REPORT",
        actorBadge: "Sensor Subsystem",
      },
      {
        id: `tl-${Date.now()}-loc`,
        timestamp: timeStr,
        title: "Location received",
        description: `GPS coordinates locked (${latNum.toFixed(4)}, ${lonNum.toFixed(4)})`,
        type: "LOCATION",
        actorBadge: "GPS Subsystem",
      },
    ];

    // Create EmergencyIncident
    const incident = await prisma.emergencyIncident.create({
      data: {
        incidentCode,
        userId,
        reporterUserId: userId,
        type: String(type).toUpperCase(),
        latitude: latNum,
        longitude: lonNum,
        accuracy: accNum,
        description: String(description),
        status: String(status),
        ambulanceNeeded: Boolean(ambulanceNeeded),
        policeNeeded: Boolean(policeNeeded),
        fireServiceNeeded: Boolean(fireServiceNeeded),
        source: String(source),
        confidence: String(confidence),
        severity: "CRITICAL",
        aiClassification: "Possible Road Accident",
        aiConfidenceScore: 86,
        reportCount: 1,
        photoCount: 0,
        timelineEvents: JSON.stringify(initialTimeline),
        isPublicAlert: Boolean(isPublicAlert),
        expiresAt,
        nearestHospitalId: nearestHospital ? nearestHospital.id : null,
        nearestFireServiceId: nearestFireService ? nearestFireService.id : null,
      },
    });

    // Save location history for diagnostics
    await prisma.userLocation.create({
      data: {
        userId,
        latitude: latNum,
        longitude: lonNum,
        accuracy: accNum,
      },
    });

    res.status(201).json({
      success: true,
      message: "Possible accident emergency incident created successfully.",
      data: {
        incident: {
          ...incident,
          nearestHospital,
          nearestFireService,
          timeline: initialTimeline,
          warning: "Possible accident — verification may be required.",
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/incidents/:id/confirm
 */
export async function confirmIncident(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;

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

    let parsedTimeline: TimelineItem[] = [];
    try {
      if (incident.timelineEvents) parsedTimeline = JSON.parse(incident.timelineEvents);
    } catch {}

    parsedTimeline.push({
      id: `tl-${Date.now()}-conf`,
      timestamp: formatCurrentTime(),
      title: "User confirmed help needed",
      description: "User confirmed emergency assistance required via prompt",
      type: "STATUS_CHANGE",
      actorBadge: "User",
    });

    const updated = await prisma.emergencyIncident.update({
      where: { id },
      data: {
        status: "HELP_REQUESTED",
        confidence: "CONFIRMED",
        timelineEvents: JSON.stringify(parsedTimeline),
      },
      include: {
        verifications: true,
        evidence: true,
      },
    });

    res.status(200).json({
      success: true,
      message: "Emergency assistance requested.",
      data: { incident: { ...updated, timeline: parsedTimeline } },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/incidents/:id/cancel
 */
export async function cancelIncident(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;

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

    let parsedTimeline: TimelineItem[] = [];
    try {
      if (incident.timelineEvents) parsedTimeline = JSON.parse(incident.timelineEvents);
    } catch {}

    parsedTimeline.push({
      id: `tl-${Date.now()}-canc`,
      timestamp: formatCurrentTime(),
      title: "Alert cancelled by user",
      description: "User indicated 'I'M OK' on emergency prompt",
      type: "STATUS_CHANGE",
      actorBadge: "User",
    });

    const updated = await prisma.emergencyIncident.update({
      where: { id },
      data: {
        status: "CANCELLED",
        isPublicAlert: false,
        timelineEvents: JSON.stringify(parsedTimeline),
      },
    });

    res.status(200).json({
      success: true,
      message: "Possible accident incident cancelled.",
      data: { incident: { ...updated, timeline: parsedTimeline } },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/incidents/nearby
 */
export async function getNearbyIncidents(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const latStr = req.query.latitude as string | undefined;
    const lonStr = req.query.longitude as string | undefined;
    const radiusKm = req.query.radiusKm ? Math.min(Math.max(Number(req.query.radiusKm), 1), 50) : 5;
    const typeFilter = req.query.type ? String(req.query.type).toUpperCase() : null;
    const statusFilter = req.query.status ? String(req.query.status).toUpperCase() : null;
    const limit = req.query.limit ? Math.min(Math.max(Number(req.query.limit), 1), 50) : 30;

    if (!latStr || !lonStr || isNaN(Number(latStr)) || isNaN(Number(lonStr))) {
      res.status(400).json({
        success: false,
        message: "Valid numeric latitude and longitude parameters are required.",
      });
      return;
    }

    const latitude = Number(latStr);
    const longitude = Number(lonStr);

    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const whereClause: any = {
      createdAt: { gte: cutoff },
      status: { notIn: ["CANCELLED"] },
      isPublicAlert: true,
    };

    if (typeFilter && typeFilter !== "ALL") {
      whereClause.type = typeFilter;
    }

    if (statusFilter && statusFilter !== "ALL") {
      whereClause.status = statusFilter;
    }

    const rawIncidents = await prisma.emergencyIncident.findMany({
      where: whereClause,
      include: {
        verifications: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
        evidence: {
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const sanitizedIncidents = rawIncidents.map((inc) => {
      const distanceKm = calculateDistanceKm(latitude, longitude, inc.latitude, inc.longitude);

      const seeCount = inc.verifications.filter((v) => v.verificationType === "I_CAN_SEE_ACCIDENT").length;
      const cannotConfirmCount = inc.verifications.filter((v) => v.verificationType === "CANNOT_CONFIRM").length;
      const resolvedCount = inc.verifications.filter((v) => v.verificationType === "APPEARS_RESOLVED").length;

      let verificationSummary = "Awaiting community verification";
      if (seeCount > 0) {
        verificationSummary = `${seeCount} nearby user${seeCount > 1 ? "s" : ""} confirmed incident`;
      } else if (resolvedCount > 0) {
        verificationSummary = `Reported resolved by ${resolvedCount} user${resolvedCount > 1 ? "s" : ""}`;
      }

      let parsedTimeline: TimelineItem[] = [];
      try {
        if (inc.timelineEvents) parsedTimeline = JSON.parse(inc.timelineEvents);
      } catch {}

      return {
        id: inc.id,
        incidentCode: inc.incidentCode || `RK-${inc.id.slice(0, 4)}`,
        type: inc.type,
        distanceKm: Math.round(distanceKm * 10) / 10,
        approximateDistanceText: `~${distanceKm.toFixed(1)} km away`,
        latitude: inc.latitude,
        longitude: inc.longitude,
        accuracy: inc.accuracy,
        address: inc.address,
        detectedAt: inc.detectedAt.toISOString(),
        createdAt: inc.createdAt.toISOString(),
        description: inc.description,
        status: inc.status,
        severity: inc.severity || "CRITICAL",
        aiClassification: inc.aiClassification,
        aiConfidenceScore: inc.aiConfidenceScore || 88,
        reportCount: inc.reportCount || 1,
        photoCount: inc.photoCount || (inc.evidence ? inc.evidence.length : 0),
        ambulanceNeeded: inc.ambulanceNeeded,
        policeNeeded: inc.policeNeeded,
        fireServiceNeeded: inc.fireServiceNeeded,
        source: inc.source,
        confidence: inc.confidence,
        warning: "Possible emergency — verification may be required.",
        evidence: inc.evidence.map((ev) => ({
          id: ev.id,
          imageUrl: ev.imageUrl,
          caption: ev.caption,
          isPrivacyBlurred: ev.isPrivacyBlurred,
          aiSuggestedType: ev.aiSuggestedType,
          createdAt: ev.createdAt.toISOString(),
        })),
        timeline: parsedTimeline,
        verificationStats: {
          total: inc.verifications.length,
          seeCount,
          cannotConfirmCount,
          resolvedCount,
          summary: verificationSummary,
          isCommunityReported: inc.verifications.length > 0,
        },
        reporter: {
          isAnonymous: true,
          badge: inc.source === "SENSOR_POSSIBLE_CRASH"
            ? "Device Sensor Detected"
            : inc.source === "DEMO_SIMULATION"
            ? "DEMO / SIMULATION"
            : "User Reported",
        },
      };
    });

    const withinRadius = sanitizedIncidents.filter((inc) => inc.distanceKm <= radiusKm);
    withinRadius.sort((a, b) => a.distanceKm - b.distanceKm);

    res.status(200).json({
      success: true,
      data: {
        incidents: withinRadius.slice(0, limit),
        totalFound: withinRadius.length,
        radiusKm,
        origin: { latitude, longitude },
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/incidents/:id
 */
export async function getEmergencyIncidentDetails(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const latStr = req.query.latitude as string | undefined;
    const lonStr = req.query.longitude as string | undefined;

    const incident = await prisma.emergencyIncident.findUnique({
      where: { id },
      include: {
        verifications: {
          orderBy: { createdAt: "desc" },
        },
        evidence: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!incident) {
      res.status(404).json({
        success: false,
        message: "Incident not found.",
      });
      return;
    }

    let distanceKm: number | null = null;
    if (latStr && lonStr && !isNaN(Number(latStr)) && !isNaN(Number(lonStr))) {
      distanceKm = calculateDistanceKm(
        Number(latStr),
        Number(lonStr),
        incident.latitude,
        incident.longitude
      );
    }

    let nearestHospital = null;
    if (incident.nearestHospitalId) {
      nearestHospital = await prisma.hospital.findUnique({
        where: { id: incident.nearestHospitalId },
      });
    }

    let nearestFireService = null;
    if (incident.nearestFireServiceId) {
      nearestFireService = await prisma.fireService.findUnique({
        where: { id: incident.nearestFireServiceId },
      });
    }

    const seeCount = incident.verifications.filter((v) => v.verificationType === "I_CAN_SEE_ACCIDENT").length;
    const cannotConfirmCount = incident.verifications.filter((v) => v.verificationType === "CANNOT_CONFIRM").length;
    const resolvedCount = incident.verifications.filter((v) => v.verificationType === "APPEARS_RESOLVED").length;

    let parsedTimeline: TimelineItem[] = [];
    try {
      if (incident.timelineEvents) parsedTimeline = JSON.parse(incident.timelineEvents);
    } catch {}

    res.status(200).json({
      success: true,
      data: {
        incident: {
          id: incident.id,
          incidentCode: incident.incidentCode || `RK-${incident.id.slice(0, 4)}`,
          type: incident.type,
          latitude: incident.latitude,
          longitude: incident.longitude,
          accuracy: incident.accuracy,
          address: incident.address,
          distanceKm: distanceKm !== null ? Math.round(distanceKm * 10) / 10 : null,
          detectedAt: incident.detectedAt.toISOString(),
          createdAt: incident.createdAt.toISOString(),
          description: incident.description,
          status: incident.status,
          severity: incident.severity || "CRITICAL",
          aiClassification: incident.aiClassification,
          aiConfidenceScore: incident.aiConfidenceScore || 88,
          reportCount: incident.reportCount || 1,
          photoCount: incident.photoCount || incident.evidence.length,
          ambulanceNeeded: incident.ambulanceNeeded,
          policeNeeded: incident.policeNeeded,
          fireServiceNeeded: incident.fireServiceNeeded,
          source: incident.source,
          confidence: incident.confidence,
          warning: "Possible emergency — verification may be required.",
          nearestHospital,
          nearestFireService,
          timeline: parsedTimeline,
          evidence: incident.evidence.map((ev) => ({
            id: ev.id,
            imageUrl: ev.imageUrl,
            caption: ev.caption,
            isPrivacyBlurred: ev.isPrivacyBlurred,
            aiSuggestedType: ev.aiSuggestedType,
            createdAt: ev.createdAt.toISOString(),
          })),
          verifications: incident.verifications.map((v) => ({
            id: v.id,
            verificationType: v.verificationType,
            notes: v.notes,
            createdAt: v.createdAt.toISOString(),
          })),
          verificationStats: {
            total: incident.verifications.length,
            seeCount,
            cannotConfirmCount,
            resolvedCount,
            summary: seeCount > 0 ? `${seeCount} community users confirmed incident` : "Awaiting community verification",
          },
          reporter: {
            isAnonymous: true,
            badge: incident.source === "SENSOR_POSSIBLE_CRASH"
              ? "Device Sensor Detected"
              : incident.source === "DEMO_SIMULATION"
              ? "DEMO / SIMULATION"
              : "User Reported",
          },
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/incidents/:id/verify
 */
export async function verifyIncident(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const { verificationType, notes = "" } = req.body;

    const validTypes = ["I_CAN_SEE_ACCIDENT", "CANNOT_CONFIRM", "APPEARS_RESOLVED"];
    if (!verificationType || !validTypes.includes(verificationType)) {
      res.status(400).json({
        success: false,
        message: `Invalid verificationType. Must be one of: ${validTypes.join(", ")}`,
      });
      return;
    }

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

    const verification = await prisma.incidentVerification.create({
      data: {
        incidentId: id,
        userId: req.user?.id || null,
        verificationType,
        notes: notes ? String(notes).slice(0, 500) : null,
      },
    });

    let parsedTimeline: TimelineItem[] = [];
    try {
      if (incident.timelineEvents) parsedTimeline = JSON.parse(incident.timelineEvents);
    } catch {}

    const timeStr = formatCurrentTime();
    let newStatus = incident.status;

    if (verificationType === "APPEARS_RESOLVED") {
      const resolvedCount = await prisma.incidentVerification.count({
        where: { incidentId: id, verificationType: "APPEARS_RESOLVED" },
      });
      parsedTimeline.push({
        id: `tl-${Date.now()}-verif`,
        timestamp: timeStr,
        title: "Community reported resolved",
        description: "Responder / witness marked incident as cleared",
        type: "RESOLVED",
        actorBadge: "Community Responder",
      });
      if (resolvedCount >= 2) {
        newStatus = "RESOLVED";
      }
    } else if (verificationType === "I_CAN_SEE_ACCIDENT") {
      parsedTimeline.push({
        id: `tl-${Date.now()}-verif`,
        timestamp: timeStr,
        title: "Visual confirmation added",
        description: "Nearby witness verified active emergency on scene",
        type: "WITNESS",
        actorBadge: "Eye Witness",
      });
    }

    await prisma.emergencyIncident.update({
      where: { id },
      data: {
        status: newStatus,
        confidence: verificationType === "I_CAN_SEE_ACCIDENT" ? "COMMUNITY_VERIFIED" : incident.confidence,
        timelineEvents: JSON.stringify(parsedTimeline),
      },
    });

    const allVerifications = await prisma.incidentVerification.findMany({
      where: { incidentId: id },
    });

    const seeCount = allVerifications.filter((v) => v.verificationType === "I_CAN_SEE_ACCIDENT").length;
    const cannotConfirmCount = allVerifications.filter((v) => v.verificationType === "CANNOT_CONFIRM").length;
    const resolvedCount = allVerifications.filter((v) => v.verificationType === "APPEARS_RESOLVED").length;

    res.status(201).json({
      success: true,
      message: "Community verification recorded. Thank you for assisting the network.",
      data: {
        verification: {
          id: verification.id,
          verificationType: verification.verificationType,
          notes: verification.notes,
          createdAt: verification.createdAt.toISOString(),
        },
        verificationStats: {
          total: allVerifications.length,
          seeCount,
          cannotConfirmCount,
          resolvedCount,
          summary: `${seeCount} confirmed • ${resolvedCount} resolved reports`,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/incidents/:id/status
 */
export async function updateEmergencyIncidentStatus(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = [
      "POSSIBLE",
      "REPORTED",
      "UNDER_REVIEW",
      "HELP_REQUESTED",
      "RESPONSE_INITIATED",
      "RESPONSE_REPORTED",
      "HELP_ARRIVING",
      "RESOLVED",
      "CANCELLED",
    ];

    if (!status || !validStatuses.includes(status)) {
      res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
      });
      return;
    }

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

    let parsedTimeline: TimelineItem[] = [];
    try {
      if (incident.timelineEvents) parsedTimeline = JSON.parse(incident.timelineEvents);
    } catch {}

    const timeStr = formatCurrentTime();
    let statusTitle = `Status updated to ${status}`;
    if (status === "RESPONSE_INITIATED") statusTitle = "Response initiated";
    if (status === "HELP_ARRIVING") statusTitle = "Emergency help en route";
    if (status === "RESOLVED") statusTitle = "Incident marked resolved";
    if (status === "UNDER_REVIEW") statusTitle = "Incident under review by triage";

    parsedTimeline.push({
      id: `tl-${Date.now()}-stat`,
      timestamp: timeStr,
      title: statusTitle,
      description: `Official status transitioned to ${status}`,
      type: "STATUS_CHANGE",
      actorBadge: "Authorized Responder",
    });

    const updated = await prisma.emergencyIncident.update({
      where: { id },
      data: {
        status,
        timelineEvents: JSON.stringify(parsedTimeline),
        ...(status === "CANCELLED" ? { isPublicAlert: false } : {}),
      },
    });

    res.status(200).json({
      success: true,
      message: `Incident status updated to ${status}.`,
      data: { incident: { ...updated, timeline: parsedTimeline } },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/alerts/settings
 */
export async function getAlertSettings(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?.id || null;

    let settings = null;
    if (userId) {
      settings = await prisma.userAlertSetting.findUnique({
        where: { userId },
      });
    }

    if (!settings) {
      settings = {
        id: "default",
        userId,
        accidentDetectionEnabled: true,
        nearbyAlertsEnabled: true,
        alertRadiusKm: 5,
        accidentAlerts: true,
        fireAlerts: true,
        medicalAlerts: true,
        policeAlerts: true,
        pushToken: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }

    res.status(200).json({
      success: true,
      data: { settings },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/alerts/settings
 */
export async function updateAlertSettings(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?.id || null;
    const {
      accidentDetectionEnabled = true,
      nearbyAlertsEnabled = true,
      alertRadiusKm = 5,
      accidentAlerts = true,
      fireAlerts = true,
      medicalAlerts = true,
      policeAlerts = true,
      pushToken = null,
    } = req.body;

    const validatedRadius = Math.min(Math.max(Number(alertRadiusKm) || 5, 1), 50);

    let settings;
    if (userId) {
      settings = await prisma.userAlertSetting.upsert({
        where: { userId },
        create: {
          userId,
          accidentDetectionEnabled: Boolean(accidentDetectionEnabled),
          nearbyAlertsEnabled: Boolean(nearbyAlertsEnabled),
          alertRadiusKm: validatedRadius,
          accidentAlerts: Boolean(accidentAlerts),
          fireAlerts: Boolean(fireAlerts),
          medicalAlerts: Boolean(medicalAlerts),
          policeAlerts: Boolean(policeAlerts),
          pushToken: pushToken ? String(pushToken) : null,
        },
        update: {
          accidentDetectionEnabled: Boolean(accidentDetectionEnabled),
          nearbyAlertsEnabled: Boolean(nearbyAlertsEnabled),
          alertRadiusKm: validatedRadius,
          accidentAlerts: Boolean(accidentAlerts),
          fireAlerts: Boolean(fireAlerts),
          medicalAlerts: Boolean(medicalAlerts),
          policeAlerts: Boolean(policeAlerts),
          ...(pushToken ? { pushToken: String(pushToken) } : {}),
        },
      });
    } else {
      settings = {
        id: "guest-session",
        userId: null,
        accidentDetectionEnabled: Boolean(accidentDetectionEnabled),
        nearbyAlertsEnabled: Boolean(nearbyAlertsEnabled),
        alertRadiusKm: validatedRadius,
        accidentAlerts: Boolean(accidentAlerts),
        fireAlerts: Boolean(fireAlerts),
        medicalAlerts: Boolean(medicalAlerts),
        policeAlerts: Boolean(policeAlerts),
        pushToken: pushToken ? String(pushToken) : null,
        updatedAt: new Date(),
      };
    }

    res.status(200).json({
      success: true,
      message: "Alert settings saved successfully.",
      data: { settings },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/notifications/subscribe
 */
export async function subscribeNotifications(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { pushToken, endpoint, keys } = req.body;
    const userId = req.user?.id || null;

    if (userId && (pushToken || endpoint)) {
      const tokenStr = pushToken || (endpoint ? JSON.stringify({ endpoint, keys }) : null);
      if (tokenStr) {
        await prisma.userAlertSetting.upsert({
          where: { userId },
          create: {
            userId,
            pushToken: tokenStr,
            nearbyAlertsEnabled: true,
          },
          update: {
            pushToken: tokenStr,
            nearbyAlertsEnabled: true,
          },
        });
      }
    }

    res.status(200).json({
      success: true,
      message: "Notification subscription registered successfully.",
      data: {
        subscribed: true,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
}
