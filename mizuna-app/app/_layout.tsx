
import { Stack } from 'expo-router';
import React from 'react';
import { ThemeProvider } from '@/constants/ThemeContext';

/**
 * Root layout using Expo Router.
 * Configures a Stack navigator and hides the default header for a custom UI.
 */

export default function RootLayout() {
  return (
    <ThemeProvider>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="index" options={{ headerShown: false }} />
      </Stack>
    </ThemeProvider>
  );
}