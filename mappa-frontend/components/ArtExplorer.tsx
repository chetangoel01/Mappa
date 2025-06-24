import React, { useRef } from 'react';
import { View, Dimensions } from 'react-native';
import MapView, { Polyline, Region } from 'react-native-maps';
import { captureRef } from 'react-native-view-shot';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { LatLng } from './GPSTracker';
import { calculateSimilarity } from '../utils/similarityScorer';

interface ArtExporterProps {
  recordedPath: LatLng[];
  targetShape: LatLng[];
  userLocation?: LatLng;
  onExport?: (data: any) => void;
}

const ArtExporter: React.FC<ArtExporterProps> = ({ recordedPath, targetShape, userLocation, onExport }) => {
  const mapRef = useRef<MapView>(null);
  const { width, height } = Dimensions.get('window');

  const calculateRegion = (): Region => {
    if (!recordedPath.length || !userLocation) return { latitude: 0, longitude: 0, latitudeDelta: 1, longitudeDelta: 1 };
    const lats = recordedPath.map(p => p.latitude);
    const lns = recordedPath.map(p => p.longitude);
    const minLat = Math.min(...lats), maxLat = Math.max(...lats);
    const minLn = Math.min(...lns), maxLn = Math.max(...lns);
    const pad = 0.005;
    return { latitude: (minLat+maxLat)/2, longitude: (minLn+maxLn)/2, latitudeDelta: (maxLat-minLat)+pad, longitudeDelta: (maxLn-minLn)+pad };
  };

  const exportArt = async () => {
    if (!mapRef.current) return;
    const uri = await captureRef(mapRef, { format: 'png', quality: 0.8, width, height });
    const filename = `mapsketcher_${Date.now()}.png`;
    const local = `${FileSystem.documentDirectory}${filename}`;
    await FileSystem.copyAsync({ from: uri, to: local });
    await Sharing.shareAsync(local);
    onExport && onExport({ image: local, similarity: calculateSimilarity(recordedPath, targetShape) });
  };

  return (
    <View style={{ flex: 1 }}>
      <MapView ref={mapRef} style={{ flex: 1 }} region={calculateRegion()}>
        {targetShape.length > 0 && <Polyline coordinates={targetShape} strokeColor="rgba(200,200,200,0.5)" strokeWidth={2} lineDashPattern={[3,3]} />}
        {recordedPath.length > 0 && <Polyline coordinates={recordedPath} strokeColor="#FF6B6B" strokeWidth={4} />}
      </MapView>
      {/* Trigger exportArt() via a button in UI */}
    </View>
  );
};

export default ArtExporter;