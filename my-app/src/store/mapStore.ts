import { create } from "zustand";
import { apiClient } from "../services/api";
import { produce } from 'immer';

interface Coordinate {
  latitude: number
  longitude: number
}

interface Route {
  id: string
  name: string
  coordinates: Coordinate[]
  createdAt: string
  snappedCoordinates?: Coordinate[]
  mode?: string
  exportUrl?: string
  directions?: any[] // ORS directions added - turn-by-turn instructions
}

interface MapState {
  currentShape: Coordinate[]
  snappedRoute: Coordinate[]
  exportUrl: string | null
  routes: Route[]
  isDrawing: boolean
  isLoading: boolean
  addCoordinate: (coordinate: Coordinate) => void
  clearShape: () => void
  submitShape: (name?: string) => Promise<string | undefined>
  saveSnappedRoute: (name: string) => Promise<string | undefined>
  fetchRoutes: () => Promise<void>
  fetchRouteById: (id: string) => Promise<Route | null>
  setDrawingMode: (isDrawing: boolean) => void
  deleteRoute: (routeId: string) => Promise<boolean>
  updateRoute: (routeId: string, updates: { name?: string; mode?: string }) => Promise<any>
  clearExportUrl: () => void
  snapShape: () => Promise<string | undefined>
}

export const useMapStore = create<MapState>((set, get) => ({
  currentShape: [],
  snappedRoute: [],
  exportUrl: null,
  routes: [],
  isDrawing: false,
  isLoading: false,

  addCoordinate: (coordinate) => set(produce((state) => {
    state.currentShape.push(coordinate)
  })),

  clearShape: () => {
    set({ currentShape: [], snappedRoute: [], exportUrl: null })
  },

  clearExportUrl: () => {
    set({ exportUrl: null })
  },

  snapShape: async (): Promise<string | undefined> => {
    const { currentShape } = get()
    if (currentShape.length < 2) return

    set({ isLoading: true })
    try {
      // Convert {latitude, longitude} to [lng, lat] arrays for backend
      const geometry = currentShape.map(coord => [coord.longitude, coord.latitude])
      const response = await apiClient.post("/map/snap", {
        geometry,
      })

      console.log("Snapped route response:", response.data)

      // Handle the response - backend returns coordinates as [longitude, latitude] arrays
      let snappedCoordinates = []

      if (response.data.snapped && Array.isArray(response.data.snapped)) {
        // Convert [lng, lat] arrays to {latitude, longitude} objects
        snappedCoordinates = response.data.snapped.map((coord: [number, number]) => ({
          latitude: coord[1], // lat is second element
          longitude: coord[0], // lng is first element
        }))
      } else if (response.data.coordinates) {
        // Fallback to coordinates if snapped is not available
        snappedCoordinates = response.data.coordinates
      }

      console.log("Processed snapped coordinates:", snappedCoordinates.slice(0, 5)) // Log first 5 for debugging
      
      // Store the export URL from the backend response
      const exportUrl = response.data.export_url || null
      
      set({ snappedRoute: snappedCoordinates, exportUrl })
      return undefined // No shape_id since we're not saving to database
    } catch (error) {
      console.error("Failed to snap route:", error)
      // TODO: Show error message to user
    } finally {
      set({ isLoading: false })
    }
  },

  submitShape: async (name?: string): Promise<string | undefined> => {
    const { currentShape } = get()
    if (currentShape.length < 2) return

    set({ isLoading: true })
    try {
      // Convert {latitude, longitude} to [lng, lat] arrays for backend
      const geometry = currentShape.map(coord => [coord.longitude, coord.latitude])
      
      // Use the new /snap-and-save endpoint that does both operations
      const response = await apiClient.post("/map/snap-and-save", {
        geometry,
        name: name || `Route ${new Date().toLocaleDateString()}`,
      })

      console.log("Submit shape response:", response.data)

      // Handle the response - backend returns coordinates as [longitude, latitude] arrays
      let snappedCoordinates = []

      if (response.data.snapped && Array.isArray(response.data.snapped)) {
        // Convert [lng, lat] arrays to {latitude, longitude} objects
        snappedCoordinates = response.data.snapped.map((coord: [number, number]) => ({
          latitude: coord[1], // lat is second element
          longitude: coord[0], // lng is first element
        }))
      } else if (response.data.coordinates) {
        // Fallback to coordinates if snapped is not available
        snappedCoordinates = response.data.coordinates
      }

      console.log("Processed snapped coordinates:", snappedCoordinates.slice(0, 5)) // Log first 5 for debugging
      
      // Store the export URL from the backend response
      const exportUrl = response.data.export_url || null
      
      set({ snappedRoute: snappedCoordinates, exportUrl })
      return response.data.shape_id || response.data.id
    } catch (error) {
      console.error("Failed to submit shape:", error)
      // TODO: Show error message to user
    } finally {
      set({ isLoading: false })
    }
  },

  fetchRoutes: async () => {
    set({ isLoading: true })
    try {
      const response = await apiClient.get("/map/shapes")
      // The backend returns { shapes: [...] }
      const shapes = response.data.shapes || []
      // Map backend shape format to Route[]
      const routes = shapes.map((s: any) => ({
        id: s.id,
        name: s.name || s.mode || `Route ${s.id}`,
        coordinates: (s.original_shape || []).map((coord: [number, number]) => ({
          latitude: coord[1],
          longitude: coord[0],
        })),
        createdAt: s.created_at || '',
        snappedCoordinates: (s.snapped_route || []).map((coord: [number, number]) => ({
          latitude: coord[1],
          longitude: coord[0],
        })),
        mode: s.mode || 'walking',
        exportUrl: s.export_url,
        directions: s.directions || [], // ORS directions added - include directions in routes list
        // Add more fields if needed
      }))
      set({ routes })
    } catch (error) {
      console.error("Failed to fetch routes:", error)
      // TODO: Show error message to user
    } finally {
      set({ isLoading: false })
    }
  },

  fetchRouteById: async (id: string) => {
    try {
      const response = await apiClient.get(`/map/shapes/${id}`)
      const routeData = response.data

      // Convert coordinates from [lng, lat] arrays to {latitude, longitude} objects
      const processedData = {
        id: routeData.id,
        name: routeData.name || routeData.mode || `Route ${routeData.id}`,
        createdAt: routeData.created_at,
        coordinates: (routeData.original_shape || []).map((coord: [number, number]) => ({
          latitude: coord[1],
          longitude: coord[0],
        })),
        snappedCoordinates: (routeData.snapped_route || []).map((coord: [number, number]) => ({
          latitude: coord[1],
          longitude: coord[0],
        })),
        mode: routeData.mode,
        user_id: routeData.user_id,
        exportUrl: routeData.export_url,
        directions: routeData.directions || [], // ORS directions added - include directions in response
      }

      return processedData
    } catch (error) {
      console.error("Failed to fetch route:", error)
      return null
    }
  },

  setDrawingMode: (isDrawing: boolean) => {
    set({ isDrawing })
  },

  deleteRoute: async (routeId: string) => {
    try {
      console.log('mapStore: Deleting route with ID:', routeId)
      const response = await apiClient.delete(`/map/shapes/${routeId}`)
      
      console.log('mapStore: Delete API response:', response.data)
      
      if (response.status !== 200) {
        throw new Error('Failed to delete route')
      }
      
      // Update local state by removing the deleted route
      set((state) => ({
        routes: state.routes.filter(route => route.id !== routeId)
      }))
      
      console.log('mapStore: Route deleted from local state successfully')
      return true
    } catch (error) {
      console.error('mapStore: Error deleting route:', error)
      throw error
    }
  },

  updateRoute: async (routeId: string, updates: { name?: string; mode?: string }) => {
    try {
      console.log('mapStore: Updating route with ID:', routeId, 'updates:', updates)
      // Use PATCH endpoint for name/mode updates
      const response = await apiClient.patch(`/map/shapes/${routeId}`, updates)
      
      console.log('mapStore: API response:', response.data)
      
      if (response.status !== 200) {
        throw new Error('Failed to update route')
      }
      
      // Update local state with the new data
      set((state) => ({
        routes: state.routes.map(route => 
          route.id === routeId ? { 
            ...route, 
            ...(updates.name && { name: updates.name }),
            ...(updates.mode && { mode: updates.mode })
          } : route
        )
      }))
      
      console.log('mapStore: Local state updated successfully')
      return response.data
    } catch (error) {
      console.error('mapStore: Error updating route:', error)
      throw error
    }
  },

  saveSnappedRoute: async (name: string): Promise<string | undefined> => {
    const { currentShape, snappedRoute } = get()
    if (snappedRoute.length < 2) return

    set({ isLoading: true })
    try {
      // Convert {latitude, longitude} to [lng, lat] arrays for backend
      const geometry = currentShape.map(coord => [coord.longitude, coord.latitude])
      const snappedGeometry = snappedRoute.map(coord => [coord.longitude, coord.latitude])
      
      // Use the /shape endpoint for saving an already-snapped route
      const response = await apiClient.post("/map/shape", {
        geometry,
        snapped_route: snappedGeometry,
        name,
      })

      console.log("Save snapped route response:", response.data)

      return response.data.shape_id || response.data.id
    } catch (error) {
      console.error("Failed to save snapped route:", error)
      // TODO: Show error message to user
    } finally {
      set({ isLoading: false })
    }
  },
}))

