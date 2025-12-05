import { create } from "zustand"
import AsyncStorage from "@react-native-async-storage/async-storage"

interface ThemeState {
  isDarkMode: boolean
  toggleTheme: () => Promise<void>
  initializeTheme: (systemDark: boolean) => Promise<void>
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  isDarkMode: false,

  toggleTheme: async () => {
    const newMode = !get().isDarkMode
    await AsyncStorage.setItem("theme_mode", newMode ? "dark" : "light")
    set({ isDarkMode: newMode })
  },

  initializeTheme: async (systemDark: boolean) => {
    try {
      const savedTheme = await AsyncStorage.getItem("theme_mode")
      const isDark = savedTheme ? savedTheme === "dark" : systemDark
      set({ isDarkMode: isDark })
    } catch (error) {
      set({ isDarkMode: systemDark })
    }
  },
}))
