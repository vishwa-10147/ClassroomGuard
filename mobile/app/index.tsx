import { Redirect } from 'expo-router';
import { useAuth } from '../src/stores/AuthContext';

export default function Index() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return null;
  return isAuthenticated ? <Redirect href="/(tabs)/dashboard" /> : <Redirect href="/(auth)/login" />;
}
