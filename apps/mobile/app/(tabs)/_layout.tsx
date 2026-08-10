import React from 'react'
import { View, Platform } from 'react-native'
import { Tabs } from 'expo-router'
import { NativeTabs } from 'expo-router/unstable-native-tabs'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '@/theme/ThemeContext'
import { useTranslation } from 'react-i18next'
import { GuestBanner } from '@/components/GuestBanner'

const NATIVE_TABS_ENABLED = Platform.OS === 'ios'

type IoniconsName = React.ComponentProps<typeof Ionicons>['name']

function tabIcon(active: string, inactive: string) {
  return ({ color, focused }: { color: string; focused: boolean }) => (
    <Ionicons name={(focused ? active : inactive) as IoniconsName} size={28} color={color} />
  )
}

function NativeTabsLayout() {
  const { tokens } = useTheme()
  const { t } = useTranslation()

  return (
    <View style={{ flex: 1, backgroundColor: tokens.bg }}>
      <GuestBanner />
      <NativeTabs
        minimizeBehavior="onScrollDown"
        tintColor={tokens.accent}
      >
        <NativeTabs.Trigger name="index">
          <NativeTabs.Trigger.Icon
            sf={{ default: 'house', selected: 'house.fill' }}
            src={<NativeTabs.Trigger.VectorIcon family={Ionicons} name="home" />}
          />
          <NativeTabs.Trigger.Label>{t('tabs.home')}</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>

        <NativeTabs.Trigger name="training">
          <NativeTabs.Trigger.Icon
            sf={{ default: 'dumbbell', selected: 'dumbbell.fill' }}
            src={<NativeTabs.Trigger.VectorIcon family={Ionicons} name="barbell" />}
          />
          <NativeTabs.Trigger.Label>{t('tabs.training')}</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>

        <NativeTabs.Trigger name="history">
          <NativeTabs.Trigger.Icon
            sf={{ default: 'clock', selected: 'clock.fill' }}
            src={<NativeTabs.Trigger.VectorIcon family={Ionicons} name="time" />}
          />
          <NativeTabs.Trigger.Label>{t('tabs.history')}</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>

        <NativeTabs.Trigger name="diet">
          <NativeTabs.Trigger.Icon
            sf={{ default: 'fork.knife', selected: 'fork.knife' }}
            src={<NativeTabs.Trigger.VectorIcon family={Ionicons} name="restaurant" />}
          />
          <NativeTabs.Trigger.Label>{t('tabs.diet')}</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>

        <NativeTabs.Trigger name="profile">
          <NativeTabs.Trigger.Icon
            sf={{ default: 'person', selected: 'person.fill' }}
            src={<NativeTabs.Trigger.VectorIcon family={Ionicons} name="person" />}
          />
          <NativeTabs.Trigger.Label>{t('tabs.profile')}</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
      </NativeTabs>
    </View>
  )
}

function ClassicTabsLayout() {
  const { tokens } = useTheme()
  const { t } = useTranslation()

  return (
    <View style={{ flex: 1 }}>
      <GuestBanner />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarShowLabel: false,
          tabBarStyle: {
            backgroundColor: tokens.surface1,
            borderTopWidth: 1,
            borderTopColor: tokens.border,
            paddingTop: 8,
          },
          tabBarActiveTintColor: tokens.accent,
          tabBarInactiveTintColor: tokens.textMute,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: t('tabs.home'),
            tabBarIcon: tabIcon('home', 'home-outline'),
          }}
        />
        <Tabs.Screen
          name="training"
          options={{
            title: t('tabs.training'),
            tabBarIcon: tabIcon('barbell', 'barbell-outline'),
          }}
        />
        <Tabs.Screen
          name="history"
          options={{
            title: t('tabs.history'),
            tabBarIcon: tabIcon('time', 'time-outline'),
          }}
        />
        <Tabs.Screen
          name="diet"
          options={{
            title: t('tabs.diet'),
            tabBarIcon: tabIcon('restaurant', 'restaurant-outline'),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: t('tabs.profile'),
            tabBarIcon: tabIcon('person', 'person-outline'),
          }}
        />
      </Tabs>
    </View>
  )
}

export default function TabLayout() {
  if (NATIVE_TABS_ENABLED) return <NativeTabsLayout />
  return <ClassicTabsLayout />
}
