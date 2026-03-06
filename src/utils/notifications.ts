import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure how notifications should be handled when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Requests notification permissions from the device
 * @returns Promise<boolean> - true if permission was granted, false otherwise
 */
export const requestNotificationPermissions = async (): Promise<boolean> => {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // If permissions not yet granted, request them
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    // For Android, set up notification channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Training Notifications',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF6B6B',
      });
    }

    return finalStatus === 'granted';
  } catch (error) {
    console.error('Error requesting notification permissions:', error);
    return false;
  }
};

/**
 * Gets the Expo push notification token for this device
 * Note: Requires EAS project setup. For local dev, this may fail gracefully.
 * @returns Promise<string | null> - the push token or null if not available
 */
export const getPushNotificationToken = async (): Promise<string | null> => {
  try {
    // Get Expo push token
    // The projectId is automatically read from app.json under expo.extra.eas.projectId
    const tokenData = await Notifications.getExpoPushTokenAsync();
    
    console.log('✅ Push token obtained:', tokenData.data);
    return tokenData.data;
  } catch (error: any) {
    // If error is about missing projectId, provide helpful message
    if (error?.message?.includes('projectId') || error?.message?.includes('experienceId')) {
      console.log('⚠️ Push notifications require EAS setup. Follow PUSH_NOTIFICATIONS_SETUP.md to configure.');
      console.log('   1. Run: eas init');
      console.log('   2. Add projectId to app.json under expo.extra.eas.projectId');
    } else {
      console.log('Push token not available:', error?.message || error);
    }
    return null;
  }
};

/**
 * Enables notifications for the device
 * Requests permissions and optionally gets push token (if EAS is configured)
 * @returns Promise<{success: boolean, token: string | null}>
 */
export const enableNotifications = async (): Promise<{
  success: boolean;
  token: string | null;
}> => {
  const hasPermission = await requestNotificationPermissions();
  
  if (!hasPermission) {
    return { success: false, token: null };
  }

  // Try to get push token, but don't fail if unavailable (local dev)
  const token = await getPushNotificationToken();
  
  // Success as long as we have permissions (local notifications work without push tokens)
  return { success: true, token };
};

/**
 * Disables notifications by canceling all scheduled notifications
 */
export const disableNotifications = async (): Promise<void> => {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (error) {
    console.error('Error disabling notifications:', error);
  }
};

/**
 * Schedules a test notification
 * Useful for testing if notifications are working
 */
export const scheduleTestNotification = async (): Promise<void> => {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Gymness 💪',
        body: 'Powiadomienia zostały włączone!',
        data: { test: true },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 2,
        repeats: false,
      },
    });
  } catch (error) {
    console.error('Error scheduling test notification:', error);
  }
};

/**
 * Shows a notification for a new friend request
 * @param fromNickname - The nickname of the user who sent the friend request
 * @param fromUserId - The user ID of the sender (optional, for navigation)
 */
export const showFriendRequestNotification = async (
  fromNickname: string = 'Ktoś',
  fromUserId?: string
): Promise<void> => {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🤝 Nowe zaproszenie do przyjaźni',
        body: `${fromNickname} wysłał Ci zaproszenie do grona znajomych!`,
        data: { 
          type: 'friend_request',
          fromUserId,
        },
      },
      trigger: null, // Show immediately
    });
  } catch (error) {
    console.error('Error showing friend request notification:', error);
  }
};
