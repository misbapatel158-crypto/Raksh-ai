import { calculateDistance } from "../utils/haversine";

export interface GeoLocation {
  latitude: number;
  longitude: number;
}

export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  return calculateDistance(lat1, lon1, lat2, lon2);
}
