import React, { useEffect, useState } from 'react';
import MapView, { Polyline, Region } from 'react-native-maps';
import { LatLng } from './GPSTracker';
import { SHAPE_TEMPLATES, scaleShapeToLocation } from '../data/shapeTemplates';

interface DrawingModeProps {
  selectedShape?: keyof typeof SHAPE_TEMPLATES;
  userLocation?: LatLng;
  recordedPath: LatLng[];
}

const DrawingMode: React.FC<DrawingModeProps> = ({ selectedShape, userLocation, recordedPath }) => {
  const [targetShape, setTargetShape] = useState<LatLng[]>([]);

  useEffect(() => {
    if (selectedShape && userLocation) {
      const scaled = scaleShapeToLocation(
        SHAPE_TEMPLATES[selectedShape],
        userLocation,
        500
      );
      setTargetShape(scaled);
    }
  }, [selectedShape, userLocation]);

  const region: Region = userLocation
    ? {
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01
      }
    : { latitude: 0, longitude: 0, latitudeDelta: 1, longitudeDelta: 1 };

  return (
    <MapView style={{ flex: 1 }} region={region} showsUserLocation followsUserLocation>
      {targetShape.length > 0 && (
        <Polyline
          coordinates={targetShape}
          strokeColor="rgba(255,0,0,0.5)"
          strokeWidth={3}
          lineDashPattern={[5,5]}
        />
      )}
      {recordedPath.length > 0 && (
        <Polyline coordinates={recordedPath} strokeColor="#007AFF" strokeWidth={4} />
      )}
    </MapView>
  );
};

export default DrawingMode;