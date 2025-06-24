import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, TextInput, Dimensions, Platform, ActivityIndicator } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Polyline, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import Routes from '../components/Routes';

interface Route {
  id: string;
  name: string;
  description: string;
  distance: string;
  duration: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  shape: 'Star' | 'Heart' | 'Circle' | 'Spiral' | 'Diamond';
  stops: {
    id: string;
    name: string;
    coordinate: {
      latitude: number;
      longitude: number;
    };
  }[];
}

interface RouteCoordinate {
  latitude: number;
  longitude: number;
}

export default function MapScreen() {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showRoutes, setShowRoutes] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
  const [routeCoords, setRouteCoords] = useState<RouteCoordinate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permission to access location was denied');
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      setLocation(location);
    })();
  }, []);

  useEffect(() => {
    if (selectedRoute) {
      fetchRouteCoordinates();
    }
  }, [selectedRoute]);

  const fetchRouteCoordinates = async () => {
    if (!selectedRoute) return;

    setIsLoading(true);
    try {
      // Convert stops to OSRM format (longitude,latitude)
      const coordinates = selectedRoute.stops
        .map(stop => `${stop.coordinate.longitude},${stop.coordinate.latitude}`)
        .join(';');

      // Fetch route from OSRM using walking profile
      const response = await fetch(
        `https://router.project-osrm.org/route/v1/foot-walking/${coordinates}?overview=full&geometries=geojson`
      );
      const data = await response.json();

      if (data.routes && data.routes[0]) {
        // Convert GeoJSON coordinates to {latitude, longitude} format
        const routePoints = data.routes[0].geometry.coordinates.map(
          ([lng, lat]: [number, number]) => ({
            latitude: lat,
            longitude: lng,
          })
        );

        setRouteCoords(routePoints);

        // Fit map to route with a small delay
        setTimeout(() => {
          if (mapRef.current && routePoints.length > 0) {
            mapRef.current.fitToCoordinates(routePoints, {
              edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
              animated: true,
            });
          }
        }, 100);
      }
    } catch (error) {
      console.error('Error fetching route:', error);
      setErrorMsg('Failed to fetch route');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRouteSelect = (route: Route) => {
    setSelectedRoute(route);
    setShowRoutes(false);
  };

  const handleCenterOnUser = () => {
    if (location) {
      mapRef.current?.animateToRegion({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    }
  };

  const getRouteColor = (shape: Route['shape']) => {
    switch (shape) {
      case 'Star':
        return '#FFD700'; // Gold
      case 'Heart':
        return '#FF69B4'; // Hot Pink
      case 'Circle':
        return '#00CED1'; // Dark Turquoise
      case 'Spiral':
        return '#9370DB'; // Medium Purple
      case 'Diamond':
        return '#FF4500'; // Orange Red
    }
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        // provider={PROVIDER_GOOGLE}
        showsUserLocation
        showsMyLocationButton={false}
        initialRegion={
          location
            ? {
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }
            : undefined
        }
      >
        {selectedRoute && (
          <>
            {selectedRoute.stops.map((stop, index) => (
              <Marker
                key={stop.id}
                coordinate={stop.coordinate}
                title={stop.name}
                description={`Point ${index + 1} of ${selectedRoute.stops.length}`}
              >
                <View style={styles.markerContainer}>
                  <View style={[styles.marker, { backgroundColor: getRouteColor(selectedRoute.shape) }]}>
                    <Text style={styles.markerText}>{index + 1}</Text>
                  </View>
                </View>
              </Marker>
            ))}
            {routeCoords.length > 0 && (
              <Polyline
                coordinates={routeCoords}
                strokeColor={getRouteColor(selectedRoute.shape)}
                strokeWidth={4}
                lineDashPattern={[1]}
              />
            )}
          </>
        )}
      </MapView>

      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search location..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.routeButton]}
          onPress={() => setShowRoutes(true)}
        >
          <Ionicons name="map" size={24} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.locationButton]}
          onPress={handleCenterOnUser}
        >
          <Ionicons name="locate" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Calculating route...</Text>
        </View>
      )}

      {selectedRoute && (
        <View style={styles.routeInfo}>
          <View style={styles.routeHeader}>
            <View style={styles.routeTitleContainer}>
              <Ionicons name={selectedRoute.shape.toLowerCase() as any} size={24} color={getRouteColor(selectedRoute.shape)} />
              <Text style={styles.routeName}>{selectedRoute.name}</Text>
            </View>
            <TouchableOpacity onPress={() => {
              setSelectedRoute(null);
              setRouteCoords([]);
            }}>
              <Ionicons name="close-circle" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          <Text style={styles.routeDescription}>{selectedRoute.description}</Text>
          <View style={styles.routeDetails}>
            <View style={styles.detailItem}>
              <Ionicons name="walk-outline" size={16} color="#666" />
              <Text style={styles.detailText}>{selectedRoute.distance}</Text>
            </View>
            <View style={styles.detailItem}>
              <Ionicons name="time-outline" size={16} color="#666" />
              <Text style={styles.detailText}>{selectedRoute.duration}</Text>
            </View>
            <View style={styles.detailItem}>
              <Ionicons name="fitness-outline" size={16} color="#666" />
              <Text style={styles.detailText}>{selectedRoute.difficulty}</Text>
            </View>
          </View>
        </View>
      )}

      <Routes
        visible={showRoutes}
        onClose={() => setShowRoutes(false)}
        onSelectRoute={handleRouteSelect}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  },
  searchContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    left: 20,
    right: 20,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  buttonContainer: {
    position: 'absolute',
    right: 20,
    bottom: selectedRoute ? 200 : 20,
  },
  button: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  routeButton: {
    backgroundColor: '#FF9500',
  },
  locationButton: {
    backgroundColor: '#007AFF',
  },
  routeInfo: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  routeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  routeTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  routeName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  routeDescription: {
    color: '#666',
    marginBottom: 12,
  },
  routeDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    marginLeft: 4,
    color: '#666',
  },
  markerContainer: {
    alignItems: 'center',
  },
  marker: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  markerText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#007AFF',
  },
}); 