import AsyncStorage from '@react-native-async-storage/async-storage'
import { useMapStore } from '../store/mapStore'

export interface AutoSaveSettings {
  enabled: boolean
  interval: number // minutes
}

interface AutoSaveData {
  currentShape: Array<{ latitude: number; longitude: number }>
  timestamp: number
  routeName?: string
}

class AutoSaveService {
  private intervalId: NodeJS.Timeout | null = null
  private isActive = false

  async startAutoSave(settings: AutoSaveSettings) {
    if (!settings.enabled) {
      await this.stopAutoSave()
      return
    }

    if (this.isActive) {
      await this.stopAutoSave()
    }

    this.isActive = true
    const intervalMs = settings.interval * 60 * 1000 // Convert minutes to milliseconds

    this.intervalId = setInterval(async () => {
      await this.performAutoSave()
    }, intervalMs)

    console.log(`Auto-save started with ${settings.interval} minute interval`)
  }

  async stopAutoSave() {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
    this.isActive = false
    console.log('Auto-save stopped')
  }

  private async performAutoSave() {
    try {
      // Get current map state from the store
      const mapStore = useMapStore.getState()
      const { currentShape, isDrawing } = mapStore

      // Only auto-save if we're currently drawing and have points
      if (!isDrawing || currentShape.length < 2) {
        return
      }

      // Create auto-save data
      const autoSaveData: AutoSaveData = {
        currentShape: [...currentShape],
        timestamp: Date.now(),
        routeName: `Auto-saved Route ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`
      }

      // Save to local storage
      const autoSaveKey = `@mappa_auto_save_${Date.now()}`
      await AsyncStorage.setItem(autoSaveKey, JSON.stringify(autoSaveData))

      // Keep only the last 5 auto-saves
      await this.cleanupOldAutoSaves()

      console.log('Auto-save completed:', autoSaveData.routeName)
    } catch (error) {
      console.error('Auto-save failed:', error)
    }
  }

  private async cleanupOldAutoSaves() {
    try {
      const keys = await AsyncStorage.getAllKeys()
      const autoSaveKeys = keys.filter(key => key.startsWith('@mappa_auto_save_'))
      
      if (autoSaveKeys.length > 5) {
        // Sort by timestamp (newest first)
        const sortedKeys = autoSaveKeys.sort().reverse()
        const keysToDelete = sortedKeys.slice(5) // Keep only the 5 most recent
        
        await AsyncStorage.multiRemove(keysToDelete)
        console.log(`Cleaned up ${keysToDelete.length} old auto-saves`)
      }
    } catch (error) {
      console.error('Failed to cleanup old auto-saves:', error)
    }
  }

  async getAutoSaves(): Promise<AutoSaveData[]> {
    try {
      const keys = await AsyncStorage.getAllKeys()
      const autoSaveKeys = keys.filter(key => key.startsWith('@mappa_auto_save_'))
      
      const autoSaves: AutoSaveData[] = []
      
      for (const key of autoSaveKeys) {
        const data = await AsyncStorage.getItem(key)
        if (data) {
          autoSaves.push(JSON.parse(data))
        }
      }

      // Sort by timestamp (newest first)
      return autoSaves.sort((a, b) => b.timestamp - a.timestamp)
    } catch (error) {
      console.error('Failed to get auto-saves:', error)
      return []
    }
  }

  async restoreAutoSave(timestamp: number): Promise<AutoSaveData | null> {
    try {
      const autoSaves = await this.getAutoSaves()
      const autoSave = autoSaves.find(save => save.timestamp === timestamp)
      return autoSave || null
    } catch (error) {
      console.error('Failed to restore auto-save:', error)
      return null
    }
  }

  async deleteAutoSave(timestamp: number): Promise<boolean> {
    try {
      const keys = await AsyncStorage.getAllKeys()
      const autoSaveKeys = keys.filter(key => key.startsWith('@mappa_auto_save_'))
      
      for (const key of autoSaveKeys) {
        const data = await AsyncStorage.getItem(key)
        if (data) {
          const autoSave: AutoSaveData = JSON.parse(data)
          if (autoSave.timestamp === timestamp) {
            await AsyncStorage.removeItem(key)
            return true
          }
        }
      }
      
      return false
    } catch (error) {
      console.error('Failed to delete auto-save:', error)
      return false
    }
  }

  async clearAllAutoSaves(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys()
      const autoSaveKeys = keys.filter(key => key.startsWith('@mappa_auto_save_'))
      await AsyncStorage.multiRemove(autoSaveKeys)
      console.log('All auto-saves cleared')
    } catch (error) {
      console.error('Failed to clear auto-saves:', error)
    }
  }

  isAutoSaveActive() {
    return this.isActive
  }

  async cleanup() {
    await this.stopAutoSave()
  }
}

export const autoSaveService = new AutoSaveService() 