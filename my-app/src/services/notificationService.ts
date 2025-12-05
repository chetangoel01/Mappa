import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import { Platform } from 'react-native'

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
})

export interface NotificationSettings {
  enabled: boolean
  routeCompletion: boolean
  newFeatures: boolean
  reminders: boolean
}

class NotificationService {
  private expoPushToken: string | null = null

  async initialize() {
    try {
      // Request permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync()
      let finalStatus = existingStatus

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync()
        finalStatus = status
      }

      if (finalStatus !== 'granted') {
        return false
      }

      if (Device.isDevice) {
        const token = await Notifications.getExpoPushTokenAsync({
          projectId: 'your-project-id',
        })
        this.expoPushToken = token.data
      }

      // Set up notification channels for Android
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        })

        await Notifications.setNotificationChannelAsync('route-completion', {
          name: 'Route Completion',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#4CAF50',
        })

        await Notifications.setNotificationChannelAsync('reminders', {
          name: 'Reminders',
          importance: Notifications.AndroidImportance.DEFAULT,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF9800',
        })
      }

      return true
    } catch (error) {
      console.error('Failed to initialize notifications:', error)
      return false
    }
  }

  async scheduleRouteCompletionNotification(routeName: string, distance: number) {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Route Completed! 🎉',
          body: `You've completed "${routeName}" - ${distance.toFixed(2)} km`,
          data: { type: 'route-completion', routeName, distance },
          sound: 'default',
        },
        trigger: null, // Send immediately
      })
    } catch (error) {
      console.error('Failed to schedule route completion notification:', error)
    }
  }

  async scheduleReminderNotification() {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Time for a Walk! 🚶‍♂️',
          body: 'Take a break and map a new route today',
          data: { type: 'reminder' },
          sound: 'default',
        },
        trigger: {
          hour: 10, // 10 AM
          minute: 0,
          repeats: true,
        } as Notifications.CalendarTriggerInput,
      })
    } catch (error) {
      console.error('Failed to schedule reminder notification:', error)
    }
  }

  async scheduleNewFeatureNotification(featureName: string, description: string) {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'New Feature Available! ✨',
          body: `${featureName}: ${description}`,
          data: { type: 'new-feature', featureName },
          sound: 'default',
        },
        trigger: null, // Send immediately
      })
    } catch (error) {
      console.error('Failed to schedule new feature notification:', error)
    }
  }

  async cancelAllNotifications() {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync()
    } catch (error) {
      console.error('Failed to cancel notifications:', error)
    }
  }

  async cancelReminderNotifications() {
    try {
      const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync()
      const reminderNotifications = scheduledNotifications.filter(
        (notification: Notifications.NotificationRequest) => notification.content.data?.type === 'reminder'
      )
      
      for (const notification of reminderNotifications) {
        await Notifications.cancelScheduledNotificationAsync(notification.identifier)
      }
    } catch (error) {
      console.error('Failed to cancel reminder notifications:', error)
    }
  }

  getExpoPushToken() {
    return this.expoPushToken
  }

  async getNotificationPermissions() {
    try {
      const { status } = await Notifications.getPermissionsAsync()
      return status
    } catch (error) {
      console.error('Failed to get notification permissions:', error)
      return 'denied'
    }
  }
}

export const notificationService = new NotificationService() 