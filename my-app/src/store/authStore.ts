import { create } from "zustand"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { apiClient } from "../services/api"

interface AuthState {
  isAuthenticated: boolean
  token: string | null
  user: any | null
  login: (email: string, password: string) => Promise<boolean>
  register: (email: string, password: string, name: string) => Promise<boolean>
  logout: () => Promise<void>
  checkAuthStatus: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  isAuthenticated: false,
  token: null,
  user: null,

  login: async (email: string, password: string) => {
    try {
      const response = await apiClient.post("/auth/login", { email, password })
      const token = response.data.access_token

      await AsyncStorage.setItem("auth_token", token)
      await AsyncStorage.setItem("user_data", JSON.stringify(email))

      set({ isAuthenticated: true, token, user: email })
      return true
    } catch (error: any) {
      console.error("Login failed:", error)
      return false
    }
  },

  register: async (email: string, password: string, name: string) => {
    try {
      const response = await apiClient.post("/auth/register", { email, password, name })
      const token = response.data.access_token
      await AsyncStorage.setItem("auth_token", token)
      await AsyncStorage.setItem("user_data", JSON.stringify(email))
      set({ isAuthenticated: true, token, user: email })
      return true
    } catch (error: any) {
      console.error("Registration failed:", error)
      return false
    }
  },

  logout: async () => {
    try {
      await AsyncStorage.removeItem("auth_token")
      await AsyncStorage.removeItem("user_data")
      set({ isAuthenticated: false, token: null, user: null })
    } catch (error) {
      console.error("Logout failed:", error)
    }
  },

  checkAuthStatus: async () => {
    try {
      const token = await AsyncStorage.getItem("auth_token")
      const userData = await AsyncStorage.getItem("user_data")

      if (token && userData) {
        const user = JSON.parse(userData)
        set({ isAuthenticated: true, token, user })
      } else if (token) {
        // If token exists but user_data is missing, fallback to null or a default
        set({ isAuthenticated: true, token, user: null })
      }
    } catch (error) {
      console.error("Auth check failed:", error)
    }
  },
}))
