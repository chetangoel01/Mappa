import { create } from "zustand"
import AsyncStorage from "@react-native-async-storage/async-storage"

export type MapType = "standard" | "satellite" | "hybrid" | "terrain"

interface MapSettingsState {
  mapType: MapType
  showUserLocation: boolean
  showCompass: boolean
  showScale: boolean
  showBuildings: boolean
  showTraffic: boolean
  setMapType: (mapType: MapType) => Promise<void>
  setShowUserLocation: (show: boolean) => Promise<void>
  setShowCompass: (show: boolean) => Promise<void>
  setShowScale: (show: boolean) => Promise<void>
  setShowBuildings: (show: boolean) => Promise<void>
  setShowTraffic: (show: boolean) => Promise<void>
  loadSettings: () => Promise<void>
  saveSettings: () => Promise<void>
}

const MAP_SETTINGS_KEY = "@mappa_map_settings"

export const useMapSettingsStore = create<MapSettingsState>((set, get) => ({
  mapType: "standard",
  showUserLocation: true,
  showCompass: true,
  showScale: true,
  showBuildings: true,
  showTraffic: false,

  setMapType: async (mapType: MapType) => {
    set({ mapType })
    await get().saveSettings()
  },

  setShowUserLocation: async (show: boolean) => {
    set({ showUserLocation: show })
    await get().saveSettings()
  },

  setShowCompass: async (show: boolean) => {
    set({ showCompass: show })
    await get().saveSettings()
  },

  setShowScale: async (show: boolean) => {
    set({ showScale: show })
    await get().saveSettings()
  },

  setShowBuildings: async (show: boolean) => {
    set({ showBuildings: show })
    await get().saveSettings()
  },

  setShowTraffic: async (show: boolean) => {
    set({ showTraffic: show })
    await get().saveSettings()
  },

  loadSettings: async () => {
    try {
      const settings = await AsyncStorage.getItem(MAP_SETTINGS_KEY)
      if (settings) {
        const parsedSettings = JSON.parse(settings)
        set({
          mapType: parsedSettings.mapType || "standard",
          showUserLocation: parsedSettings.showUserLocation !== false,
          showCompass: parsedSettings.showCompass !== false,
          showScale: parsedSettings.showScale !== false,
          showBuildings: parsedSettings.showBuildings !== false,
          showTraffic: parsedSettings.showTraffic || false,
        })
      }
    } catch (error) {
      console.error("Failed to load map settings:", error)
    }
  },

  saveSettings: async () => {
    try {
      const { mapType, showUserLocation, showCompass, showScale, showBuildings, showTraffic } = get()
      const settings = {
        mapType,
        showUserLocation,
        showCompass,
        showScale,
        showBuildings,
        showTraffic,
      }
      await AsyncStorage.setItem(MAP_SETTINGS_KEY, JSON.stringify(settings))
    } catch (error) {
      console.error("Failed to save map settings:", error)
    }
  },
})) 