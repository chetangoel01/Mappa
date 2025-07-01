import { useEffect } from "react"
import { NavigationContainer, DefaultTheme, DarkTheme as NavigationDarkTheme } from "@react-navigation/native"
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs"
import { createStackNavigator } from "@react-navigation/stack"
import { StatusBar, useColorScheme } from "react-native"
import Icon from "react-native-vector-icons/MaterialIcons"
import { useAuthStore } from "./src/store/authStore"
import { useThemeStore } from "./src/store/themeStore"
import { useMapSettingsStore } from "./src/store/mapSettingsStore"
import { useSettingsStore } from "./src/store/settingsStore"
import LoginScreen from "./src/screens/LoginScreen"
import MapScreen from "./src/screens/MapScreen"
import RoutesScreen from "./src/screens/RoutesScreen"
import RouteDetailScreen from "./src/screens/RouteDetailScreen"
import ProfileScreen from "./src/screens/ProfileScreen"
import { lightTheme, darkTheme } from "./src/theme/colors"

const Tab = createBottomTabNavigator()
const Stack = createStackNavigator()

const RoutesStack = () => (
  <Stack.Navigator>
    <Stack.Screen name="RoutesList" component={RoutesScreen} options={{ title: "Routes" }} />
    <Stack.Screen name="RouteDetail" component={RouteDetailScreen} options={{ title: "Route Details" }} />
  </Stack.Navigator>
)

const MapStack = () => (
  <Stack.Navigator>
    <Stack.Screen name="MapMain" component={MapScreen} options={{ headerShown: false }} />
    <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: "Profile" }} />
  </Stack.Navigator>
)

const MainTabs = () => {
  const isDarkMode = useThemeStore(state => state.isDarkMode)
  const theme = isDarkMode ? darkTheme : lightTheme

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName = "help" // Default icon
          if (route.name === "Map") {
            iconName = "map"
          } else if (route.name === "Routes") {
            iconName = "route"
          } else if (route.name === "Profile") {
            iconName = "person"
          }
          return <Icon name={iconName} size={size} color={color} />
        },
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textSecondary,
        tabBarStyle: {
          backgroundColor: theme.surface,
          borderTopColor: theme.border,
        },
        headerStyle: {
          backgroundColor: theme.surface,
        },
        headerTintColor: theme.text,
      })}
    >
      <Tab.Screen name="Map" component={MapScreen} options={{ headerShown: false }} />
      <Tab.Screen name="Routes" component={RoutesStack} options={{ headerShown: false }} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  )
}

const navigationLightTheme = {
  ...DefaultTheme,
  dark: false,
  colors: {
    ...DefaultTheme.colors,
    primary: lightTheme.primary,
    background: lightTheme.background,
    card: lightTheme.surface,
    text: lightTheme.text,
    border: lightTheme.border,
    notification: lightTheme.error,
  },
}

const navigationDarkTheme = {
  ...NavigationDarkTheme,
  dark: true,
  colors: {
    ...NavigationDarkTheme.colors,
    primary: darkTheme.primary,
    background: darkTheme.background,
    card: darkTheme.surface,
    text: darkTheme.text,
    border: darkTheme.border,
    notification: darkTheme.error,
  },
}

export default function App() {
  const { isAuthenticated, checkAuthStatus } = useAuthStore()
  const isDarkMode = useThemeStore(state => state.isDarkMode)
  const initializeTheme = useThemeStore(state => state.initializeTheme)
  const loadMapSettings = useMapSettingsStore(state => state.loadSettings)
  const initializeSettings = useSettingsStore(state => state.initializeSettings)
  const systemColorScheme = useColorScheme()

  useEffect(() => {
    checkAuthStatus()
    initializeTheme(systemColorScheme === "dark")
    loadMapSettings()
    initializeSettings()
  }, [])

  return (
    <NavigationContainer theme={isDarkMode ? navigationDarkTheme : navigationLightTheme}>
      <StatusBar
        barStyle={isDarkMode ? "light-content" : "dark-content"}
        backgroundColor={isDarkMode ? darkTheme.background : lightTheme.background}
      />
      {isAuthenticated ? <MainTabs /> : <LoginScreen />}
    </NavigationContainer>
  )
}
