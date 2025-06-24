import { LatLng } from '../components/GPSTracker';

/**
 * Calculate the distance between two lat/lng points using the Haversine formula.
 */
export function calculateDistance(a: LatLng, b: LatLng): number {
  const R = 6371e3; // Earth radius in meters
  const φ1 = a.latitude * Math.PI / 180;
  const φ2 = b.latitude * Math.PI / 180;
  const Δφ = (b.latitude - a.latitude) * Math.PI / 180;
  const Δλ = (b.longitude - a.longitude) * Math.PI / 180;

  const sinΔφ = Math.sin(Δφ / 2);
  const sinΔλ = Math.sin(Δλ / 2);
  const h = sinΔφ * sinΔφ + Math.cos(φ1) * Math.cos(φ2) * sinΔλ * sinΔλ;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));

  return R * c;
}

/**
 * Basic filters for GPS noise:
 * - Accuracy threshold (>20m)
 * - Unrealistic speed (>50 km/h)
 * - Stationary noise (<1m movement)
 */
export function isValidLocation(newLoc: LatLng, prev: LatLng[] = []): boolean {
  // Accuracy check
  if (newLoc.accuracy !== undefined && newLoc.accuracy > 20) return false;
  // Speed check (>13.89 m/s ~= 50 km/h)
  if (newLoc.speed !== undefined && newLoc.speed > 13.89) return false;
  // Movement check (<1m)
  if (prev.length > 0) {
    const last = prev[prev.length - 1];
    const distance = calculateDistance(last, newLoc);
    if (distance < 1) return false;
  }
  return true;
}