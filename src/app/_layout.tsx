import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Palette } from '@/constants/theme';
import { AppProvider, useApp } from '@/store/AppContext';
import { AuthProvider } from '@/store/AuthContext';

SplashScreen.preventAutoHideAsync().catch(() => {
  // Splash screen may already be hidden in some environments.
});

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: Palette.deepNavy }}>
      <SafeAreaProvider>
        <AppProvider>
          <AuthProvider>
            <RootNavigator />
          </AuthProvider>
        </AppProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function RootNavigator() {
  const { ready } = useApp();
  const [fontsLoaded] = useFonts({
    Tinos_400Regular: require('../../assets/fonts/Tinos-Regular.ttf'),
    Tinos_400Italic: require('../../assets/fonts/Tinos-Italic.ttf'),
    Tinos_700Bold: require('../../assets/fonts/Tinos-Bold.ttf'),
    Tinos_700BoldItalic: require('../../assets/fonts/Tinos-BoldItalic.ttf'),
  });

  const appReady = ready && fontsLoaded;

  useEffect(() => {
    if (appReady) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [appReady]);

  if (!appReady) {
    return <View style={{ flex: 1, backgroundColor: Palette.deepNavy }} />;
  }

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'fade',
          contentStyle: { backgroundColor: Palette.deepNavy },
        }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(app)" />
        <Stack.Screen name="video-studio" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="video/[id]" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="image-studio" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="image-analysis" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="settings" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="welcome" />
      </Stack>
    </>
  );
}
