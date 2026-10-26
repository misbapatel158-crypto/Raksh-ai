export type ResourceType = "AMBULANCE" | "HOSPITAL" | "POLICE" | "FIRE_SERVICE";

export type IncidentPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type IncidentStatus =
  | "REPORT_CREATED"
  | "HELP_IDENTIFIED"
  | "ACTION_TAKEN"
  | "RESOLVED";

export interface User {
  id: string;
  name: string;
  email: string;
  phoneNumber?: string | null;
  countryCode?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EmergencyContact {
  id: string;
  userId: string;
  name: string;
  relationship: string;
  phone: string;
  isPrimary: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EmergencyResource {
  id: string;
  name: string;
  type: ResourceType;
  phone: string;
  latitude: number;
  longitude: number;
  address: string;
  availability: "AVAILABLE" | "BUSY" | "ON_CALL";
  isDemo: boolean;
  distanceKm?: number;
  isRecommended?: boolean;
}

export interface Incident {
  id: string;
  userId: string;
  incidentType: string;
  description: string;
  peopleAffected: number;
  vehiclesInvolved: number;
  anyoneTrapped: boolean;
  smokeOrFire: boolean;
  latitude: number;
  longitude: number;
  locationAccuracy?: number | null;
  aiSummary?: string | null;
  aiPriority: IncidentPriority;
  recommendedResources: ResourceType[];
  status: IncidentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface EmergencyAnalysis {
  incidentType: string;
  summary: string;
  suggestedPriority: IncidentPriority;
  possibleHazards: string[];
  recommendedResources: ResourceType[];
  missingInformation: string[];
  disclaimer: string;
}

export interface Hospital {
  id: string;
  name: string;
  category: "GOVERNMENT" | "PRIVATE";
  address: string;
  latitude: number;
  longitude: number;
  phone: string | null;
  ambulancePhone: string | null;
  emergencyDepartment?: string | null;
  source: string;
  lastVerified: string;
  distanceKm: number;
  isNearest?: boolean;
}

export interface FireService {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  phone: string | null;
  emergencyContact: string | null;
  source: string;
  lastVerified: string;
  distanceKm: number;
  isNearest?: boolean;
}

export interface NearbyHospitalsResponse {
  origin: { latitude: number; longitude: number };
  filter: string;
  radiusKm?: number;
  count: number;
  totalFound: number;
  nearestHospital: Hospital | null;
  nearestAvailableDistanceKm?: number | null;
  hospitals: Hospital[];
}

export interface NearbyFireServicesResponse {
  origin: { latitude: number; longitude: number };
  radiusKm?: number;
  count: number;
  totalFound: number;
  nearestFireService: FireService | null;
  nearestAvailableDistanceKm?: number | null;
  fireServices: FireService[];
}

export interface SavedEmergencyIncident {
  incidentId: string;
  type: string;
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  timestamp: string;
  notes?: string;
  address?: string;
  actionPlan?: string[];
  isOfflineSaved?: boolean;
  isUnconfirmedCrash?: boolean;
  nearestHospitalId?: string | null;
  nearestFireServiceId?: string | null;
}


export interface IncidentVerification {
  id: string;
  incidentId: string;
  userId?: string | null;
  verificationType: "I_CAN_SEE_ACCIDENT" | "CANNOT_CONFIRM" | "APPEARS_RESOLVED";
  notes?: string | null;
  createdAt: string;
}

export type EmergencyIncidentStatus =
  | "POSSIBLE"
  | "REPORTED"
  | "UNDER_REVIEW"
  | "HELP_REQUESTED"
  | "RESPONSE_INITIATED"
  | "RESPONSE_REPORTED"
  | "HELP_ARRIVING"
  | "RESOLVED"
  | "CANCELLED";

export interface IncidentEvidenceItem {
  id: string;
  incidentId: string;
  imageUrl: string;
  caption?: string | null;
  uploaderId?: string | null;
  approxLatitude?: number | null;
  approxLongitude?: number | null;
  aiSuggestedType?: string | null;
  aiConfidence?: number | null;
  isPrivacyBlurred: boolean;
  createdAt: string;
}

export interface IncidentTimelineEvent {
  id?: string;
  timestamp: string;
  title: string;
  description: string;
  actor?: string;
  type?: "REPORT" | "LOCATION" | "PHOTO" | "WITNESS" | "ALERT" | "RESPONSE" | "STATUS_CHANGE" | "RESOLVED";
  actorBadge?: string;
}

export interface AIClassificationResult {
  suggestedType: "ROAD_ACCIDENT" | "FIRE" | "MEDICAL" | "ROAD_BLOCK" | "OTHER";
  suggestedTypeLabel: string;
  confidence: number; // 0 to 100
  severity: "LOW" | "HIGH" | "CRITICAL";
  recommendedServices: Array<"AMBULANCE" | "POLICE" | "FIRE_BRIGADE">;
  reasoning: string;
  triageSummary: string;
  suggestedActionPlan: string[];
}

export interface NearbyIncident {
  id: string;
  incidentCode?: string; // e.g. RK-1024
  type: string;
  distanceKm: number;
  approximateDistanceText: string;
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  address?: string;
  detectedAt: string;
  createdAt: string;
  description?: string | null;
  status: EmergencyIncidentStatus;
  severity?: "LOW" | "HIGH" | "CRITICAL";
  aiClassification?: string | null;
  aiConfidenceScore?: number | null;
  reportCount?: number;
  photoCount?: number;
  ambulanceNeeded: boolean;
  policeNeeded: boolean;
  fireServiceNeeded: boolean;
  source: string;
  confidence: string;
  warning: string;
  nearestHospital?: Hospital | null;
  nearestFireService?: FireService | null;
  verifications?: IncidentVerification[];
  evidence?: IncidentEvidenceItem[];
  evidenceList?: IncidentEvidenceItem[];
  timeline?: IncidentTimelineEvent[];
  isDemoIncident?: boolean;
  aiSummary?: string;
  verificationStats?: {
    total: number;
    seeCount: number;
    cannotConfirmCount: number;
    resolvedCount: number;
    summary: string;
    isCommunityReported: boolean;
  };
  reporter?: {
    isAnonymous: boolean;
    badge: string;
  };
}

export interface ReportAccidentPayload {
  incidentCode?: string;
  type: "ROAD_ACCIDENT" | "FIRE" | "MEDICAL" | "ROAD_BLOCK" | "OTHER";
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  description?: string;
  helpRequired: {
    ambulance: boolean;
    police: boolean;
    fireBrigade: boolean;
  };
  evidencePhotoBase64?: string | null;
  evidenceCaption?: string;
  isPrivacyBlurred?: boolean;
  source?: string;
  severity?: "LOW" | "HIGH" | "CRITICAL";
}

export interface AlertSettings {
  id?: string;
  userId?: string | null;
  accidentDetectionEnabled: boolean;
  nearbyAlertsEnabled: boolean;
  alertRadiusKm: number;
  accidentAlerts: boolean;
  fireAlerts: boolean;
  medicalAlerts: boolean;
  policeAlerts: boolean;
  pushToken?: string | null;
  notificationPermission?: NotificationPermission | "unsupported";
}

export interface SensorSupportStatus {
  supported: boolean;
  active: boolean;
  permission: "granted" | "denied" | "prompt" | "unsupported";
  lastMagnitude?: number;
  debugMessage?: string;
}

export interface PossibleAccidentPayload {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  description?: string;
  source?: string;
  confidence?: string;
  status?: EmergencyIncidentStatus;
  ambulanceNeeded?: boolean;
  policeNeeded?: boolean;
  fireServiceNeeded?: boolean;
  type?: string;
}

export interface ShareData {
  incidentId: string;
  incidentType: string;
  summary: string;
  priority: IncidentPriority;
  status: IncidentStatus;
  location: {
    latitude: number;
    longitude: number;
    accuracyMeters?: number | null;
    mapUrl: string;
  };
  peopleAffected: number;
  smokeOrFire: boolean;
  anyoneTrapped: boolean;
  reportedBy: string;
  timestamp: string;
  formattedShareText: string;
}

// ==========================================
// 🚨 RAKSH AI — EMERGENCY CORRIDOR & VEHICLES
// ==========================================

export type EmergencyVehicleType = "AMBULANCE" | "FIRE_BRIGADE" | "POLICE";

export type EmergencyVehicleStatus =
  | "AVAILABLE"
  | "DISPATCHED"
  | "EN_ROUTE"
  | "ARRIVED"
  | "COMPLETED"
  | "ON_BREAK";

export interface EmergencyVehicle {
  id: string;
  vehicleType: EmergencyVehicleType;
  unitCode: string; // e.g. A-102, F-21, P-17
  status: EmergencyVehicleStatus;
  latitude: number;
  longitude: number;
  speed: number; // km/h
  heading: number; // degrees
  destinationLatitude?: number | null;
  destinationLongitude?: number | null;
  destinationName?: string | null;
  etaSeconds?: number | null;
  etaMinutes?: number | null;
  distanceRemaining?: number | null; // in km
  distanceTravelled?: number | null; // in km
  currentLocationName?: string;
  startLocationName?: string;
  expectedArrivalClockText?: string;
  actualArrivalClockText?: string;
  assignedIncidentId?: string | null;
  routeId?: string | null;
  lastUpdated: string;
  isStale?: boolean;
  dataFreshnessText?: string;
  isDemo: boolean;
  locationHistories?: Array<{
    id: string;
    latitude: number;
    longitude: number;
    speed?: number | null;
    heading?: number | null;
    timestamp: string;
  }>;
  dispatchEvents?: DispatchEvent[];
}

export type JunctionTrafficStatus = "CLEAR" | "MODERATE" | "HEAVY" | "SEVERE";
export type CorridorJunctionStatus = "ACTIVE" | "REDIRECTED" | "STANDBY" | "CLOSED";

export interface CorridorJunction {
  id: string;
  corridorId?: string | null;
  name: string; // e.g. "Junction 1 - Shimla Office Chowk"
  sequence: number;
  latitude: number;
  longitude: number;
  trafficStatus: JunctionTrafficStatus;
  corridorStatus: CorridorJunctionStatus;
  greenWaveActive: boolean;
  clearanceDistanceMeters: number;
  isDemo: boolean;
  lastUpdated: string;
}

export interface DispatchEvent {
  id: string;
  incidentId?: string | null;
  vehicleId?: string | null;
  eventType: string; // INCIDENT_REPORTED, DISPATCHED, EN_ROUTE, DISTANCE_UPDATE, ARRIVED, COMPLETED, CANCELLED
  timestamp: string;
  latitude?: number | null;
  longitude?: number | null;
  description: string;
}

export interface RouteRecommendation {
  id: string;
  corridorId?: string | null;
  vehicleId?: string | null;
  incidentId?: string | null;
  recommendedRouteName: string; // "Route A - Smart Corridor"
  recommendedEtaMinutes: number;
  recommendedDistanceKm: number;
  alternativeRouteName: string; // "Route B - Arterial Bypass"
  alternativeEtaMinutes: number;
  alternativeDistanceKm: number;
  reason: string;
  aiPriority: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  confidence: number;
  createdAt: string;
}

export interface EmergencyCorridor {
  id: string;
  corridorCode?: string | null;
  name: string;
  incidentId?: string | null;
  vehicleId?: string | null;
  status: "ACTIVE" | "PENDING" | "COMPLETED" | "CANCELLED";
  priority: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  originName?: string | null;
  originLat?: number | null;
  originLng?: number | null;
  destinationName?: string | null;
  destinationLat?: number | null;
  destinationLng?: number | null;
  totalDistanceKm?: number | null;
  estimatedEtaMinutes?: number | null;
  activeJunctionCount: number;
  trafficCondition: "CLEAR" | "MODERATE" | "HEAVY" | "SEVERE";
  waypointsJson?: string | null;
  waypoints?: [number, number][];
  isDemo: boolean;
  junctions?: CorridorJunction[];
  vehicle?: EmergencyVehicle | null;
  routeRecommendation?: RouteRecommendation | null;
  dispatchEvents?: DispatchEvent[];
  createdAt: string;
  updatedAt: string;
}

export interface SimulationStepResponse {
  currentStage: number;
  stageDetails?: {
    stage: number;
    status: EmergencyVehicleStatus;
    lat: number;
    lng: number;
    speed: number;
    distance: number;
    etaSeconds: number;
    desc: string;
  };
  vehicle: EmergencyVehicle;
  nextStage?: number | null;
  isCompleted: boolean;
}


