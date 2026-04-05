import { Stack } from 'expo-router';
import { ThemeProvider } from '../constants/Colors';
import { StatusBar } from 'expo-status-bar';
import { useFonts, DMSans_400Regular, DMSans_500Medium, DMSans_700Bold } from '@expo-google-fonts/dm-sans';
import { SpaceGrotesk_500Medium, SpaceGrotesk_600SemiBold, SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import React from 'react';
import { Text, TextInput } from 'react-native';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

// Apply DM Sans globally to all Text and TextInput components
(Text as any).defaultProps = (Text as any).defaultProps || {};
(Text as any).defaultProps.style = { fontFamily: 'DMSans_400Regular' };
(TextInput as any).defaultProps = (TextInput as any).defaultProps || {};
(TextInput as any).defaultProps.style = { fontFamily: 'DMSans_400Regular' };

export default function RootLayout() {
  const [loaded] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_700Bold,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <ThemeProvider>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen
          name="trip/[id]"
          options={{
            presentation: 'card',
            headerShown: true,
            title: 'Trip Details',
            headerTitleStyle: { fontFamily: 'Inter_700Bold' },
          }}
        />
      </Stack>
    </ThemeProvider>
  );
}
