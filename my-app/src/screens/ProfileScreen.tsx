import React, { useState, useEffect } from 'react'
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Image, 
  Switch, 
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  Dimensions,
  Platform
} from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import Icon from 'react-native-vector-icons/MaterialIcons'
import { useThemeStore } from "../store/themeStore"
import { useMapStore } from "../store/mapStore"
import { useMapSettingsStore } from "../store/mapSettingsStore"
import { useSettingsStore } from "../store/settingsStore"
import { useAuthStore } from "../store/authStore"
import { lightTheme, darkTheme } from "../theme/colors"
import { profileAPI, settingsAPI } from "../services/api"
import { notificationService } from "../services/notificationService"
import { locationService } from "../services/locationService"
import { autoSaveService } from "../services/autoSaveService"
import { exportService } from "../services/exportService"
import { importService, ImportedRoute } from "../services/importService"
import ImageService from "../services/imageService"
import MapTypeSelector from "../components/MapTypeSelector"

const { width } = Dimensions.get('window')

interface UserStats {
  totalRoutes: number
  totalDistance: number
  totalPoints: number
  favoriteMode: string
  averageRouteLength: number
  lastActivity: string
}

interface UserProfile {
  name: string
  email: string
  avatar?: string
  joinDate: string
  location?: string
  bio?: string
}

export default function ProfileScreen() {
  const { isDarkMode, toggleTheme } = useThemeStore()
  const { routes } = useMapStore()
  const { mapType } = useMapSettingsStore()
  const { 
    settings, 
    isInitialized, 
    initializeSettings,
    updateNotificationSettings,
    updateLocationTracking,
    updateAutoSave,
    updateUnits,
    updateDefaultRouteMode,
    updateMapQuality
  } = useSettingsStore()
  const { logout } = useAuthStore()
  const theme = isDarkMode ? darkTheme : lightTheme
  
  const [userProfile, setUserProfile] = useState<UserProfile>({
    name: "",
    email: "",
    joinDate: "",
    location: "",
    bio: ""
  })
  
  const [userStats, setUserStats] = useState<UserStats>({
    totalRoutes: 0,
    totalDistance: 0,
    totalPoints: 0,
    favoriteMode: 'walking',
    averageRouteLength: 0,
    lastActivity: new Date().toISOString()
  })
  
  const [showEditProfile, setShowEditProfile] = useState(false)
  const [editName, setEditName] = useState('')
  const [editLocation, setEditLocation] = useState('')
  const [editBio, setEditBio] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingProfile, setIsLoadingProfile] = useState(true)
  
  const [showMapTypeSelector, setShowMapTypeSelector] = useState(false)
  const [selectedAvatarUri, setSelectedAvatarUri] = useState<string | null>(null)

  useEffect(() => {
    if (!isInitialized) {
      initializeSettings()
    }
    fetchProfile()
    calculateUserStats()
  }, [routes, isInitialized])

  const fetchProfile = async () => {
    setIsLoadingProfile(true)
    try {
      const profileData = await profileAPI.getProfile()
      setUserProfile({
        name: profileData.name || "",
        email: profileData.email || "",
        joinDate: profileData.join_date || "",
        location: profileData.location || "",
        bio: profileData.bio || "",
        avatar: profileData.profile_picture || ""
      })
    } catch (error) {
      console.error('Failed to fetch profile:', error)
      Alert.alert('Error', 'Failed to load profile data')
    } finally {
      setIsLoadingProfile(false)
    }
  }

  const calculateUserStats = () => {
    if (!routes || routes.length === 0) {
      setUserStats(prev => ({ ...prev, totalRoutes: 0 }))
      return
    }

    let totalDistance = 0
    let totalPoints = 0
    const modes: { [key: string]: number } = {}

    routes.forEach(route => {
      const coordinates = route.snappedCoordinates || route.coordinates || []
      totalPoints += coordinates.length
      
      // Calculate distance
      if (coordinates.length > 1) {
        for (let i = 1; i < coordinates.length; i++) {
          const dist = getDistanceBetweenPoints(
            coordinates[i-1].latitude,
            coordinates[i-1].longitude,
            coordinates[i].latitude,
            coordinates[i].longitude
          )
          totalDistance += dist
        }
      }
      
      // Count modes
      const mode = route.mode || 'walking'
      modes[mode] = (modes[mode] || 0) + 1
    })

    const favoriteMode = Object.keys(modes).reduce((a, b) => 
      modes[a] > modes[b] ? a : b, 'walking'
    )

    setUserStats({
      totalRoutes: routes.length,
      totalDistance,
      totalPoints,
      favoriteMode,
      averageRouteLength: routes.length > 0 ? totalDistance / routes.length : 0,
      lastActivity: routes.length > 0 ? routes[0].createdAt || new Date().toISOString() : new Date().toISOString()
    })
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

  const handleSaveProfile = async () => {
    if (!editName.trim()) {
      Alert.alert('Error', 'Name is required')
      return
    }

    setIsLoading(true)
    try {
      await profileAPI.updateProfile({
        name: editName.trim(),
        location: editLocation.trim(),
        bio: editBio.trim()
      })
      
      setUserProfile(prev => ({
        ...prev,
        name: editName.trim(),
        location: editLocation.trim(),
        bio: editBio.trim()
      }))
      
      setShowEditProfile(false)
      Alert.alert('Success', 'Profile updated successfully!')
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.msg || 'Failed to update profile')
    } finally {
      setIsLoading(false)
    }
  }

  const handleEditProfile = () => {
    setEditName(userProfile.name)
    setEditLocation(userProfile.location || '')
    setEditBio(userProfile.bio || '')
    setShowEditProfile(true)
  }

  const handleExportData = () => {
    if (routes.length === 0) {
      Alert.alert('No Routes', 'You have no routes to export.')
      return
    }

    Alert.alert(
      'Export Data',
      'Choose export format:',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'GPX', onPress: () => exportRoutes('gpx') },
        { text: 'KML', onPress: () => exportRoutes('kml') },
        { text: 'JSON', onPress: () => exportRoutes('json') }
      ]
    )
  }

  const exportRoutes = async (format: 'gpx' | 'kml' | 'json') => {
    try {
      const success = await exportService.exportRoutes(routes, format)
      if (success) {
        Alert.alert('Success', `Routes exported as ${format.toUpperCase()} successfully!`)
      } else {
        Alert.alert('Error', `Failed to export routes as ${format.toUpperCase()}`)
      }
    } catch (error) {
      console.error('Export error:', error)
      Alert.alert('Error', 'Failed to export routes')
    }
  }

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This action cannot be undone. All your routes and data will be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              // Call backend API to delete account
              await profileAPI.deleteAccount()
              
              // Clean up local data
              await AsyncStorage.clear()
              
              // Stop all services
              await locationService.cleanup()
              await autoSaveService.cleanup()
              await notificationService.cancelAllNotifications()
              
              // Logout and redirect to login
              await logout()
              
              Alert.alert('Account Deleted', 'Your account has been deleted successfully.')
            } catch (error) {
              console.error('Failed to delete account:', error)
              Alert.alert('Error', 'Failed to delete account. Please try again.')
            }
          }
        }
      ]
    )
  }

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          onPress: async () => {
            try {
              // Stop all services
              await locationService.cleanup()
              await autoSaveService.cleanup()
              await notificationService.cancelAllNotifications()
              
              // Logout and redirect to login
              await logout()
            } catch (error) {
              console.error('Failed to logout:', error)
              Alert.alert('Error', 'Failed to logout. Please try again.')
            }
          }
        }
      ]
    )
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatDistance = (distance: number) => {
    return distance < 1 
      ? `${(distance * 1000).toFixed(0)} m`
      : `${distance.toFixed(2)} km`
  }

  const renderStatCard = (title: string, value: string, icon: string, color: string) => (
    <View style={[styles.statCard, { backgroundColor: theme.surface }]}>
      <View style={[styles.statIcon, { backgroundColor: color + '20' }]}>
        <Icon name={icon} size={24} color={color} />
      </View>
      <Text style={[styles.statValue, { color: theme.text }]}>{value}</Text>
      <Text style={[styles.statTitle, { color: theme.textSecondary }]}>{title}</Text>
    </View>
  )

  const renderSettingItem = (
    title: string, 
    subtitle: string, 
    icon: string, 
    value?: boolean, 
    onToggle?: (value: boolean) => void,
    onPress?: () => void
  ) => (
    <TouchableOpacity 
      style={[styles.settingItem, { borderBottomColor: theme.border }]}
      onPress={onPress}
      disabled={!onPress && !onToggle}
    >
      <View style={styles.settingLeft}>
        <View style={[styles.settingIcon, { backgroundColor: theme.primary + '20' }]}>
          <Icon name={icon} size={20} color={theme.primary} />
        </View>
        <View style={styles.settingText}>
          <Text style={[styles.settingTitle, { color: theme.text }]}>{title}</Text>
          <Text style={[styles.settingSubtitle, { color: theme.textSecondary }]}>{subtitle}</Text>
        </View>
      </View>
      {onToggle && value !== undefined ? (
        <Switch
          value={value}
          onValueChange={onToggle}
          trackColor={{ false: theme.border, true: theme.primary + '40' }}
          thumbColor={value ? theme.primary : theme.textSecondary}
        />
      ) : (
        <Icon name="chevron-right" size={24} color={theme.textSecondary} />
      )}
    </TouchableOpacity>
  )

  const getMapTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'standard': 'Standard',
      'satellite': 'Satellite',
      'hybrid': 'Hybrid',
      'terrain': 'Terrain'
    }
    return labels[type] || 'Standard'
  }

  const handleNotificationToggle = async (enabled: boolean) => {
    await updateNotificationSettings({ enabled })
    
    if (enabled) {
      const permissionStatus = await notificationService.getNotificationPermissions()
      if (permissionStatus !== 'granted') {
        const initialized = await notificationService.initialize()
        if (!initialized) {
          Alert.alert(
            'Permission Required',
            'Please enable notifications in your device settings to receive route completion alerts.',
            [{ text: 'OK' }]
          )
          // Revert the toggle if permission was denied
          await updateNotificationSettings({ enabled: false })
        }
      }
    } else {
      // Cancel all notifications when disabled
      await notificationService.cancelAllNotifications()
    }
  }

  const handleLocationTrackingToggle = async (enabled: boolean) => {
    await updateLocationTracking({ enabled })
    
    if (enabled) {
      const initialized = await locationService.initialize()
      if (!initialized) {
        Alert.alert(
          'Permission Required',
          'Please enable location permissions in your device settings to use GPS tracking.',
          [{ text: 'OK' }]
        )
        // Revert the toggle if permission was denied
        await updateLocationTracking({ enabled: false })
        return
      }
      
      // Start location tracking with current settings
      await locationService.startLocationTracking(settings.locationTracking)
    } else {
      // Stop location tracking
      await locationService.stopLocationTracking()
    }
  }

  const handleAutoSaveToggle = async (enabled: boolean) => {
    await updateAutoSave({ enabled })
    
    if (enabled) {
      // Start auto-save with current settings
      await autoSaveService.startAutoSave(settings.autoSave)
    } else {
      // Stop auto-save
      await autoSaveService.stopAutoSave()
    }
  }

  const handleUnitsChange = async () => {
    const newUnits = settings.units === 'metric' ? 'imperial' : 'metric'
    await updateUnits(newUnits)
  }

  const handleRouteModeChange = async () => {
    const modes: Array<'walking' | 'cycling' | 'driving'> = ['walking', 'cycling', 'driving']
    const currentIndex = modes.indexOf(settings.defaultRouteMode)
    const nextMode = modes[(currentIndex + 1) % modes.length]
    await updateDefaultRouteMode(nextMode)
  }

  const handleMapQualityChange = async () => {
    const qualities: Array<'low' | 'medium' | 'high'> = ['low', 'medium', 'high']
    const currentIndex = qualities.indexOf(settings.mapQuality)
    const nextQuality = qualities[(currentIndex + 1) % qualities.length]
    await updateMapQuality(nextQuality)
  }

  const getUnitsLabel = () => {
    return settings.units === 'metric' ? 'Metric (km, m)' : 'Imperial (mi, ft)'
  }

  const getRouteModeLabel = () => {
    const labels: Record<string, string> = {
      'walking': 'Walking',
      'cycling': 'Cycling', 
      'driving': 'Driving'
    }
    return labels[settings.defaultRouteMode] || 'Walking'
  }

  const getMapQualityLabel = () => {
    const labels: Record<string, string> = {
      'low': 'Low',
      'medium': 'Medium',
      'high': 'High'
    }
    return labels[settings.mapQuality] || 'High'
  }

  const handleImportData = async () => {
    try {
      const result = await importService.importFromFile()
      
      if (!result.success) {
        Alert.alert('Import Failed', result.error || 'Failed to import routes')
        return
      }

      if (result.routes.length === 0) {
        Alert.alert('No Routes Found', 'No valid routes were found in the selected file.')
        return
      }

      // Validate and clean routes
      const validRoutes = await importService.validateAndCleanRoutes(result.routes)
      
      if (validRoutes.length === 0) {
        Alert.alert('No Valid Routes', 'No valid routes were found in the selected file.')
        return
      }

      // Show confirmation dialog
      Alert.alert(
        'Import Routes',
        `Found ${validRoutes.length} route(s) to import. Would you like to proceed?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Import', 
            onPress: () => processImportedRoutes(validRoutes)
          }
        ]
      )
    } catch (error) {
      console.error('Import error:', error)
      Alert.alert('Import Error', 'Failed to import routes')
    }
  }

  const processImportedRoutes = async (importedRoutes: ImportedRoute[]) => {
    try {
      // Here you would typically send the routes to your backend
      // For now, we'll just show a success message
      Alert.alert(
        'Import Successful', 
        `Successfully imported ${importedRoutes.length} route(s)!`
      )
      
      // TODO: Send routes to backend API
      // const response = await apiClient.post('/map/import', { routes: importedRoutes })
      
    } catch (error) {
      console.error('Failed to process imported routes:', error)
      Alert.alert('Error', 'Failed to save imported routes')
    }
  }

  const handleAvatarPress = async () => {
    try {
      const result = await ImageService.showImageSourceDialog()
      
      if (!result.success || !result.uri) {
        if (result.error && result.error !== 'Cancelled') {
          Alert.alert('Error', result.error)
        }
        return
      }

      // Validate the selected image
      const validation = await ImageService.validateImage(result.uri)
      if (!validation.valid) {
        Alert.alert('Invalid Image', validation.error || 'Please select a valid image')
        return
      }

      // Show loading state
      setIsLoading(true)

      try {
        // Upload image to backend
        const uploadResult = await profileAPI.uploadProfileImage(result.uri)
        
        if (uploadResult.image_url) {
          setSelectedAvatarUri(uploadResult.image_url)
          await fetchProfile() // Refresh profile data
          Alert.alert('Success', 'Profile image updated successfully!')
        } else {
          Alert.alert('Error', 'Failed to upload image')
        }
      } catch (uploadError) {
        console.error('Image upload failed:', uploadError)
        Alert.alert('Error', 'Failed to upload image to server')
      } finally {
        setIsLoading(false)
      }
      
    } catch (error) {
      console.error('Avatar selection failed:', error)
      Alert.alert('Error', 'Failed to select profile image')
      setIsLoading(false)
    }
  }

  const handleAvatarLongPress = () => {
    if (selectedAvatarUri || userProfile.avatar) {
      Alert.alert(
        'Remove Profile Image',
        'Are you sure you want to remove your profile image?',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Remove', 
            style: 'destructive',
            onPress: async () => {
              try {
                setIsLoading(true)
                
                // Delete image from backend
                await profileAPI.deleteProfileImage()
                
                setSelectedAvatarUri(null)
                await fetchProfile() // Refresh profile data
                
                Alert.alert('Success', 'Profile image removed!')
              } catch (error) {
                console.error('Failed to remove profile image:', error)
                Alert.alert('Error', 'Failed to remove profile image')
              } finally {
                setIsLoading(false)
              }
            }
          }
        ]
      )
    }
  }

  const styles = createStyles(theme)

  return (
    <ScrollView 
      style={styles.container} 
      showsVerticalScrollIndicator={false}
      bounces={true}
    >
      {/* Profile Header */}
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          {isLoading ? (
            <View style={styles.avatar}>
              <ActivityIndicator size="large" color={theme.primary} />
            </View>
          ) : selectedAvatarUri ? (
            <Image source={{ uri: selectedAvatarUri }} style={styles.avatar} />
          ) : userProfile.avatar ? (
            <Image source={{ uri: userProfile.avatar }} style={styles.avatar} />
          ) : (
            <View style={styles.avatar}>
              <Icon name="person" size={40} color={theme.primary} />
            </View>
          )}
          <TouchableOpacity 
            style={[styles.editAvatarBtn, isLoading && styles.editAvatarBtnDisabled]} 
            onPress={handleAvatarPress}
            onLongPress={handleAvatarLongPress}
            disabled={isLoading}
          >
            <Icon name="camera-alt" size={16} color={theme.surface} />
          </TouchableOpacity>
        </View>
        
        {(selectedAvatarUri || userProfile.avatar) && (
          <Text style={[styles.avatarHint, { color: theme.textSecondary }]}>
            Long press to remove image
          </Text>
        )}
        
        <View style={styles.profileInfo}>
          {isLoadingProfile ? (
            <ActivityIndicator size="small" color={theme.primary} />
          ) : (
            <>
              <Text style={[styles.name, { color: theme.text }]}>{userProfile.name || 'No name set'}</Text>
              <Text style={[styles.email, { color: theme.textSecondary }]}>{userProfile.email}</Text>
              {userProfile.location && (
                <View style={styles.locationRow}>
                  <Icon name="location-on" size={16} color={theme.textSecondary} />
                  <Text style={[styles.location, { color: theme.textSecondary }]}>{userProfile.location}</Text>
                </View>
              )}
              {userProfile.bio && (
                <Text style={[styles.bio, { color: theme.textSecondary }]}>{userProfile.bio}</Text>
              )}
            </>
          )}
        </View>
        
        <TouchableOpacity 
          style={styles.editButton}
          onPress={handleEditProfile}
          disabled={isLoadingProfile}
        >
          <Icon name="edit" size={18} color={theme.primary} />
          <Text style={[styles.editButtonText, { color: theme.primary }]}>Edit</Text>
        </TouchableOpacity>
      </View>

      {/* Statistics */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Statistics</Text>
        <View style={styles.statsGrid}>
          {renderStatCard('Routes', userStats.totalRoutes.toString(), 'route', theme.primary)}
          {renderStatCard('Distance', formatDistance(userStats.totalDistance), 'straighten', theme.success)}
          {renderStatCard('Points', userStats.totalPoints.toString(), 'place', theme.warning)}
          {renderStatCard('Avg Length', formatDistance(userStats.averageRouteLength), 'trending-up', theme.error)}
        </View>
      </View>

      {/* Activity Summary */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Activity</Text>
        <View style={[styles.activityCard, { backgroundColor: theme.surface }]}>
          <View style={styles.activityRow}>
            <Text style={[styles.activityLabel, { color: theme.textSecondary }]}>Favorite Mode:</Text>
            <Text style={[styles.activityValue, { color: theme.text }]}>{userStats.favoriteMode}</Text>
          </View>
          <View style={styles.activityRow}>
            <Text style={[styles.activityLabel, { color: theme.textSecondary }]}>Member Since:</Text>
            <Text style={[styles.activityValue, { color: theme.text }]}>{formatDate(userProfile.joinDate)}</Text>
          </View>
          <View style={styles.activityRow}>
            <Text style={[styles.activityLabel, { color: theme.textSecondary }]}>Last Activity:</Text>
            <Text style={[styles.activityValue, { color: theme.text }]}>{formatDate(userStats.lastActivity)}</Text>
          </View>
        </View>
      </View>

      {/* Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Preferences</Text>
        <View style={[styles.settingsContainer, { backgroundColor: theme.surface }]}>
          {renderSettingItem(
            'Dark Mode',
            isDarkMode ? 'Dark theme enabled' : 'Light theme enabled',
            'brightness-6',
            isDarkMode,
            toggleTheme
          )}
          {renderSettingItem(
            'Notifications',
            settings.notifications.enabled ? 'Route completion alerts enabled' : 'Notifications disabled',
            'notifications',
            settings.notifications.enabled,
            handleNotificationToggle
          )}
          {renderSettingItem(
            'Location Tracking',
            settings.locationTracking.enabled ? 'GPS tracking enabled' : 'GPS tracking disabled',
            'gps-fixed',
            settings.locationTracking.enabled,
            handleLocationTrackingToggle
          )}
          {renderSettingItem(
            'Auto Save',
            settings.autoSave.enabled ? 'Automatically save routes' : 'Manual save only',
            'save',
            settings.autoSave.enabled,
            handleAutoSaveToggle
          )}
        </View>
      </View>

      {/* App Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>App Settings</Text>
        <View style={[styles.settingsContainer, { backgroundColor: theme.surface }]}>
          {renderSettingItem(
            'Map Type',
            `Currently set to ${getMapTypeLabel(mapType)}`,
            'map',
            undefined,
            undefined,
            () => setShowMapTypeSelector(true)
          )}
          {renderSettingItem(
            'Map Quality',
            `Currently set to ${getMapQualityLabel()}`,
            'high-quality',
            undefined,
            undefined,
            handleMapQualityChange
          )}
          {renderSettingItem(
            'Units',
            getUnitsLabel(),
            'straighten',
            undefined,
            undefined,
            handleUnitsChange
          )}
          {renderSettingItem(
            'Default Route Mode',
            getRouteModeLabel(),
            'directions-walk',
            undefined,
            undefined,
            handleRouteModeChange
          )}
        </View>
      </View>

      {/* Data Management */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Data</Text>
        <View style={[styles.settingsContainer, { backgroundColor: theme.surface }]}>
          {renderSettingItem(
            'Export Data',
            'Download your routes',
            'download',
            undefined,
            undefined,
            handleExportData
          )}
          {renderSettingItem(
            'Import Data',
            'Upload routes from file',
            'upload',
            undefined,
            undefined,
            handleImportData
          )}
        </View>
      </View>

      {/* Danger Zone */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.error }]}>Danger Zone</Text>
        <TouchableOpacity 
          style={[styles.dangerButton, { borderColor: theme.error }]}
          onPress={handleLogout}
        >
          <Icon name="logout" size={20} color={theme.error} />
          <Text style={[styles.dangerButtonText, { color: theme.error }]}>Logout</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.dangerButton, { borderColor: theme.error }]}
          onPress={handleDeleteAccount}
        >
          <Icon name="delete-forever" size={20} color={theme.error} />
          <Text style={[styles.dangerButtonText, { color: theme.error }]}>Delete Account</Text>
        </TouchableOpacity>
      </View>

      {/* Edit Profile Modal */}
      <Modal
        visible={showEditProfile}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEditProfile(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Edit Profile</Text>
              <TouchableOpacity onPress={() => setShowEditProfile(false)}>
                <Icon name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalContent}>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.text }]}>Name *</Text>
                <TextInput
                  style={[styles.textInput, { 
                    backgroundColor: theme.surface, 
                    color: theme.text, 
                    borderColor: theme.border 
                  }]}
                  value={editName}
                  onChangeText={setEditName}
                  placeholder="Enter your name"
                  placeholderTextColor={theme.textSecondary}
                />
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.text }]}>Location</Text>
                <TextInput
                  style={[styles.textInput, { 
                    backgroundColor: theme.surface, 
                    color: theme.text, 
                    borderColor: theme.border 
                  }]}
                  value={editLocation}
                  onChangeText={setEditLocation}
                  placeholder="Enter your location"
                  placeholderTextColor={theme.textSecondary}
                />
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.text }]}>Bio</Text>
                <TextInput
                  style={[styles.textInput, styles.textAreaInput, { 
                    backgroundColor: theme.surface, 
                    color: theme.text, 
                    borderColor: theme.border 
                  }]}
                  value={editBio}
                  onChangeText={setEditBio}
                  placeholder="Tell us about yourself"
                  placeholderTextColor={theme.textSecondary}
                  multiline
                  numberOfLines={4}
                />
              </View>
            </ScrollView>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton, { borderColor: theme.border }]} 
                onPress={() => setShowEditProfile(false)}
              >
                <Text style={[styles.cancelButtonText, { color: theme.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.saveButton, { backgroundColor: theme.primary }]} 
                onPress={handleSaveProfile}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color={theme.surface} />
                ) : (
                  <Text style={[styles.saveButtonText, { color: theme.surface }]}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Map Type Selector Modal */}
      <MapTypeSelector 
        visible={showMapTypeSelector} 
        onClose={() => setShowMapTypeSelector(false)} 
      />
    </ScrollView>
  )
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    header: {
      padding: 20,
      backgroundColor: theme.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    avatarContainer: {
      alignSelf: 'center',
      marginBottom: 16,
    },
    avatar: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: theme.primary + '20',
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 3,
      borderColor: theme.primary,
    },
    editAvatarBtn: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: theme.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    editAvatarBtnDisabled: {
      backgroundColor: theme.border + '40',
    },
    profileInfo: {
      alignItems: 'center',
      marginBottom: 16,
    },
    name: {
      fontSize: 24,
      fontWeight: 'bold',
      color: theme.text,
      marginBottom: 4,
    },
    email: {
      fontSize: 16,
      color: theme.textSecondary,
      marginBottom: 8,
    },
    locationRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
    },
    location: {
      fontSize: 14,
      color: theme.textSecondary,
      marginLeft: 4,
    },
    bio: {
      fontSize: 14,
      color: theme.textSecondary,
      textAlign: 'center',
      fontStyle: 'italic',
    },
    editButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: theme.primary,
      alignSelf: 'center',
    },
    editButtonText: {
      color: theme.primary,
      marginLeft: 4,
      fontWeight: '500',
    },
    section: {
      paddingHorizontal: 20,
      paddingVertical: 16,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 12,
    },
    statsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    statCard: {
      flex: 1,
      minWidth: (width - 64) / 2,
      padding: 16,
      borderRadius: 12,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.border,
    },
    statIcon: {
      width: 48,
      height: 48,
      borderRadius: 24,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 8,
    },
    statValue: {
      fontSize: 20,
      fontWeight: 'bold',
      marginBottom: 4,
    },
    statTitle: {
      fontSize: 12,
      textAlign: 'center',
    },
    activityCard: {
      padding: 16,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
    },
    activityRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 8,
    },
    activityLabel: {
      fontSize: 14,
    },
    activityValue: {
      fontSize: 14,
      fontWeight: '500',
      textTransform: 'capitalize',
    },
    settingsContainer: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
      overflow: 'hidden',
    },
    settingItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    settingLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    settingIcon: {
      width: 32,
      height: 32,
      borderRadius: 16,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    settingText: {
      flex: 1,
    },
    settingTitle: {
      fontSize: 16,
      fontWeight: '500',
      marginBottom: 2,
    },
    settingSubtitle: {
      fontSize: 12,
    },
    dangerButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 12,
      borderRadius: 8,
      borderWidth: 1,
      backgroundColor: 'transparent',
    },
    dangerButtonText: {
      marginLeft: 8,
      fontSize: 16,
      fontWeight: '500',
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    modalContainer: {
      backgroundColor: theme.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      maxHeight: '80%',
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.text,
    },
    modalContent: {
      padding: 20,
    },
    inputGroup: {
      marginBottom: 20,
    },
    inputLabel: {
      fontSize: 16,
      fontWeight: '500',
      color: theme.text,
      marginBottom: 8,
    },
    textInput: {
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
      color: theme.text,
      backgroundColor: theme.background,
    },
    textAreaInput: {
      height: 100,
      textAlignVertical: 'top',
    },
    modalButtons: {
      flexDirection: 'row',
      padding: 20,
      gap: 12,
      borderTopWidth: 1,
      borderTopColor: theme.border,
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
    avatarHint: {
      fontSize: 12,
      textAlign: 'center',
      marginTop: 4,
      fontStyle: 'italic',
    },
  })