import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { api } from '../api/client';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerForPushNotifications(): Promise<void> {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('Push notification permission not granted');
      return;
    }

    const projectId = Constants?.expoConfig?.extra?.eas?.projectId;
    const data = await Notifications.getExpoPushTokenAsync({ projectId });

    await api.post('/notifications/register', {
      token: data.data,
      platform: Platform.OS,
    });
  } catch (err) {
    console.warn('Failed to register push token:', err);
  }
}

export function setupNotificationListeners(): () => void {
  const sub = Notifications.addNotificationReceivedListener((notification) => {
    console.log('Notification received:', notification);
  });

  const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
    console.log('Notification tapped:', response);
  });

  return () => {
    sub.remove();
    responseSub.remove();
  };
}
