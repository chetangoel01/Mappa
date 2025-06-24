import { useState, useCallback } from 'react';
import { GeoPoint, buildOsrmUrl, parseOsrmResponse } from './mapUtils';

interface UseSnapToRoadsResult {
  snappedPoints: GeoPoint[];
  isLoading: boolean;
  error: string | null;
  snapToRoads: (points: GeoPoint[]) => Promise<void>;
}

export const useSnapToRoads = (): UseSnapToRoadsResult => {
  const [snappedPoints, setSnappedPoints] = useState<GeoPoint[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const snapToRoads = useCallback(async (points: GeoPoint[]) => {
    if (points.length < 2) {
      setSnappedPoints(points);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const url = buildOsrmUrl(points);
      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to snap to roads');
      }

      const snapped = parseOsrmResponse(data);
      setSnappedPoints(snapped);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setSnappedPoints(points); // Fallback to original points
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    snappedPoints,
    isLoading,
    error,
    snapToRoads,
  };
}; 