import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from '../src/stores/AuthContext';
import { RealTimeProvider } from '../src/stores/RealTimeContext';
import { registerForPushNotifications, setupNotificationListeners } from '../src/services/notifications';

function NotificationSetup() {
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) return;
    registerForPushNotifications();
    const cleanup = setupNotificationListeners();
    return cleanup;
  }, [isAuthenticated]);

  return null;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RealTimeProvider>
        <NotificationSetup />
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
        </Stack>
      </RealTimeProvider>
    </AuthProvider>
  );
}
