export type LatLng = { latitude: number; longitude: number };

function generateCircle(r: number, pts: number): LatLng[] {
  const points: LatLng[] = [];
  for (let i = 0; i < pts; i++) {
    const angle = (i / pts) * 2 * Math.PI;
    points.push({
      latitude: r * Math.cos(angle),
      longitude: r * Math.sin(angle)
    });
  }
  return points;
}

function generateSpiral(r: number, turns: number, pts: number): LatLng[] {
  const points: LatLng[] = [];
  for (let i = 0; i < pts; i++) {
    const t = (i / pts) * turns * 2 * Math.PI;
    const radius = r * (t / (2 * Math.PI));
    points.push({
      latitude: radius * Math.cos(t),
      longitude: radius * Math.sin(t)
    });
  }
  return points;
}

export const SHAPE_TEMPLATES = { heart: [/* ... */], star: [/* ... */], circle: generateCircle(0.001,20), square: [/* ... */], spiral: generateSpiral(0.001,3,50) };

export function scaleShapeToLocation(shape: LatLng[], center: LatLng, scaleMeters = 500): LatLng[] {
  const scale = scaleMeters / 111111; // rough conversion from meters to degrees
  return shape.map(point => ({
    latitude: center.latitude + point.latitude * scale,
    longitude: center.longitude + point.longitude * scale
  }));
}