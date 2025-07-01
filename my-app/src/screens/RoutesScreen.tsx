import { useEffect, useState } from "react"
import { 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  StyleSheet, 
  ActivityIndicator, 
  RefreshControl, 
  Alert,
  Modal,
  TextInput,
  Dimensions
} from "react-native"
import Icon from "react-native-vector-icons/MaterialIcons"
import MapView, { Polyline } from "react-native-maps"
import { useNavigation } from "@react-navigation/native"
import { StackNavigationProp } from "@react-navigation/stack"
import { useMapStore } from "../store/mapStore"
import { useThemeStore } from "../store/themeStore"
import { useMapSettingsStore } from "../store/mapSettingsStore"
import { lightTheme, darkTheme } from "../theme/colors"

const { width } = Dimensions.get('window')

type RoutesStackParamList = {
  RoutesList: undefined
  RouteDetail: { routeId: string }
}

type RoutesScreenNavigationProp = StackNavigationProp<RoutesStackParamList, 'RoutesList'>

export default function RoutesScreen() {
  const navigation = useNavigation<RoutesScreenNavigationProp>()
  const { routes, isLoading, fetchRoutes, deleteRoute, updateRoute } = useMapStore()
  const { isDarkMode } = useThemeStore()
  const { mapType, showUserLocation, showCompass, showScale, showBuildings, showTraffic } = useMapSettingsStore()
  const theme = isDarkMode ? darkTheme : lightTheme
  
  const [editingRoute, setEditingRoute] = useState<any>(null)
  const [editName, setEditName] = useState("")
  const [showEditModal, setShowEditModal] = useState(false)

  useEffect(() => {
    fetchRoutes()
  }, [])

  const handleRoutePress = (route: any) => {
    navigation.navigate("RouteDetail", { routeId: route.id })
  }

  const handleDeleteRoute = (route: any) => {
    Alert.alert(
      "Delete Route",
      `Are you sure you want to delete "${route.name || `Route ${route.id}`}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              console.log('RoutesScreen: Deleting route:', route.id)
              await deleteRoute(route.id)
              console.log('RoutesScreen: Route deleted successfully')
              await fetchRoutes() // Refresh the list
            } catch (error: any) {
              console.error('RoutesScreen: Error deleting route:', error)
              Alert.alert("Error", `Failed to delete route: ${error.message || 'Unknown error'}`)
            }
          }
        }
      ]
    )
  }

  const handleEditRoute = (route: any) => {
    setEditingRoute(route)
    setEditName(route.name || `Route ${route.id}`)
    setShowEditModal(true)
  }

  const handleSaveEdit = async () => {
    if (!editingRoute || !editName.trim()) return

    try {
      console.log('Updating route:', editingRoute.id, 'with name:', editName.trim())
      await updateRoute(editingRoute.id, { name: editName.trim() })
      console.log('Route updated successfully')
      setShowEditModal(false)
      setEditingRoute(null)
      setEditName("")
      await fetchRoutes() // Refresh the list
    } catch (error: any) {
      console.error('Error updating route:', error)
      Alert.alert("Error", `Failed to update route: ${error.message || 'Unknown error'}`)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const getRouteLocation = (coordinates: any[]) => {
    if (!coordinates || coordinates.length === 0) return "Unknown location"
    
    // Get the center point for reverse geocoding (simplified)
    const centerLat = coordinates.reduce((sum, coord) => sum + coord.latitude, 0) / coordinates.length
    const centerLng = coordinates.reduce((sum, coord) => sum + coord.longitude, 0) / coordinates.length
    
    // This is a simplified location display - in a real app you'd use reverse geocoding
    return `${centerLat.toFixed(4)}, ${centerLng.toFixed(4)}`
  }

  const getRouteDistance = (coordinates: any[]) => {
    if (!coordinates || coordinates.length < 2) return "0 km"
    
    // Calculate approximate distance using Haversine formula
    let totalDistance = 0
    for (let i = 1; i < coordinates.length; i++) {
      const prev = coordinates[i - 1]
      const curr = coordinates[i]
      const distance = getDistanceBetweenPoints(prev.latitude, prev.longitude, curr.latitude, curr.longitude)
      totalDistance += distance
    }
    
    return totalDistance < 1 ? `${(totalDistance * 1000).toFixed(0)} m` : `${totalDistance.toFixed(2)} km`
  }

  const getDistanceBetweenPoints = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371 // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lon2 - lon1) * Math.PI / 180
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  const getMapRegion = (coordinates: any[]) => {
    if (!coordinates || coordinates.length === 0) {
      return {
        latitude: 37.78825,
        longitude: -122.4324,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      }
    }

    const latitudes = coordinates.map(coord => coord.latitude)
    const longitudes = coordinates.map(coord => coord.longitude)

    const minLat = Math.min(...latitudes)
    const maxLat = Math.max(...latitudes)
    const minLng = Math.min(...longitudes)
    const maxLng = Math.max(...longitudes)

    const centerLat = (minLat + maxLat) / 2
    const centerLng = (minLng + maxLng) / 2
    const deltaLat = Math.max((maxLat - minLat) * 1.4, 0.01)
    const deltaLng = Math.max((maxLng - minLng) * 1.4, 0.01)

    return {
      latitude: centerLat,
      longitude: centerLng,
      latitudeDelta: deltaLat,
      longitudeDelta: deltaLng,
    }
  }

  const renderRouteItem = ({ item }: { item: any }) => {
    const coordinates = item.snappedCoordinates || item.coordinates || []
    
    return (
      <View style={styles.routeItem}>
        <TouchableOpacity 
          style={styles.routeMainContent} 
          onPress={() => handleRoutePress(item)}
        >
          <View style={styles.routeInfo}>
            <Text style={styles.routeName}>{item.name || `Route ${item.id}`}</Text>
            <Text style={styles.routeDate}>Created: {formatDate(item.createdAt)}</Text>
            <Text style={styles.routeLocation}>
              <Icon name="location-on" size={14} color={theme.textSecondary} />
              {" " + getRouteLocation(coordinates)}
            </Text>
            <View style={styles.routeStats}>
              <Text style={styles.routeDistance}>{getRouteDistance(coordinates)}</Text>
              <Text style={styles.routePoints}>• {coordinates.length} points</Text>
              <Text style={styles.routeMode}>• {item.mode || 'walking'}</Text>
            </View>
          </View>
          
          {/* Mini Map Preview */}
          <View style={styles.mapPreviewContainer}>
            {coordinates.length > 0 ? (
              <MapView
                style={styles.mapPreview}
                initialRegion={getMapRegion(coordinates)}
                mapType={mapType}
                scrollEnabled={false}
                zoomEnabled={false}
                rotateEnabled={false}
                pitchEnabled={false}
                showsUserLocation={false}
                showsCompass={false}
                showsScale={false}
                showsBuildings={false}
                showsTraffic={false}
              >
                <Polyline
                  coordinates={coordinates}
                  strokeColor={theme.primary}
                  strokeWidth={2}
                />
              </MapView>
            ) : (
              <View style={styles.mapPreviewPlaceholder}>
                <Icon name="map" size={24} color={theme.textSecondary} />
              </View>
            )}
          </View>
        </TouchableOpacity>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={() => handleEditRoute(item)}
          >
            <Icon name="edit" size={20} color={theme.primary} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={() => handleDeleteRoute(item)}
          >
            <Icon name="delete" size={20} color={theme.error} />
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  const styles = createStyles(theme)

  if (isLoading && routes.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={styles.loadingText}>Loading routes...</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {routes.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon name="route" size={64} color={theme.textSecondary} />
          <Text style={styles.emptyTitle}>No Routes Yet</Text>
          <Text style={styles.emptySubtitle}>Start drawing routes on the map to see them here</Text>
        </View>
      ) : (
        <FlatList
          data={routes}
          renderItem={renderRouteItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl 
              refreshing={isLoading} 
              onRefresh={fetchRoutes} 
              tintColor={theme.primary} 
            />
          }
        />
      )}

      {/* Edit Modal */}
      <Modal
        visible={showEditModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Edit Route Name</Text>
            <TextInput
              style={styles.textInput}
              value={editName}
              onChangeText={setEditName}
              placeholder="Enter route name"
              placeholderTextColor={theme.textSecondary}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]} 
                onPress={() => setShowEditModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.saveButton]} 
                onPress={handleSaveEdit}
              >
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      gap: 16,
    },
    loadingText: {
      color: theme.textSecondary,
      fontSize: 16,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 32,
      gap: 16,
    },
    emptyTitle: {
      fontSize: 24,
      fontWeight: "bold",
      color: theme.text,
      textAlign: "center",
    },
    emptySubtitle: {
      fontSize: 16,
      color: theme.textSecondary,
      textAlign: "center",
      lineHeight: 24,
    },
    listContainer: {
      padding: 16,
      gap: 12,
    },
    routeItem: {
      backgroundColor: theme.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
      overflow: 'hidden',
    },
    routeMainContent: {
      flexDirection: "row",
      alignItems: "center",
      padding: 16,
    },
    routeInfo: {
      flex: 1,
      gap: 4,
      paddingRight: 12,
    },
    routeName: {
      fontSize: 18,
      fontWeight: "600",
      color: theme.text,
    },
    routeDate: {
      fontSize: 14,
      color: theme.textSecondary,
    },
    routeLocation: {
      fontSize: 12,
      color: theme.textSecondary,
      flexDirection: 'row',
      alignItems: 'center',
    },
    routeStats: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 4,
    },
    routeDistance: {
      fontSize: 14,
      color: theme.primary,
      fontWeight: "600",
    },
    routePoints: {
      fontSize: 12,
      color: theme.textSecondary,
    },
    routeMode: {
      fontSize: 12,
      color: theme.textSecondary,
      textTransform: 'capitalize',
    },
    mapPreviewContainer: {
      width: 80,
      height: 80,
      borderRadius: 8,
      overflow: 'hidden',
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
    },
    mapPreview: {
      flex: 1,
    },
    mapPreviewPlaceholder: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.background,
    },
    actionButtons: {
      flexDirection: 'row',
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    actionButton: {
      flex: 1,
      paddingVertical: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 20,
    },
    modalContainer: {
      backgroundColor: theme.surface,
      borderRadius: 12,
      padding: 24,
      width: '100%',
      maxWidth: 400,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 16,
      textAlign: 'center',
    },
    textInput: {
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
      color: theme.text,
      backgroundColor: theme.background,
      marginBottom: 20,
    },
    modalButtons: {
      flexDirection: 'row',
      gap: 12,
    },
    modalButton: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 8,
      alignItems: 'center',
    },
    cancelButton: {
      backgroundColor: theme.background,
      borderWidth: 1,
      borderColor: theme.border,
    },
    saveButton: {
      backgroundColor: theme.primary,
    },
    cancelButtonText: {
      color: theme.text,
      fontSize: 16,
      fontWeight: '500',
    },
    saveButtonText: {
      color: theme.surface,
      fontSize: 16,
      fontWeight: '600',
    },
  })