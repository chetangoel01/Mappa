import { useState } from "react"
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { useAuthStore } from "../store/authStore"
import { useThemeStore } from "../store/themeStore"
import { lightTheme, darkTheme } from "../theme/colors"
import { authAPI } from "../services/api"

export default function LoginScreen() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isRegistering, setIsRegistering] = useState(false)
  const { login } = useAuthStore()
  const { isDarkMode } = useThemeStore()
  const theme = isDarkMode ? darkTheme : lightTheme

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please enter both email and password")
      return
    }

    setIsLoading(true)
    const success = await login(email, password)
    setIsLoading(false)

    if (!success) {
      Alert.alert("Login Failed", "Invalid credentials. Please try again.")
    }
  }

  const handleRegister = async () => {
    if (!email || !password || !name) {
      Alert.alert("Error", "Please enter email, password, and name")
      return
    }

    setIsLoading(true)
    try {
      const response = await authAPI.register(email, password, name)
      await AsyncStorage.setItem("auth_token", response.access_token)
      Alert.alert("Success", "Account created successfully! Please sign in.")
      setIsRegistering(false)
      setEmail("")
      setPassword("")
      setName("")
    } catch (error: any) {
      Alert.alert("Registration Failed", error.response?.data?.msg || "Failed to create account")
    } finally {
      setIsLoading(false)
    }
  }

  const styles = createStyles(theme)

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <View style={styles.content}>
        <Text style={styles.title}>Mappa</Text>
        <Text style={styles.subtitle}>
          {isRegistering ? "Create your account" : "Welcome back"}
        </Text>

        <View style={styles.form}>
          {isRegistering && (
            <TextInput
              style={styles.input}
              placeholder="Full Name"
              placeholderTextColor={theme.textSecondary}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              autoCorrect={false}
            />
          )}

          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={theme.textSecondary}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={theme.textSecondary}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
          />

          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={isRegistering ? handleRegister : handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>
                {isRegistering ? "Create Account" : "Sign In"}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.switchButton}
            onPress={() => setIsRegistering(!isRegistering)}
            disabled={isLoading}
          >
            <Text style={[styles.switchText, { color: theme.primary }]}>
              {isRegistering ? "Already have an account? Sign In" : "Don't have an account? Sign Up"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  )
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    content: {
      flex: 1,
      justifyContent: "center",
      paddingHorizontal: 32,
    },
    title: {
      fontSize: 32,
      fontWeight: "bold",
      color: theme.text,
      textAlign: "center",
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 16,
      color: theme.textSecondary,
      textAlign: "center",
      marginBottom: 48,
    },
    form: {
      gap: 16,
    },
    input: {
      height: 50,
      backgroundColor: theme.surface,
      borderRadius: 8,
      paddingHorizontal: 16,
      fontSize: 16,
      color: theme.text,
      borderWidth: 1,
      borderColor: theme.border,
    },
    button: {
      height: 50,
      backgroundColor: theme.primary,
      borderRadius: 8,
      justifyContent: "center",
      alignItems: "center",
      marginTop: 16,
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    buttonText: {
      color: "#FFFFFF",
      fontSize: 16,
      fontWeight: "600",
    },
    switchButton: {
      alignItems: "center",
      paddingVertical: 16,
    },
    switchText: {
      fontSize: 14,
      fontWeight: "500",
    },
  })
