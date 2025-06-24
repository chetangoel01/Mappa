import { Point } from 'react-native-maps';

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export interface ScreenPoint {
  x: number;
  y: number;
}

// Calculate distance between two points using Haversine formula
export const calculateDistance = (point1: GeoPoint, point2: GeoPoint): number => {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (point1.latitude * Math.PI) / 180;
  const φ2 = (point2.latitude * Math.PI) / 180;
  const Δφ = ((point2.latitude - point1.latitude) * Math.PI) / 180;
  const Δλ = ((point2.longitude - point1.longitude) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
};

// Resample points to be approximately d meters apart
export const resamplePoints = (points: GeoPoint[], d: number): GeoPoint[] => {
  if (points.length < 2) return points;

  const result: GeoPoint[] = [points[0]];
  let distance = 0;

  for (let i = 1; i < points.length; i++) {
    const segmentDistance = calculateDistance(points[i - 1], points[i]);
    distance += segmentDistance;

    if (distance >= d) {
      // Interpolate a new point
      const ratio = (d - (distance - segmentDistance)) / segmentDistance;
      const newPoint: GeoPoint = {
        latitude: points[i - 1].latitude + (points[i].latitude - points[i - 1].latitude) * ratio,
        longitude: points[i - 1].longitude + (points[i].longitude - points[i - 1].longitude) * ratio,
      };
      result.push(newPoint);
      distance = 0;
    }
  }

  // Always include the last point
  if (result[result.length - 1] !== points[points.length - 1]) {
    result.push(points[points.length - 1]);
  }

  return result;
};

// Build OSRM URL for road snapping
export const buildOsrmUrl = (points: GeoPoint[]): string => {
  const coordinates = points
    .map(point => `${point.longitude},${point.latitude}`)
    .join(';');
  return `https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=full&geometries=geojson`;
};

// Convert OSRM response to GeoPoints
export const parseOsrmResponse = (response: any): GeoPoint[] => {
  if (!response?.routes?.[0]?.geometry?.coordinates) {
    return [];
  }

  return response.routes[0].geometry.coordinates.map(([lng, lat]: [number, number]) => ({
    latitude: lat,
    longitude: lng,
  }));
}; 