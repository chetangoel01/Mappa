import { create } from "zustand"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { apiClient } from "../services/api"

interface UserSettings {
  notifications: {
    enabled: boolean
    routeCompletion: boolean
    newFeatures: boolean
    reminders: boolean
  }
  locationTracking: {
    enabled: boolean
    backgroundTracking: boolean
  }
  autoSave: {
    enabled: boolean
    interval: number // minutes
  }
  units: 'metric' | 'imperial'
  defaultRouteMode: 'walking' | 'cycling' | 'driving'
  mapQuality: 'low' | 'medium' | 'high'
}

interface SettingsState {
  settings: UserSettings
  isLoading: boolean
  isInitialized: boolean
  
  // Actions
  initializeSettings: () => Promise<void>
  updateNotificationSettings: (settings: Partial<UserSettings['notifications']>) => Promise<void>
  updateLocationTracking: (settings: Partial<UserSettings['locationTracking']>) => Promise<void>
  updateAutoSave: (settings: Partial<UserSettings['autoSave']>) => Promise<void>
  updateUnits: (units: UserSettings['units']) => Promise<void>
  updateDefaultRouteMode: (mode: UserSettings['defaultRouteMode']) => Promise<void>
  updateMapQuality: (quality: UserSettings['mapQuality']) => Promise<void>
  
  // Legacy API methods
  fetchSettings: () => Promise<void>
  updateSetting: (key: string, value: any) => void
  saveSettings: () => Promise<void>
}

const DEFAULT_SETTINGS: UserSettings = {
  notifications: {
    enabled: true,
    routeCompletion: true,
    newFeatures: true,
    reminders: false
  },
  locationTracking: {
    enabled: true,
    backgroundTracking: false
  },
  autoSave: {
    enabled: true,
    interval: 5
  },
  units: 'metric',
  defaultRouteMode: 'walking',
  mapQuality: 'high'
}

const SETTINGS_STORAGE_KEY = "@mappa_user_settings"

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: DEFAULT_SETTINGS,
  isLoading: false,
  isInitialized: false,

  initializeSettings: async () => {
    set({ isLoading: true })
    try {
      const storedSettings = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY)
      if (storedSettings) {
        const parsedSettings = JSON.parse(storedSettings)
        set({ 
          settings: { ...DEFAULT_SETTINGS, ...parsedSettings },
          isInitialized: true 
        })
      } else {
        set({ 
          settings: DEFAULT_SETTINGS,
          isInitialized: true 
        })
        // Save default settings
        await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(DEFAULT_SETTINGS))
      }
    } catch (error) {
      console.error("Failed to initialize settings:", error)
      set({ 
        settings: DEFAULT_SETTINGS,
        isInitialized: true 
      })
    } finally {
      set({ isLoading: false })
    }
  },

  updateNotificationSettings: async (newSettings) => {
    const { settings } = get()
    const updatedSettings = {
      ...settings,
      notifications: { ...settings.notifications, ...newSettings }
    }
    set({ settings: updatedSettings })
    
    try {
      await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updatedSettings))
      // TODO: Update server settings if needed
    } catch (error) {
      console.error("Failed to save notification settings:", error)
    }
  },

  updateLocationTracking: async (newSettings) => {
    const { settings } = get()
    const updatedSettings = {
      ...settings,
      locationTracking: { ...settings.locationTracking, ...newSettings }
    }
    set({ settings: updatedSettings })
    
    try {
      await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updatedSettings))
    } catch (error) {
      console.error("Failed to save location tracking settings:", error)
    }
  },

  updateAutoSave: async (newSettings) => {
    const { settings } = get()
    const updatedSettings = {
      ...settings,
      autoSave: { ...settings.autoSave, ...newSettings }
    }
    set({ settings: updatedSettings })
    
    try {
      await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updatedSettings))
    } catch (error) {
      console.error("Failed to save auto save settings:", error)
    }
  },

  updateUnits: async (units) => {
    const { settings } = get()
    const updatedSettings = { ...settings, units }
    set({ settings: updatedSettings })
    
    try {
      await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updatedSettings))
    } catch (error) {
      console.error("Failed to save units setting:", error)
    }
  },

  updateDefaultRouteMode: async (mode) => {
    const { settings } = get()
    const updatedSettings = { ...settings, defaultRouteMode: mode }
    set({ settings: updatedSettings })
    
    try {
      await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updatedSettings))
    } catch (error) {
      console.error("Failed to save default route mode:", error)
    }
  },

  updateMapQuality: async (quality) => {
    const { settings } = get()
    const updatedSettings = { ...settings, mapQuality: quality }
    set({ settings: updatedSettings })
    
    try {
      await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updatedSettings))
    } catch (error) {
      console.error("Failed to save map quality setting:", error)
    }
  },

  // Legacy methods for backward compatibility
  fetchSettings: async () => {
    set({ isLoading: true })
    try {
      const response = await apiClient.get("/users/settings")
      set({ settings: { ...DEFAULT_SETTINGS, ...response.data } })
    } catch (error) {
      console.error("Failed to fetch settings:", error)
    } finally {
      set({ isLoading: false })
    }
  },

  updateSetting: (key, value) => {
    set(state => ({ 
      settings: { ...state.settings, [key]: value } 
    }))
  },

  saveSettings: async () => {
    const { settings } = get()
    set({ isLoading: true })
    try {
      await apiClient.post("/users/settings", settings)
      await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings))
    } catch (error) {
      console.error("Failed to save settings:", error)
    } finally {
      set({ isLoading: false })
    }
  },
}))
