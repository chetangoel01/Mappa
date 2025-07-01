import axios from "axios"
import AsyncStorage from "@react-native-async-storage/async-storage"

const BASE_URL = "https://7869-2603-7000-2df0-78f0-40bb-6a09-44a8-ff05.ngrok-free.app"

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
})

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem("auth_token")
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
    } catch (error) {
      console.error("Failed to get auth token:", error)
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  },
)

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized access - clear auth data
      try {
        await AsyncStorage.removeItem("auth_token")
        await AsyncStorage.removeItem("user_data")
        // Note: We can't directly call logout here due to circular imports
        // The app will handle this when it detects the missing token
      } catch (storageError) {
        console.error("Failed to clear auth data:", storageError)
      }
    }
    return Promise.reject(error)
  },
)

// Auth API functions
export const authAPI = {
  register: async (email: string, password: string, name: string) => {
    const response = await apiClient.post('/auth/register', { email, password, name })
    return response.data
  },
  
  login: async (email: string, password: string) => {
    const response = await apiClient.post('/auth/login', { email, password })
    return response.data
  }
}

// Profile API functions
export const profileAPI = {
  getProfile: async () => {
    const response = await apiClient.get('/users/profile')
    return response.data
  },
  
  updateProfile: async (profileData: {
    name: string
    location?: string
    bio?: string
    profile_picture?: string
  }) => {
    const response = await apiClient.put('/users/profile', profileData)
    return response.data
  },
  
  deleteAccount: async () => {
    const response = await apiClient.delete('/users/account')
    return response.data
  },
  
  uploadProfileImage: async (imageUri: string) => {
    const formData = new FormData()
    formData.append('image', {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'profile-image.jpg'
    } as any)
    
    const response = await apiClient.post('/users/profile/image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },
  
  deleteProfileImage: async () => {
    const response = await apiClient.delete('/users/profile/image')
    return response.data
  }
}

// Settings API functions
export const settingsAPI = {
  getSettings: async () => {
    const response = await apiClient.get('/users/settings')
    return response.data
  },
  
  updateSettings: async (settings: any) => {
    const response = await apiClient.post('/users/settings', settings)
    return response.data
  }
}
