import { getRecommendedResourceTypes, ResourceType } from "./resourceService";

export interface EmergencyAnalysisInput {
  incidentType: string;
  description: string;
  peopleAffected?: number;
  vehiclesInvolved?: number;
  anyoneTrapped?: boolean;
  smokeOrFire?: boolean;
}

export type PriorityLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface EmergencyAnalysisResult {
  incidentType: string;
  summary: string;
  suggestedPriority: PriorityLevel;
  possibleHazards: string[];
  recommendedResources: ResourceType[];
  missingInformation: string[];
  disclaimer: string;
}

/**
 * Local rule-based safety triage & emergency analysis service
 * Provides deterministic, reliable hazard assessment without speculative medical claims
 */
export function analyzeEmergencyIncident(
  input: EmergencyAnalysisInput
): EmergencyAnalysisResult {
  const {
    incidentType = "OTHER",
    description = "",
    peopleAffected = 1,
    vehiclesInvolved = 0,
    anyoneTrapped = false,
    smokeOrFire = false,
  } = input;

  const descLower = description.toLowerCase();
  const possibleHazards: string[] = [];
  const missingInformation: string[] = [];

  // Hazard detection rules
  if (smokeOrFire || descLower.includes("fire") || descLower.includes("smoke") || descLower.includes("flame")) {
    possibleHazards.push("Active fire, intense thermal radiation, or toxic smoke inhalation");
  }

  if (anyoneTrapped || descLower.includes("trapped") || descLower.includes("stuck") || descLower.includes("pinned")) {
    possibleHazards.push("Physical entrapment requiring specialized extraction tools");
  }

  if (vehiclesInvolved > 0 || descLower.includes("car") || descLower.includes("truck") || descLower.includes("crash") || descLower.includes("highway")) {
    possibleHazards.push("Active roadway traffic, debris, and possible fuel leakage");
  }

  if (descLower.includes("blood") || descLower.includes("unconscious") || descLower.includes("breathing") || descLower.includes("wound")) {
    possibleHazards.push("Severe trauma or compromised airway risk");
  }

  if (descLower.includes("water") || descLower.includes("flood") || descLower.includes("electric") || descLower.includes("wire")) {
    possibleHazards.push("Secondary environmental hazards (electrocution / water current)");
  }

  if (possibleHazards.length === 0) {
    possibleHazards.push("Unknown situational hazards - maintain safe perimeter distance");
  }

  // Missing critical information check
  if (!descLower.includes("street") && !descLower.includes("road") && !descLower.includes("near") && !descLower.includes("avenue")) {
    missingInformation.push("Nearest cross-street or physical landmark for emergency responders");
  }

  if (peopleAffected > 1 && !descLower.includes("conscious") && !descLower.includes("awake")) {
    missingInformation.push("Consciousness and breathing status of affected individuals");
  }

  if (smokeOrFire && !descLower.includes("building") && !descLower.includes("vehicle") && !descLower.includes("bush")) {
    missingInformation.push("Structure type or source of fire/smoke");
  }

  if (missingInformation.length === 0) {
    missingInformation.push("Ongoing updates regarding changes in victim condition or environmental safety");
  }

  // Priority determination logic
  let suggestedPriority: PriorityLevel = "MEDIUM";

  if (
    (anyoneTrapped && (smokeOrFire || peopleAffected > 2)) ||
    (smokeOrFire && peopleAffected > 3) ||
    descLower.includes("not breathing") ||
    descLower.includes("unconscious") ||
    descLower.includes("severe bleeding")
  ) {
    suggestedPriority = "CRITICAL";
  } else if (
    anyoneTrapped ||
    smokeOrFire ||
    peopleAffected >= 2 ||
    vehiclesInvolved >= 2 ||
    incidentType.toUpperCase() === "FIRE"
  ) {
    suggestedPriority = "HIGH";
  } else if (
    incidentType.toUpperCase() === "MEDICAL" ||
    incidentType.toUpperCase() === "ROAD_ACCIDENT" ||
    incidentType.toUpperCase() === "POLICE"
  ) {
    suggestedPriority = "MEDIUM";
  } else {
    suggestedPriority = "LOW";
  }

  // Generate structured summary
  const resourceList = getRecommendedResourceTypes(incidentType, smokeOrFire);
  
  const typeReadable = incidentType.replace(/_/g, " ").toLowerCase();
  let summary = `Reported ${typeReadable} involving approx. ${peopleAffected} person(s).`;
  if (vehiclesInvolved > 0) {
    summary += ` Estimated ${vehiclesInvolved} vehicle(s) involved.`;
  }
  if (anyoneTrapped) {
    summary += ` Entrapment reported on scene.`;
  }
  if (smokeOrFire) {
    summary += ` Smoke or active fire present.`;
  }
  if (description) {
    summary += ` Caller noted: "${description.length > 90 ? description.slice(0, 90) + '...' : description}"`;
  }

  return {
    incidentType,
    summary,
    suggestedPriority,
    possibleHazards,
    recommendedResources: resourceList,
    missingInformation,
    disclaimer: "AI-assisted suggestion for prioritization and resource routing only. Not a substitute for official dispatch triage.",
  };
}
