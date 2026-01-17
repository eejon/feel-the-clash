import { Tabs } from 'expo-router';
import React from 'react';

import { Platform } from 'react-native'; 
import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: Platform.select({
          ios: { position: 'absolute' },
          default: {},
        }),
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
        }}
      />
      {/* This adds the route but HIDES the button. 
         This is the trick to have a "detail" page inside a Tab Layout 
      */}
      <Tabs.Screen
        name="game"
        options={{
          href: null, // <--- This hides it from the bottom bar
        }}
      />
      
      {/* You can keep or remove your old test files below */}
      <Tabs.Screen
        name="shakeTest"
        options={{
          href: null, // I hid this too to clean up the UI
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}