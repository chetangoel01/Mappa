import { useEffect, useState } from "react"
import { View, Text, StyleSheet, Switch, TouchableOpacity, Alert, ActivityIndicator } from "react-native"
import Slider from "@react-native-community/slider"
import Icon from "react-native-vector-icons/MaterialIcons"
import { useSettingsStore } from "../store/settingsStore"
import { useThemeStore } from "../store/themeStore"
import { useAuthStore } from "../store/authStore"
import { lightTheme, darkTheme } from "../theme/colors"

export default function SettingsScreen() {
  const { snapPrecision, isLoading, fetchSettings, updateSnapPrecision, saveSettings } = useSettingsStore()
  const { isDarkMode, toggleTheme } = useThemeStore()
  const { logout } = useAuthStore()
  const theme = isDarkMode ? darkTheme : lightTheme
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  useEffect(() => {
    fetchSettings()
  }, [])

  const handleSnapPrecisionChange = (value: number) => {
    updateSnapPrecision(Math.round(value))
    setHasUnsavedChanges(true)
  }

  const handleSaveSettings = async () => {
    await saveSettings()
    setHasUnsavedChanges(false)
    Alert.alert("Success", "Settings saved successfully")
  }

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      { text: "Logout", style: "destructive", onPress: logout },
    ])
  }

  const styles = createStyles(theme)

  return (
    <View style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Appearance</Text>

        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Icon name="dark-mode" size={24} color={theme.text} />
            <Text style={styles.settingLabel}>Dark Mode</Text>
          </View>
          <Switch
            value={isDarkMode}
            onValueChange={toggleTheme}
            trackColor={{ false: theme.border, true: theme.primary }}
            thumbColor={isDarkMode ? "#FFFFFF" : "#FFFFFF"}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Route Settings</Text>

        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Icon name="tune" size={24} color={theme.text} />
            <View>
              <Text style={styles.settingLabel}>Snap Precision</Text>
              <Text style={styles.settingDescription}>Adjust how precisely routes snap to roads (1-10)</Text>
            </View>
          </View>
        </View>

        <View style={styles.sliderContainer}>
          <Slider
            style={styles.slider}
            minimumValue={1}
            maximumValue={10}
            step={1}
            value={snapPrecision}
            onValueChange={handleSnapPrecisionChange}
            minimumTrackTintColor={theme.primary}
            maximumTrackTintColor={theme.border}
            thumbStyle={{ backgroundColor: theme.primary }}
          />
          <View style={styles.sliderLabels}>
            <Text style={styles.sliderLabel}>1</Text>
            <Text style={styles.sliderValue}>{snapPrecision}</Text>
            <Text style={styles.sliderLabel}>10</Text>
          </View>
        </View>

        {hasUnsavedChanges && (
          <TouchableOpacity style={styles.saveButton} onPress={handleSaveSettings} disabled={isLoading}>
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Icon name="save" size={20} color="#FFFFFF" />
                <Text style={styles.saveButtonText}>Save Changes</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>

        <TouchableOpacity style={styles.settingItem} onPress={handleLogout}>
          <View style={styles.settingInfo}>
            <Icon name="logout" size={24} color={theme.error} />
            <Text style={[styles.settingLabel, { color: theme.error }]}>Logout</Text>
          </View>
          <Icon name="chevron-right" size={24} color={theme.textSecondary} />
        </TouchableOpacity>
      </View>
    </View>
  )
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    section: {
      marginTop: 32,
      paddingHorizontal: 20,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: theme.text,
      marginBottom: 16,
    },
    settingItem: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: theme.surface,
      padding: 16,
      borderRadius: 12,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: theme.border,
    },
    settingInfo: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      flex: 1,
    },
    settingLabel: {
      fontSize: 16,
      fontWeight: "500",
      color: theme.text,
    },
    settingDescription: {
      fontSize: 14,
      color: theme.textSecondary,
      marginTop: 2,
    },
    sliderContainer: {
      backgroundColor: theme.surface,
      padding: 16,
      borderRadius: 12,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: theme.border,
    },
    slider: {
      width: "100%",
      height: 40,
    },
    sliderLabels: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: 8,
    },
    sliderLabel: {
      fontSize: 14,
      color: theme.textSecondary,
    },
    sliderValue: {
      fontSize: 18,
      fontWeight: "600",
      color: theme.primary,
    },
    saveButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.success,
      padding: 16,
      borderRadius: 12,
      gap: 8,
    },
    saveButtonText: {
      color: "#FFFFFF",
      fontSize: 16,
      fontWeight: "600",
    },
  })
