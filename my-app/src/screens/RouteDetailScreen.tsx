"use client"

import React, { useEffect, useState } from "react"
import { View, StyleSheet, ActivityIndicator, Text, Alert, TouchableOpacity, ScrollView, FlatList, Linking, Share } from "react-native"
import MapView, { Polyline, Marker } from "react-native-maps"
import { useRoute } from "@react-navigation/native"
import Icon from "react-native-vector-icons/MaterialIcons"
import * as Sharing from "expo-sharing"
import { useMapStore } from "../store/mapStore"
import { useThemeStore } from "../store/themeStore"
import { useMapSettingsStore } from "../store/mapSettingsStore"
import { lightTheme, darkTheme } from "../theme/colors"

export default function RouteDetailScreen() {
  const route = useRoute()
  const { routeId } = route.params as { routeId: string }
  const [routeData, setRouteData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showDirections, setShowDirections] = useState(false)
  const { fetchRouteById } = useMapStore()
  const { isDarkMode } = useThemeStore()
  const { mapType, showUserLocation, showCompass, showScale, showBuildings, showTraffic } = useMapSettingsStore()
  const theme = isDarkMode ? darkTheme : lightTheme

  useEffect(() => {
    loadRouteData()
  }, [routeId])

  const loadRouteData = async () => {
    setIsLoading(true)
    try {
      const data = await fetchRouteById(routeId)
      if (data) {
        setRouteData(data)
      } else {
        Alert.alert("Error", "Failed to load route details")
      }
    } catch (error) {
      console.error("Failed to load route:", error)
      Alert.alert("Error", "Failed to load route details")
    } finally {
      setIsLoading(false)
    }
  }

  const handleExportRoute = async () => {
    if (!routeData?.directions || routeData.directions.length === 0) {
      Alert.alert("No Directions", "Turn-by-turn directions are not available for this route.")
      return
    }

    try {
      const isAvailable = await Sharing.isAvailableAsync()
      if (!isAvailable) {
        Alert.alert("Error", "Sharing is not available on this device")
        return
      }

      // Format directions as text
      let directionsText = `Directions for ${routeData.name}\n\n`
      
      routeData.directions.forEach((step: any, index: number) => {
        const distance = step.distance < 1000 ? 
          `${Math.round(step.distance)} m` : 
          `${(step.distance / 1000).toFixed(1)} km`
        
        const duration = Math.round(step.duration / 60)
        const timeText = duration < 60 ? `${duration} min` : 
          `${Math.floor(duration / 60)}h ${duration % 60}m`
        
        directionsText += `${index + 1}. ${step.instruction}\n`
        directionsText += `   ${distance} • ${timeText}\n`
        if (step.name && step.name !== '-') {
          directionsText += `   ${step.name}\n`
        }
        directionsText += '\n'
      })

      // Use the native share API for text content
      await Share.share({
        message: directionsText,
        title: `Directions for ${routeData.name}`
      })
    } catch (error) {
      console.error("Error sharing directions:", error)
      Alert.alert("Error", "Failed to share directions")
    }
  }

  const handleShowDirections = () => {
    if (!routeData?.directions || routeData.directions.length === 0) {
      Alert.alert("No Directions", "Turn-by-turn directions are not available for this route.")
      return
    }
    setShowDirections(!showDirections)
  }

  const formatDistance = (distance: number) => {
    if (distance < 1000) {
      return `${Math.round(distance)} m`
    } else {
      return `${(distance / 1000).toFixed(1)} km`
    }
  }

  const formatDuration = (duration: number) => {
    const minutes = Math.round(duration / 60)
    if (minutes < 60) {
      return `${minutes} min`
    } else {
      const hours = Math.floor(minutes / 60)
      const remainingMinutes = minutes % 60
      return `${hours}h ${remainingMinutes}m`
    }
  }

  const getDirectionIcon = (type: number) => {
    switch (type) {
      case 0: return "turn-left" // Turn left
      case 1: return "turn-right" // Turn right
      case 2: return "straight" // Sharp left
      case 3: return "straight" // Sharp right
      case 4: return "turn-left" // Slight left
      case 5: return "turn-right" // Slight right
      case 6: return "straight" // Continue straight
      case 7: return "u-turn" // U-turn
      case 8: return "straight" // Enter roundabout
      case 9: return "straight" // Exit roundabout
      case 10: return "flag" // Arrive at destination
      case 11: return "navigation" // Head
      default: return "navigation"
    }
  }

  const renderDirectionStep = ({ item, index }: { item: any; index: number }) => (
    <View style={styles.directionStep}>
      <View style={styles.directionIconContainer}>
        <Icon 
          name={getDirectionIcon(item.type)} 
          size={20} 
          color={theme.primary} 
        />
      </View>
      <View style={styles.directionContent}>
        <Text style={styles.directionInstruction}>{item.instruction}</Text>
        <Text style={styles.directionDetails}>
          {formatDistance(item.distance)} • {formatDuration(item.duration)}
        </Text>
        {item.name && item.name !== '-' && (
          <Text style={styles.directionStreet}>{item.name}</Text>
        )}
      </View>
      <Text style={styles.directionNumber}>{index + 1}</Text>
    </View>
  )

  const getMapRegion = () => {
    if (!routeData?.coordinates || routeData.coordinates.length === 0) {
      return {
        latitude: 37.78825,
        longitude: -122.4324,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      }
    }

    const coordinates = routeData.snappedCoordinates || routeData.coordinates
    const latitudes = coordinates.map((coord: any) => coord.latitude)
    const longitudes = coordinates.map((coord: any) => coord.longitude)

    const minLat = Math.min(...latitudes)
    const maxLat = Math.max(...latitudes)
    const minLng = Math.min(...longitudes)
    const maxLng = Math.max(...longitudes)

    const centerLat = (minLat + maxLat) / 2
    const centerLng = (minLng + maxLng) / 2
    const deltaLat = (maxLat - minLat) * 1.2 // Add padding
    const deltaLng = (maxLng - minLng) * 1.2

    return {
      latitude: centerLat,
      longitude: centerLng,
      latitudeDelta: Math.max(deltaLat, 0.01),
      longitudeDelta: Math.max(deltaLng, 0.01),
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const styles = createStyles(theme)

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={styles.loadingText}>Loading route...</Text>
      </View>
    )
  }

  if (!routeData) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Route not found</Text>
      </View>
    )
  }

  const coordinates = routeData.snappedCoordinates || routeData.coordinates

  return (
    <View style={styles.container}>
      <MapView 
        style={styles.map} 
        initialRegion={getMapRegion()} 
        mapType={mapType}
        showsUserLocation={showUserLocation}
        showsCompass={showCompass}
        showsScale={showScale}
        showsBuildings={showBuildings}
        showsTraffic={showTraffic}
      >
        {/* Original route points */}
        {routeData.coordinates?.map((coord: any, index: number) => (
          <Marker
            key={`original-${index}`}
            coordinate={coord}
            pinColor={theme.textSecondary}
            title={`Original Point ${index + 1}`}
          />
        ))}

        {/* Original route line */}
        {routeData.coordinates && routeData.coordinates.length > 1 && (
          <Polyline
            coordinates={routeData.coordinates}
            strokeColor={theme.textSecondary}
            strokeWidth={2}
            lineDashPattern={[5, 5]}
          />
        )}

        {/* Snapped route line */}
        {routeData.snappedCoordinates && routeData.snappedCoordinates.length > 1 && (
          <Polyline coordinates={routeData.snappedCoordinates} strokeColor={theme.primary} strokeWidth={4} />
        )}

        {/* Start and end markers for snapped route */}
        {routeData.snappedCoordinates && routeData.snappedCoordinates.length > 0 && (
          <>
            <Marker
              coordinate={routeData.snappedCoordinates[0]}
              pinColor={theme.success}
              title="Start"
            />
            {routeData.snappedCoordinates.length > 1 && (
              <Marker
                coordinate={routeData.snappedCoordinates[routeData.snappedCoordinates.length - 1]}
                pinColor={theme.warning}
                title="End"
              />
            )}
          </>
        )}
      </MapView>

      {/* Route info overlay */}
      <View style={styles.infoOverlay}>
        <Text style={styles.routeName}>{routeData.name}</Text>
        <Text style={styles.routeInfo}>Created: {formatDate(routeData.createdAt)}</Text>
        <Text style={styles.routeInfo}>Mode: {routeData.mode}</Text>
        <Text style={styles.routeInfo}>{routeData.coordinates?.length || 0} original points</Text>
        {routeData.snappedCoordinates && (
          <Text style={styles.routeInfo}>{routeData.snappedCoordinates.length} snapped points</Text>
        )}
        {routeData.snappedCoordinates && routeData.snappedCoordinates.length > 5 && (
          <Text style={styles.limitationNote}>
            Note: Google Maps export uses key waypoints due to 5-waypoint limit
          </Text>
        )}
      </View>

      {/* Navigation buttons */}
      <View style={styles.navigationButtons}>
        <TouchableOpacity style={styles.navButton} onPress={handleShowDirections}>
          <Icon name="directions" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.navButton} onPress={handleExportRoute}>
          <Icon name="share" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Directions panel */}
      {showDirections && routeData.directions && (
        <View style={styles.directionsPanel}>
          <View style={styles.directionsHeader}>
            <Text style={styles.directionsTitle}>Turn-by-Turn Directions</Text>
            <TouchableOpacity onPress={() => setShowDirections(false)}>
              <Icon name="close" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>
          <FlatList
            data={routeData.directions}
            renderItem={renderDirectionStep}
            keyExtractor={(item, index) => `direction-${index}`}
            style={styles.directionsList}
            showsVerticalScrollIndicator={false}
          />
        </View>
      )}
    </View>
  )
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    map: {
      flex: 1,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: theme.background,
      gap: 16,
    },
    loadingText: {
      color: theme.textSecondary,
      fontSize: 16,
    },
    errorContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: theme.background,
    },
    errorText: {
      color: theme.error,
      fontSize: 18,
      fontWeight: "500",
    },
    infoOverlay: {
      position: "absolute",
      top: 20,
      left: 20,
      right: 20,
      backgroundColor: theme.surface + "E6",
      padding: 16,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
    },
    routeName: {
      fontSize: 18,
      fontWeight: "600",
      color: theme.text,
      marginBottom: 8,
    },
    routeInfo: {
      fontSize: 14,
      color: theme.textSecondary,
      marginBottom: 4,
    },
    limitationNote: {
      fontSize: 12,
      color: theme.textSecondary,
      marginTop: 4,
      fontStyle: 'italic',
    },
    exportButton: {
      position: "absolute",
      top: 20,
      right: 20,
      backgroundColor: theme.primary,
      padding: 12,
      borderRadius: 12,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 4,
    },
    navigationButtons: {
      position: "absolute",
      bottom: 20,
      right: 20,
      flexDirection: "column",
      gap: 12,
    },
    navButton: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: theme.primary,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 6,
      elevation: 6,
    },
    directionsPanel: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: theme.background,
      padding: 16,
    },
    directionsHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 16,
    },
    directionsTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: theme.text,
    },
    directionsList: {
      flex: 1,
    },
    directionStep: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    directionIconContainer: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.surface,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 12,
    },
    directionContent: {
      flex: 1,
    },
    directionInstruction: {
      fontSize: 16,
      fontWeight: "500",
      color: theme.text,
      marginBottom: 4,
    },
    directionDetails: {
      fontSize: 14,
      color: theme.textSecondary,
      marginBottom: 2,
    },
    directionStreet: {
      fontSize: 12,
      color: theme.primary,
      fontStyle: "italic",
    },
    directionNumber: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.primary,
      backgroundColor: theme.surface,
      width: 24,
      height: 24,
      borderRadius: 12,
      textAlign: "center",
      lineHeight: 24,
    },
  })
