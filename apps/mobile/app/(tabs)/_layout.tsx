import React from 'react'
import { View } from 'react-native'
import { Tabs } from 'expo-router'
import { useTheme } from '@/theme/ThemeContext'
import { Ionicons } from '@expo/vector-icons'
import { useTranslation } from 'react-i18next'
import { GuestBanner } from '@/components/GuestBanner'

type IoniconsName = React.ComponentProps<typeof Ionicons>['name']

function tabIcon(active: string, inactive: string) {
  return ({ color, focused }: { color: string; focused: boolean }) => (
    <Ionicons name={(focused ? active : inactive) as IoniconsName} size={22} color={color} />
  )
}

export default function TabLayout() {
  const { tokens, typography } = useTheme()
  const { t } = useTranslation()

  return (
    <View style={{ flex: 1 }}>
    <GuestBanner />
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: tokens.surface1,
          borderTopWidth: 1,
          borderTopColor: tokens.border,
        },
        tabBarActiveTintColor: tokens.accent,
        tabBarInactiveTintColor: tokens.textMute,
        tabBarLabelStyle: {
          fontFamily: typography.family.sansM,
          fontSize: 9,
          letterSpacing: 1,
          textTransform: 'uppercase',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.home'),
          tabBarLabel: t('tabs.home'),
          tabBarIcon: tabIcon('home', 'home-outline'),
        }}
      />
      <Tabs.Screen
        name="workouts"
        options={{
          title: t('tabs.training'),
          tabBarLabel: t('tabs.training'),
          tabBarIcon: tabIcon('barbell', 'barbell-outline'),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: t('tabs.history'),
          tabBarLabel: t('tabs.history'),
          tabBarIcon: tabIcon('time', 'time-outline'),
        }}
      />
      <Tabs.Screen
        name="diet"
        options={{
          title: t('tabs.diet'),
          tabBarLabel: t('tabs.diet'),
          tabBarIcon: tabIcon('shield-checkmark', 'shield-checkmark-outline'),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tabs.profile'),
          tabBarLabel: t('tabs.profile'),
          tabBarIcon: tabIcon('person', 'person-outline'),
        }}
      />
    </Tabs>
    </View>
  )
}
