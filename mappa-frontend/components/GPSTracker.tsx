import React, { useEffect, useState } from 'react';
import * as Location from 'expo-location';
import type { LocationSubscription } from 'expo-location';

export interface LatLng {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp?: number;
  speed?: number;
}

interface GPSTrackerProps {
  onLocationUpdate: (loc: LatLng) => void;
  isRecording: boolean;
}

const GPSTracker: React.FC<GPSTrackerProps> = ({ onLocationUpdate, isRecording }) => {
  const [subscription, setSubscription] = useState<LocationSubscription | null>(null);

  useEffect(() => {
    const start = async () => {
      if (!isRecording) {
        subscription?.remove();
        setSubscription(null);
        return;
      }
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      const sub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          distanceInterval: 2,
          timeInterval: 1000
        },
        (loc) => {
          const { latitude, longitude, accuracy, speed } = loc.coords;
          const timestamp = loc.timestamp;
          onLocationUpdate({ 
            latitude, 
            longitude, 
            accuracy: accuracy ?? undefined, 
            speed: speed ?? undefined, 
            timestamp: timestamp ?? undefined 
          });
        }
      );
      setSubscription(sub);
    };
    start();
    return () => subscription?.remove();
  }, [isRecording]);

  return null;
};

export default GPSTracker;