import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';

import { HapticTab } from '@/components/HapticTab';
import { IconSymbol } from '@/components/ui/IconSymbol';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { useTheme } from '@react-navigation/native';

export default function TabLayout() {
  const theme = useTheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.dark ? '#9aa0a6' : '#6b7280',
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarBackground: () => (
          <TabBarBackground
            backgroundColor={theme.dark ? 'rgba(18,18,18,0.96)' : 'rgba(255,255,255,0.96)'}
            borderColor={theme.dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)'}
          />
        ),
        tabBarStyle: Platform.select({
          ios: { position: 'absolute' },
          android: {
            position: 'absolute',
            bottom: 0,
            left: 8,
            right: 8,
            height: 80,
            backgroundColor: 'transparent',
            borderTopWidth: 0,
            elevation: 0,
            paddingBottom: 16,
            marginBottom: 16,
          },
          default: { backgroundColor: 'transparent' },
        }),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <IconSymbol size={28} name={focused ? 'house.fill' : 'house'} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: 'Stats',
          tabBarIcon: ({ color, focused }) => (
            <IconSymbol size={28} name={focused ? 'chart.bar.fill' : 'chart.bar'} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Chat',
          tabBarIcon: ({ color, focused }) => (
            <IconSymbol
              size={28}
              name={focused ? 'bubble.left.and.bubble.right.fill' : 'bubble.left.and.bubble.right'}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, focused }) => (
            <IconSymbol size={28} name={focused ? 'gearshape.fill' : 'gearshape'} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
