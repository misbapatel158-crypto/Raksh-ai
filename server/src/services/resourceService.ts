export type ResourceType = "AMBULANCE" | "HOSPITAL" | "POLICE" | "FIRE_SERVICE";

/**
 * Recommends relevant emergency resource types based on incident type and hazards
 */
export function getRecommendedResourceTypes(
  incidentType: string,
  smokeOrFire: boolean
): ResourceType[] {
  const normalizedType = (incidentType || "").trim().toUpperCase();

  switch (normalizedType) {
    case "ROAD_ACCIDENT":
    case "ACCIDENT":
    case "TRAFFIC_ACCIDENT": {
      const resources: ResourceType[] = ["AMBULANCE", "POLICE", "HOSPITAL"];
      if (smokeOrFire) {
        resources.push("FIRE_SERVICE");
      }
      return resources;
    }

    case "FIRE":
    case "EXPLOSION":
    case "WILDFIRE":
    case "STRUCTURE_FIRE":
      return ["FIRE_SERVICE", "AMBULANCE", "POLICE"];

    case "MEDICAL":
    case "HEALTH_EMERGENCY":
    case "CARDIAC_ARREST":
    case "OVERDOSE":
      return ["AMBULANCE", "HOSPITAL"];

    case "POLICE":
    case "CRIME":
    case "ASSAULT":
    case "ROBBERY":
    case "DOMESTIC":
      return ["POLICE", "AMBULANCE"];

    case "NATURAL_DISASTER":
    case "FLOOD":
    case "EARTHQUAKE":
      return ["FIRE_SERVICE", "AMBULANCE", "POLICE", "HOSPITAL"];

    default: {
      const defaultResources: ResourceType[] = ["AMBULANCE", "POLICE"];
      if (smokeOrFire) {
        defaultResources.unshift("FIRE_SERVICE");
      }
      return defaultResources;
    }
  }
}
