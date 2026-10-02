import React, { useEffect } from 'react';
import { Stack, router } from 'expo-router';
import { useFonts, Nunito_600SemiBold, Nunito_700Bold } from '@expo-google-fonts/nunito';
import { Inter_400Regular, Inter_500Medium, Inter_700Bold } from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../src/features/auth/use-auth';
import { ModernToast } from '../src/components/ui/ModernToast';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { session, loading } = useAuth();
  const [fontsLoaded] = useFonts({
    Nunito_700Bold,
    Nunito_600SemiBold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded && !loading) {
      SplashScreen.hideAsync();
      if (session) {
        router.replace('/(tabs)');
      } else {
        router.replace('/(auth)/login');
      }
    }
  }, [fontsLoaded, loading, session]);

  if (!fontsLoaded || loading) return null;

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <ModernToast />
      <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </SafeAreaProvider>
  );
}
