import { LatLng } from '../components/GPSTracker';

// Normalize a path to a fixed number of points
function normalizePath(path: LatLng[], targetPoints: number): LatLng[] {
  if (path.length <= targetPoints) return path;
  const normalized: LatLng[] = [];
  const step = (path.length - 1) / (targetPoints - 1);
  for (let i = 0; i < targetPoints; i++) {
    const idx = Math.round(i * step);
    normalized.push(path[idx]);
  }
  return normalized;
}

// Compute Euclidean distance between two lat/lng points
function pointDistance(a: LatLng, b: LatLng): number {
  const latDiff = a.latitude - b.latitude;
  const lngDiff = a.longitude - b.longitude;
  return Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);
}

// Dynamic Time Warping distance
function calculateDTW(path1: LatLng[], path2: LatLng[]): number {
  const m = path1.length;
  const n = path2.length;
  const dtw: number[][] = Array(m + 1)
    .fill(0)
    .map(() => Array(n + 1).fill(Infinity));
  dtw[0][0] = 0;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = pointDistance(path1[i - 1], path2[j - 1]);
      dtw[i][j] = cost + Math.min(dtw[i - 1][j], dtw[i][j - 1], dtw[i - 1][j - 1]);
    }
  }
  return dtw[m][n];
}

/**
 * Calculate a similarity score between two paths (0-100)
 * based on normalized DTW distance.
 */
export function calculateSimilarity(rec: LatLng[], tgt: LatLng[]): number {
  if (!rec.length || !tgt.length) return 0;
  const points = 50;
  const normRec = normalizePath(rec, points);
  const normTgt = normalizePath(tgt, points);
  const dtwDist = calculateDTW(normRec, normTgt);
  // Define maxDistance empirically; here ~0.01 in lat/lng space
  const maxDistance = 0.01;
  const rawScore = 1 - Math.min(dtwDist / maxDistance, 1);
  return Math.round(rawScore * 100);
}

/**
 * Completion score with weights: coverage, smoothness, and accuracy
 */
export function calculateCompletionScore(rec: LatLng[], tgt: LatLng[]): number {
  if (!rec.length || !tgt.length) return 0;
  // Coverage: fraction of points
  const coverage = Math.min(rec.length / tgt.length, 1);
  // Smoothness: 1 - (total angular deviation / max possible)
  let totalDev = 0;
  for (let i = 1; i < rec.length - 1; i++) {
    const p0 = rec[i - 1];
    const p1 = rec[i];
    const p2 = rec[i + 1];
    const angle1 = Math.atan2(p1.latitude - p0.latitude, p1.longitude - p0.longitude);
    const angle2 = Math.atan2(p2.latitude - p1.latitude, p2.longitude - p1.longitude);
    let dev = Math.abs(angle2 - angle1);
    if (dev > Math.PI) dev = 2 * Math.PI - dev;
    totalDev += dev;
  }
  const smoothness = Math.max(0, 1 - totalDev / ((rec.length - 2) * Math.PI));
  const accuracy = calculateSimilarity(rec, tgt) / 100;
  const combined = coverage * 0.3 + smoothness * 0.2 + accuracy * 0.5;
  return Math.round(combined * 100);
}