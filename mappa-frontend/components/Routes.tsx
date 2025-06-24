import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

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

const DEMO_ROUTES: Route[] = [
  {
    id: '1',
    name: 'Golden Gate Star',
    description: 'Create a perfect star shape around Golden Gate Park. Great for Strava art!',
    distance: '5.2 miles',
    duration: '1.5 hours',
    difficulty: 'Medium',
    shape: 'Star',
    stops: [
      // Star points
      { id: '1', name: 'Start/End', coordinate: { latitude: 37.7702, longitude: -122.4612 } },
      { id: '2', name: 'Point 1', coordinate: { latitude: 37.7802, longitude: -122.4612 } },
      { id: '3', name: 'Point 2', coordinate: { latitude: 37.7752, longitude: -122.4712 } },
      { id: '4', name: 'Point 3', coordinate: { latitude: 37.7652, longitude: -122.4712 } },
      { id: '5', name: 'Point 4', coordinate: { latitude: 37.7602, longitude: -122.4612 } },
      { id: '6', name: 'Point 5', coordinate: { latitude: 37.7702, longitude: -122.4512 } },
    ],
  },
  {
    id: '2',
    name: 'Heart of the City',
    description: 'Draw a heart shape through downtown. Perfect for Valentine\'s Day!',
    distance: '3.8 miles',
    duration: '1.2 hours',
    difficulty: 'Easy',
    shape: 'Heart',
    stops: [
      // Heart shape points
      { id: '1', name: 'Start/End', coordinate: { latitude: 37.7879, longitude: -122.4075 } },
      { id: '2', name: 'Top Left', coordinate: { latitude: 37.7929, longitude: -122.4125 } },
      { id: '3', name: 'Top Right', coordinate: { latitude: 37.7929, longitude: -122.4025 } },
      { id: '4', name: 'Bottom Left', coordinate: { latitude: 37.7829, longitude: -122.4075 } },
      { id: '5', name: 'Bottom Right', coordinate: { latitude: 37.7829, longitude: -122.4075 } },
    ],
  },
  {
    id: '3',
    name: 'Circle of Life',
    description: 'A perfect circle around the Civic Center. Great for beginners!',
    distance: '2.8 miles',
    duration: '45 minutes',
    difficulty: 'Easy',
    shape: 'Circle',
    stops: [
      // Circle points
      { id: '1', name: 'Start/End', coordinate: { latitude: 37.7793, longitude: -122.4192 } },
      { id: '2', name: 'North', coordinate: { latitude: 37.7843, longitude: -122.4192 } },
      { id: '3', name: 'East', coordinate: { latitude: 37.7793, longitude: -122.4142 } },
      { id: '4', name: 'South', coordinate: { latitude: 37.7743, longitude: -122.4192 } },
      { id: '5', name: 'West', coordinate: { latitude: 37.7793, longitude: -122.4242 } },
    ],
  },
  {
    id: '4',
    name: 'Spiral of Success',
    description: 'Create an impressive spiral pattern. Challenge yourself!',
    distance: '4.5 miles',
    duration: '1.5 hours',
    difficulty: 'Hard',
    shape: 'Spiral',
    stops: [
      // Spiral points
      { id: '1', name: 'Center', coordinate: { latitude: 37.7749, longitude: -122.4194 } },
      { id: '2', name: 'Loop 1', coordinate: { latitude: 37.7769, longitude: -122.4194 } },
      { id: '3', name: 'Loop 2', coordinate: { latitude: 37.7789, longitude: -122.4194 } },
      { id: '4', name: 'Loop 3', coordinate: { latitude: 37.7809, longitude: -122.4194 } },
      { id: '5', name: 'Loop 4', coordinate: { latitude: 37.7829, longitude: -122.4194 } },
    ],
  },
  {
    id: '5',
    name: 'Diamond District',
    description: 'Draw a diamond shape through the Financial District. Show off your precision!',
    distance: '3.2 miles',
    duration: '1 hour',
    difficulty: 'Medium',
    shape: 'Diamond',
    stops: [
      // Diamond points
      { id: '1', name: 'Start/End', coordinate: { latitude: 37.7924, longitude: -122.4011 } },
      { id: '2', name: 'Top', coordinate: { latitude: 37.7974, longitude: -122.4011 } },
      { id: '3', name: 'Right', coordinate: { latitude: 37.7924, longitude: -122.3961 } },
      { id: '4', name: 'Bottom', coordinate: { latitude: 37.7874, longitude: -122.4011 } },
      { id: '5', name: 'Left', coordinate: { latitude: 37.7924, longitude: -122.4061 } },
    ],
  },
];

interface RoutesProps {
  onSelectRoute: (route: Route) => void;
  visible: boolean;
  onClose: () => void;
}

export default function Routes({ onSelectRoute, visible, onClose }: RoutesProps) {
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);

  const getDifficultyColor = (difficulty: Route['difficulty']) => {
    switch (difficulty) {
      case 'Easy':
        return '#4CAF50';
      case 'Medium':
        return '#FFC107';
      case 'Hard':
        return '#F44336';
    }
  };

  const getShapeIcon = (shape: Route['shape']) => {
    switch (shape) {
      case 'Star':
        return 'star';
      case 'Heart':
        return 'heart';
      case 'Circle':
        return 'ellipse';
      case 'Spiral':
        return 'infinite';
      case 'Diamond':
        return 'diamond';
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Artistic Routes</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.routesList}>
            {DEMO_ROUTES.map((route) => (
              <TouchableOpacity
                key={route.id}
                style={styles.routeCard}
                onPress={() => {
                  setSelectedRoute(route);
                  onSelectRoute(route);
                }}
              >
                <View style={styles.routeHeader}>
                  <View style={styles.routeTitleContainer}>
                    <Ionicons name={getShapeIcon(route.shape)} size={24} color="#007AFF" style={styles.shapeIcon} />
                    <Text style={styles.routeName}>{route.name}</Text>
                  </View>
                  <View
                    style={[
                      styles.difficultyBadge,
                      { backgroundColor: getDifficultyColor(route.difficulty) },
                    ]}
                  >
                    <Text style={styles.difficultyText}>{route.difficulty}</Text>
                  </View>
                </View>
                <Text style={styles.routeDescription}>{route.description}</Text>
                <View style={styles.routeDetails}>
                  <View style={styles.detailItem}>
                    <Ionicons name="walk-outline" size={16} color="#666" />
                    <Text style={styles.detailText}>{route.distance}</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Ionicons name="time-outline" size={16} color="#666" />
                    <Text style={styles.detailText}>{route.duration}</Text>
                  </View>
                </View>
                <View style={styles.stopsContainer}>
                  <Text style={styles.stopsTitle}>Shape Points:</Text>
                  {route.stops.map((stop, index) => (
                    <View key={stop.id} style={styles.stopItem}>
                      <Text style={styles.stopNumber}>{index + 1}</Text>
                      <Text style={styles.stopName}>{stop.name}</Text>
                    </View>
                  ))}
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 4,
  },
  routesList: {
    padding: 16,
  },
  routeCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
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
  shapeIcon: {
    marginRight: 8,
  },
  routeName: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  difficultyText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  routeDescription: {
    color: '#666',
    marginBottom: 12,
  },
  routeDetails: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  detailText: {
    marginLeft: 4,
    color: '#666',
  },
  stopsContainer: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 12,
  },
  stopsTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  stopItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  stopNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#007AFF',
    color: '#fff',
    textAlign: 'center',
    lineHeight: 24,
    marginRight: 8,
  },
  stopName: {
    color: '#333',
  },
}); 