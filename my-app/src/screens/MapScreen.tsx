"use client"

import React, { useRef, useState, useEffect, useMemo, useCallback } from "react"
import { View, StyleSheet, TouchableOpacity, Text, Alert, ActivityIndicator, Dimensions, Linking } from "react-native"
import MapView, { Polyline, Marker } from "react-native-maps"
import Icon from "react-native-vector-icons/MaterialIcons"
import { useMapStore } from "../store/mapStore"
import { useThemeStore } from "../store/themeStore"
import { useMapSettingsStore } from "../store/mapSettingsStore"
import { useSettingsStore } from "../store/settingsStore"
import { lightTheme, darkTheme } from "../theme/colors"
import MapTypeSelector from "../components/MapTypeSelector"
import { locationService } from "../services/locationService"
import { autoSaveService } from "../services/autoSaveService"
import * as Location from "expo-location"
import * as Haptics from "expo-haptics"
import * as Sharing from "expo-sharing"
import AsyncStorage from "@react-native-async-storage/async-storage"
import Svg, { Polyline as SvgPolyline, Circle } from "react-native-svg"
import { useNavigation } from "@react-navigation/native"
import { SafeAreaView } from "react-native-safe-area-context"

export default function MapScreen() {
  const mapRef = useRef(null)
  const { currentShape, snappedRoute, exportUrl, isDrawing, isLoading, addCoordinate, clearShape, submitShape, saveSnappedRoute, snapShape, setDrawingMode, clearExportUrl } = useMapStore()
  const { isDarkMode } = useThemeStore()
  const { mapType, showUserLocation, showCompass, showScale, showBuildings, showTraffic } = useMapSettingsStore()
  const { settings } = useSettingsStore()
  const theme = isDarkMode ? darkTheme : lightTheme
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null)
  const [isLocating, setIsLocating] = useState(false)
  const [forceRerender, setForceRerender] = useState(0)
  const [region, setRegion] = useState({
    latitude: 37.78825,
    longitude: -122.4324,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  })
  const REGION_KEY = "@mappa_last_region"
  const [mapLayout, setMapLayout] = useState({ 
    width: Dimensions.get('window').width, 
    height: Dimensions.get('window').height 
  })
  const navigation = useNavigation()
  const [showMapTypeSelector, setShowMapTypeSelector] = useState(false)

  useEffect(() => {
    (async () => {
      const savedRegion = await AsyncStorage.getItem(REGION_KEY)
      if (savedRegion) {
        const parsed = JSON.parse(savedRegion)
        setRegion(parsed)
        setUserLocation({ latitude: parsed.latitude, longitude: parsed.longitude })
        return
      }
      
      let { status } = await Location.requestForegroundPermissionsAsync()
      
      if (status === "granted") {
        let lastKnown = await Location.getLastKnownPositionAsync()
        if (lastKnown) {
          const userLoc = {
            latitude: lastKnown.coords.latitude,
            longitude: lastKnown.coords.longitude,
          }
          setUserLocation(userLoc)
          setRegion({ ...userLoc, latitudeDelta: 0.01, longitudeDelta: 0.01 })
        }
        
        try {
          let location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High })
          const userLoc = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          }
          setUserLocation(userLoc)
          setRegion({ ...userLoc, latitudeDelta: 0.01, longitudeDelta: 0.01 })
        } catch (error) {
          // Fall back to last known location if current location fails
        }
        return
      }
      
      try {
        const res = await fetch("https://ipapi.co/json/")
        const data = await res.json()
        if (data && data.latitude && data.longitude) {
          setRegion({
            latitude: data.latitude,
            longitude: data.longitude,
            latitudeDelta: 0.1,
            longitudeDelta: 0.1,
          })
        }
      } catch (error) {
        // Fall back to default region if IP location fails
      }
    })()
  }, [])

  useEffect(() => {
    AsyncStorage.setItem(REGION_KEY, JSON.stringify(region))
  }, [region])

  // Force rerender when snappedRoute changes to fix rendering delay
  useEffect(() => {
    if (snappedRoute.length > 0) {
      setForceRerender(prev => prev + 1)
    }
  }, [snappedRoute])

  useEffect(() => {
    // Initialize location tracking if enabled
    if (settings.locationTracking.enabled) {
      locationService.startLocationTracking(settings.locationTracking)
    }

    // Initialize auto-save if enabled
    if (settings.autoSave.enabled) {
      autoSaveService.startAutoSave(settings.autoSave)
    }

    // Cleanup on unmount
    return () => {
      locationService.cleanup()
      autoSaveService.cleanup()
    }
  }, [settings.locationTracking, settings.autoSave])

  const handleMapPress = useCallback((event: any) => {
    if (!isDrawing) return
    const { coordinate } = event.nativeEvent
    addCoordinate(coordinate)
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    } catch (error) {
      // Haptic feedback not available
    }
  }, [isDrawing, addCoordinate])

  const handleExportRoute = async () => {
    if (!exportUrl && snappedRoute.length === 0) {
      Alert.alert(
        "No Route Available", 
        "Please complete a route first before exporting."
      )
      return
    }

    // Show options for different navigation apps
    Alert.alert(
      "Open Route In",
      "Choose how you want to open this route:",
      [
        {
          text: "Google Maps",
          onPress: () => openInGoogleMaps()
        },
        {
          text: "Apple Maps",
          onPress: () => openInAppleMaps()
        },
        {
          text: "Share Link",
          onPress: () => shareRouteLink()
        },
        {
          text: "Cancel",
          style: "cancel"
        }
      ]
    )
  }

  const openInGoogleMaps = async () => {
    if (!exportUrl) {
      Alert.alert("Error", "Google Maps link not available for this route")
      return
    }

    try {
      const canOpen = await Linking.canOpenURL(exportUrl)
      if (canOpen) {
        await Linking.openURL(exportUrl)
      } else {
        // Fallback to sharing
        await shareRouteLink()
      }
    } catch (error) {
      console.error("Error opening Google Maps:", error)
      Alert.alert("Error", "Could not open Google Maps")
    }
  }

  const openInAppleMaps = async () => {
    if (snappedRoute.length < 2) {
      Alert.alert("Error", "Route not available for Apple Maps")
      return
    }

    try {
      const start = snappedRoute[0]
      const end = snappedRoute[snappedRoute.length - 1]
      
      // Create Apple Maps URL with start and end points
      const appleMapsUrl = `maps://maps.apple.com/?saddr=${start.latitude},${start.longitude}&daddr=${end.latitude},${end.longitude}&dirflg=w`
      
      const canOpen = await Linking.canOpenURL(appleMapsUrl)
      if (canOpen) {
        await Linking.openURL(appleMapsUrl)
      } else {
        Alert.alert("Error", "Apple Maps is not available on this device")
      }
    } catch (error) {
      console.error("Error opening Apple Maps:", error)
      Alert.alert("Error", "Could not open Apple Maps")
    }
  }

  const shareRouteLink = async () => {
    if (!exportUrl) {
      Alert.alert("Error", "Route link not available")
      return
    }

    try {
      const isAvailable = await Sharing.isAvailableAsync()
      if (!isAvailable) {
        Alert.alert("Error", "Sharing is not available on this device")
        return
      }

      await Sharing.shareAsync(exportUrl, {
        mimeType: 'text/plain',
        dialogTitle: 'Share Route',
        UTI: 'public.plain-text'
      })
    } catch (error) {
      console.error("Error sharing route:", error)
      Alert.alert("Error", "Failed to share route")
    }
  }

  const handleSubmitShape = async () => {
    if (currentShape.length < 2) {
      Alert.alert("Error", "Please draw at least 2 points to create a route")
      return
    }

    try {
      await snapShape()
    } catch (error) {
      console.error("Failed to snap route:", error)
      Alert.alert("Error", "Failed to process route. Please try again.")
    }
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

  const handleClearShape = () => {
    clearShape()
    setDrawingMode(false)
  }

  const handleLocateMe = async () => {
    try {
      setIsLocating(true)
      
      let { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== "granted") {
        Alert.alert("Permission Denied", "Location permission is required to use this feature.")
        setIsLocating(false)
        return
      }
      
      // First try to get last known location for instant response
      try {
        const lastKnown = await Location.getLastKnownPositionAsync()
        if (lastKnown) {
          const userLoc = {
            latitude: lastKnown.coords.latitude,
            longitude: lastKnown.coords.longitude,
          }
          setUserLocation(userLoc)
          
          if (mapRef.current) {
            (mapRef.current as any).animateToRegion({
              latitude: lastKnown.coords.latitude,
              longitude: lastKnown.coords.longitude,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            }, 1000)
          }
          
          // Continue to get current location in background for accuracy
          Location.getCurrentPositionAsync({ 
            accuracy: Location.Accuracy.Balanced
          }).then(location => {
            const currentUserLoc = {
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
            }
            setUserLocation(currentUserLoc)
          }).catch(() => {
            // Background location update failed, use last known
          })
          
          setIsLocating(false)
          return
        }
      } catch (error) {
        // No last known location, continue to get current
      }
      
      // If no last known location, get current location with timeout
      try {
        const location = await Location.getCurrentPositionAsync({ 
          accuracy: Location.Accuracy.Balanced
        })
        
        const userLoc = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        }
        setUserLocation(userLoc)
        
        if (mapRef.current) {
          (mapRef.current as any).animateToRegion({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }, 1000)
        }
      } catch (locationError) {
        Alert.alert("Location Error", "Could not fetch your current location. Please try again or check your location settings.")
      }
    } catch (error) {
      Alert.alert("Error", "Could not fetch your location.")
    } finally {
      setIsLocating(false)
    }
  }

  const handleSetDrawingMode = (drawing: boolean) => {
    setDrawingMode(drawing)
    
    // Start/stop auto-save based on drawing mode
    if (drawing && settings.autoSave.enabled) {
      autoSaveService.startAutoSave(settings.autoSave)
    } else if (!drawing) {
      autoSaveService.stopAutoSave()
    }
  }

  const handleUndoLastPoint = () => {
    if (currentShape.length > 0) {
      const newShape = currentShape.slice(0, -1)
      clearShape()
      newShape.forEach(coord => addCoordinate(coord))
      
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      } catch (error) {
        // Haptic feedback not available
      }
    }
  }

  const coordinateToPixel = useCallback((coordinate: any) => {
    if (!mapLayout.width || !mapLayout.height) return { x: 0, y: 0 }
    
    const { latitude, longitude, latitudeDelta, longitudeDelta } = region
    const { width, height } = mapLayout
    
    const normalizedX = (coordinate.longitude - (longitude - longitudeDelta/2)) / longitudeDelta
    const normalizedY = ((latitude + latitudeDelta/2) - coordinate.latitude) / latitudeDelta
    
    const x = normalizedX * width
    const y = normalizedY * height
    
    return { x, y }
  }, [region, mapLayout])

  const handleMapLayout = useCallback((event: any) => {
    const { width, height } = event.nativeEvent.layout
    setMapLayout({ width, height })
  }, [])

  const handleRegionChange = useCallback((newRegion: any) => {
    setRegion(newRegion)
  }, [])

  const instantOverlay = useMemo(() => {
    if (currentShape.length === 0 || snappedRoute.length > 0) return null
    
    const screenPoints = currentShape.map(coordinateToPixel)
    
    return (
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Svg 
          width={mapLayout.width} 
          height={mapLayout.height} 
          style={StyleSheet.absoluteFill}
        >
          {screenPoints.length > 1 && (
            <SvgPolyline
              points={screenPoints.map(p => `${p.x},${p.y}`).join(" ")}
              fill="none"
              stroke={theme.primary}
              strokeWidth="3"
              strokeDasharray="6,4"
            />
          )}
          {screenPoints.map((point, index) => (
            <Circle
              key={`instant-${index}`}
              cx={point.x}
              cy={point.y}
              r="6"
              fill={index === screenPoints.length - 1 ? theme.warning : theme.primary}
              stroke="white"
              strokeWidth="2"
            />
          ))}
        </Svg>
      </View>
    )
  }, [currentShape, coordinateToPixel, mapLayout, theme, snappedRoute.length])

  const styles = createStyles(theme)

  return (
    <View style={styles.container}>
      <MapView
        key={forceRerender}
        ref={mapRef}
        style={styles.map}
        initialRegion={region}
        onRegionChangeComplete={handleRegionChange}
        onPress={handleMapPress}
        onLayout={handleMapLayout}
        mapType={mapType}
        showsUserLocation={showUserLocation}
        showsMyLocationButton={false}
        showsCompass={showCompass}
        showsScale={showScale}
        showsBuildings={showBuildings}
        showsTraffic={showTraffic}
        scrollEnabled={true}
        zoomEnabled={true}
        pitchEnabled={true}
        rotateEnabled={true}
      >
        {/* User location marker */}
        {userLocation && (
          <Marker
            coordinate={userLocation}
            title="Your Location"
            description="Current location"
          >
            <View style={styles.userLocationMarker}>
              <View style={styles.userLocationDot} />
            </View>
          </Marker>
        )}
        
        {/* Route markers */}
        {currentShape.length > 0 && (
          <Marker coordinate={currentShape[0]} pinColor={theme.primary} />
        )}
        {currentShape.length > 1 && (
          <Marker coordinate={currentShape[currentShape.length - 1]} pinColor={theme.warning} />
        )}
        
        {snappedRoute.length > 0 && (
          <Polyline
            coordinates={snappedRoute}
            strokeColor={theme.success}
            strokeWidth={4}
          />
        )}
      </MapView>
      
      {instantOverlay}
      
      {/* Right side controls */}
      <View style={[
        styles.controlsContainerBottomRight, 
        (currentShape.length > 0 || snappedRoute.length > 0) ? styles.controlsWithBottomButtons : styles.controlsDefault
      ]}>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => setShowMapTypeSelector(true)}
          accessibilityLabel="Change Map Type"
        >
          <Icon name="layers" size={26} color={theme.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.iconButton, isDrawing && styles.iconButtonActive]}
          onPress={() => handleSetDrawingMode(!isDrawing)}
          accessibilityLabel="Map a Route"
        >
          <Icon name={isDrawing ? "stop" : "edit-location-alt"} size={26} color={isDrawing ? theme.error : theme.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={handleLocateMe}
          accessibilityLabel="Locate Me"
          disabled={isLocating}
        >
          {isLocating ? (
            <ActivityIndicator color={theme.primary} size="small" />
          ) : (
            <Icon name="my-location" size={26} color={theme.primary} />
          )}
        </TouchableOpacity>
        {isDrawing && currentShape.length > 0 && (
          <TouchableOpacity
            style={styles.iconButton}
            onPress={handleUndoLastPoint}
            accessibilityLabel="Undo Last Point"
          >
            <Icon name="undo" size={26} color={theme.warning} />
          </TouchableOpacity>
        )}
      </View>
      
      {/* Route options */}
      {snappedRoute.length > 0 && (
        <View style={styles.fabBarContainer}>
          <TouchableOpacity 
            style={[styles.fabButton, styles.exportButton]} 
            onPress={handleExportRoute}
            activeOpacity={0.8}
          >
            <Icon name="directions" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.fabButton, styles.saveButton]}
            onPress={async () => {
              try {
                // Save the current snapped route to the backend with a custom name
                Alert.prompt(
                  "Save Route",
                  "Enter a name for this route:",
                  [
                    {
                      text: "Cancel",
                      style: "cancel"
                    },
                    {
                      text: "Save",
                      onPress: async (routeName) => {
                        if (routeName && routeName.trim()) {
                          try {
                            // Save the route to the backend with the provided name
                            const result = await saveSnappedRoute(routeName.trim())
                            if (result) {
                              Alert.alert("Success", `Route "${routeName.trim()}" has been saved!`)
                              clearShape()
                              setDrawingMode(false)
                            }
                          } catch (error) {
                            console.error("Error saving route:", error)
                            Alert.alert("Error", "Failed to save route. Please try again.")
                          }
                        }
                      }
                    }
                  ],
                  "plain-text",
                  "",
                  "default"
                )
              } catch (error) {
                console.error("Error saving route:", error)
                Alert.alert("Error", "Failed to save route")
              }
            }}
            activeOpacity={0.8}
          >
            <Icon name="bookmark" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.fabButton, styles.clearButton]}
            onPress={() => {
              clearShape()
              setDrawingMode(false)
            }}
            activeOpacity={0.8}
          >
            <Icon name="close" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      )}
      
      {/* Bottom action buttons */}
      {currentShape.length > 0 && snappedRoute.length === 0 && (
        <View style={styles.fabBarContainer}>
          <TouchableOpacity 
            style={[styles.fabButton, styles.clearButton]} 
            onPress={handleClearShape}
            activeOpacity={0.8}
          >
            <Icon name="close" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.fabButton, styles.submitButton, isLoading && styles.actionButtonDisabled]}
            onPress={handleSubmitShape}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" size={20} />
            ) : (
              <Icon name="check" size={20} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Map Type Selector Modal */}
      <MapTypeSelector 
        visible={showMapTypeSelector} 
        onClose={() => setShowMapTypeSelector(false)} 
      />
    </View>
  )
}

const createStyles = (theme: any) => StyleSheet.create({
  container: { 
    flex: 1,
    backgroundColor: theme.background,
  },
  map: { 
    flex: 1 
  },
  controlsContainerBottomRight: {
    position: "absolute",
    right: 24,
    bottom: 120,
    alignItems: "flex-end",
    gap: 16,
    zIndex: 100,
  },
  iconButton: {
    backgroundColor: theme.surface + "F0",
    borderRadius: 24,
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  iconButtonActive: {
    backgroundColor: theme.primary,
  },
  iconContainer: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  recordingDot: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FF4444',
  },
  fabBarContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 40,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
    zIndex: 50,
  },
  fabButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.surface,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 6,
  },
  exportButton: {
    backgroundColor: theme.primary,
  },
  saveButton: {
    backgroundColor: '#4CAF50',
  },
  clearButton: {
    backgroundColor: theme.error,
  },
  submitButton: {
    backgroundColor: theme.primary,
  },
  actionButtonDisabled: {
    opacity: 0.7,
  },
  controlsWithBottomButtons: {
    // Add styles for controls with bottom buttons
  },
  controlsDefault: {
    // Add styles for default controls
  },
  userLocationMarker: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(25, 118, 210, 0.3)',
    borderWidth: 2,
    borderColor: theme.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userLocationDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: theme.primary,
  },
})