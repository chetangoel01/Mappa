import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  PanResponder,
  ActivityIndicator,
  Text,
} from 'react-native';
import MapView, { Polyline, Marker, LatLng } from 'react-native-maps';
import Slider from '@react-native-community/slider';
import { useSnapToRoads } from '../utils/useSnapToRoads';
import { GeoPoint, ScreenPoint, resamplePoints } from '../utils/mapUtils';

const INITIAL_REGION = {
  latitude: 37.78825,
  longitude: -122.4324,
  latitudeDelta: 0.0922,
  longitudeDelta: 0.0421,
};

const MapDrawingScreen: React.FC = () => {
  const mapRef = useRef<MapView>(null);
  const [rawPoints, setRawPoints] = useState<GeoPoint[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [samplingDistance, setSamplingDistance] = useState(50); // meters
  const { snappedPoints, isLoading, error, snapToRoads } = useSnapToRoads();

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: async (event) => {
        setIsDrawing(true);
        const { locationX, locationY } = event.nativeEvent;
        const coordinate = await mapRef.current?.coordinateForPoint({
          x: locationX,
          y: locationY,
        });
        if (coordinate) {
          setRawPoints([{
            latitude: coordinate.latitude,
            longitude: coordinate.longitude,
          }]);
        }
      },
      onPanResponderMove: async (event) => {
        if (!isDrawing) return;
        const { locationX, locationY } = event.nativeEvent;
        const coordinate = await mapRef.current?.coordinateForPoint({
          x: locationX,
          y: locationY,
        });
        if (coordinate) {
          setRawPoints((prev) => [...prev, {
            latitude: coordinate.latitude,
            longitude: coordinate.longitude,
          }]);
        }
      },
      onPanResponderRelease: async () => {
        setIsDrawing(false);
        if (rawPoints.length > 1) {
          const sampledPoints = resamplePoints(rawPoints, samplingDistance);
          await snapToRoads(sampledPoints);
        }
      },
    })
  ).current;

  const handleSamplingDistanceChange = useCallback(async (value: number) => {
    setSamplingDistance(value);
    if (rawPoints.length > 1) {
      const sampledPoints = resamplePoints(rawPoints, value);
      await snapToRoads(sampledPoints);
    }
  }, [rawPoints, snapToRoads]);

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={INITIAL_REGION}
      >
        {rawPoints.length > 1 && (
          <Polyline
            coordinates={rawPoints}
            strokeColor="#FF0000"
            strokeWidth={3}
          />
        )}
        {snappedPoints.length > 1 && (
          <Polyline
            coordinates={snappedPoints}
            strokeColor="#0000FF"
            strokeWidth={3}
          />
        )}
      </MapView>

      <View
        style={styles.overlay}
        {...panResponder.panHandlers}
      />

      <View style={styles.controls}>
        <Text style={styles.label}>
          Sampling Distance: {Math.round(samplingDistance)}m
        </Text>
        <Slider
          style={styles.slider}
          minimumValue={10}
          maximumValue={200}
          step={5}
          value={samplingDistance}
          onValueChange={handleSamplingDistanceChange}
          minimumTrackTintColor="#0000FF"
          maximumTrackTintColor="#000000"
        />
        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0000FF" />
          </View>
        )}
        {error && (
          <Text style={styles.error}>{error}</Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  controls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 16,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
  },
  error: {
    color: 'red',
    textAlign: 'center',
    marginTop: 8,
  },
});

export default MapDrawingScreen; 