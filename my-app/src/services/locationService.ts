import * as Location from 'expo-location'
import { Platform } from 'react-native'

export interface LocationSettings {
  enabled: boolean
  backgroundTracking: boolean
}

class LocationService {
  private locationSubscription: Location.LocationSubscription | null = null
  private backgroundLocationSubscription: Location.LocationSubscription | null = null
  private isInitialized = false

  async initialize() {
    if (this.isInitialized) return true

    try {
      // Request foreground permissions
      const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync()
      
      if (foregroundStatus !== 'granted') {
        console.log('Foreground location permission denied')
        return false
      }

      this.isInitialized = true
      return true
    } catch (error) {
      console.error('Failed to initialize location service:', error)
      return false
    }
  }

  async requestBackgroundPermissions() {
    try {
      const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync()
      return backgroundStatus === 'granted'
    } catch (error) {
      console.error('Failed to request background permissions:', error)
      return false
    }
  }

  async startLocationTracking(settings: LocationSettings) {
    if (!settings.enabled) {
      await this.stopLocationTracking()
      return
    }

    try {
      // Stop any existing tracking
      await this.stopLocationTracking()

      // Start foreground location tracking
      this.locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000, // Update every 5 seconds
          distanceInterval: 10, // Update every 10 meters
        },
        (location) => {
          this.handleLocationUpdate(location)
        }
      )

      // Start background tracking if enabled
      if (settings.backgroundTracking) {
        const hasBackgroundPermission = await this.requestBackgroundPermissions()
        if (hasBackgroundPermission) {
          this.backgroundLocationSubscription = await Location.watchPositionAsync(
            {
              accuracy: Location.Accuracy.Balanced,
              timeInterval: 30000, // Update every 30 seconds in background
              distanceInterval: 50, // Update every 50 meters in background
            },
            (location) => {
              this.handleBackgroundLocationUpdate(location)
            }
          )
        }
      }

      console.log('Location tracking started')
    } catch (error) {
      console.error('Failed to start location tracking:', error)
    }
  }

  async stopLocationTracking() {
    try {
      if (this.locationSubscription) {
        await this.locationSubscription.remove()
        this.locationSubscription = null
      }

      if (this.backgroundLocationSubscription) {
        await this.backgroundLocationSubscription.remove()
        this.backgroundLocationSubscription = null
      }

      console.log('Location tracking stopped')
    } catch (error) {
      console.error('Failed to stop location tracking:', error)
    }
  }

  private handleLocationUpdate(location: Location.LocationObject) {
    // Handle foreground location updates
    console.log('Foreground location update:', {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      accuracy: location.coords.accuracy,
      timestamp: new Date(location.timestamp).toISOString()
    })

    // Here you can add logic to:
    // - Update current route if drawing
    // - Save location to local storage
    // - Send to backend if needed
    // - Trigger route auto-save if enabled
  }

  private handleBackgroundLocationUpdate(location: Location.LocationObject) {
    // Handle background location updates
    console.log('Background location update:', {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      accuracy: location.coords.accuracy,
      timestamp: new Date(location.timestamp).toISOString()
    })

    // Background location updates are typically used for:
    // - Route recording when app is in background
    // - Geofencing
    // - Location-based reminders
  }

  async getCurrentLocation(): Promise<Location.LocationObject | null> {
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      })
      return location
    } catch (error) {
      console.error('Failed to get current location:', error)
      return null
    }
  }

  async getLastKnownLocation(): Promise<Location.LocationObject | null> {
    try {
      const location = await Location.getLastKnownPositionAsync()
      return location
    } catch (error) {
      console.error('Failed to get last known location:', error)
      return null
    }
  }

  async getLocationPermissions() {
    try {
      const foregroundStatus = await Location.getForegroundPermissionsAsync()
      const backgroundStatus = await Location.getBackgroundPermissionsAsync()
      
      return {
        foreground: foregroundStatus.status,
        background: backgroundStatus.status,
      }
    } catch (error) {
      console.error('Failed to get location permissions:', error)
      return {
        foreground: 'denied' as const,
        background: 'denied' as const,
      }
    }
  }

  isTracking() {
    return this.locationSubscription !== null || this.backgroundLocationSubscription !== null
  }

  async cleanup() {
    await this.stopLocationTracking()
    this.isInitialized = false
  }
}

export const locationService = new LocationService() 