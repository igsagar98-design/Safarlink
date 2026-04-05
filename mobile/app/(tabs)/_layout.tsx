import { Tabs } from 'expo-router';
import React from 'react';
import { useTheme } from '../../constants/Colors';
import { Truck, User, CheckCircle2, XCircle } from 'lucide-react-native';

export default function TabLayout() {
  const { colors } = useTheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          height: 64,
          paddingBottom: 10,
          paddingTop: 4,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
        },
        headerStyle: {
          backgroundColor: colors.card,
        },
        headerShadowVisible: false,
        headerTitleStyle: {
          fontWeight: '800',
          fontSize: 18,
          color: colors.foreground,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Active',
          tabBarLabel: 'Active',
          tabBarIcon: ({ color }) => <Truck size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="completed"
        options={{
          title: 'Completed',
          tabBarLabel: 'Completed',
          tabBarIcon: ({ color }) => <CheckCircle2 size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="cancelled"
        options={{
          title: 'Cancelled',
          tabBarLabel: 'Cancelled',
          tabBarIcon: ({ color }) => <XCircle size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color }) => <User size={22} color={color} />,
        }}
      />
    </Tabs>
  );
}

