import { Tabs } from 'expo-router'
import { useTheme } from '@/theme/ThemeContext'
import { Ionicons } from '@expo/vector-icons'
import { useTranslation } from 'react-i18next'

type IoniconsName = React.ComponentProps<typeof Ionicons>['name']

function tabIcon(active: string, inactive: string) {
  return ({ color, focused }: { color: string; focused: boolean }) => (
    <Ionicons name={(focused ? active : inactive) as IoniconsName} size={24} color={color} />
  )
}

export default function TabLayout() {
  const { colors, typography } = useTheme()
  const { t } = useTranslation()

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.surface2,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: {
          fontFamily: typography.family.semiBold,
          fontSize: typography.size.xs,
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
          title: t('tabs.workouts'),
          tabBarLabel: t('tabs.workouts'),
          tabBarIcon: tabIcon('barbell', 'barbell-outline'),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: t('tabs.history'),
          tabBarLabel: t('tabs.history'),
          tabBarIcon: tabIcon('stats-chart', 'stats-chart-outline'),
        }}
      />
      <Tabs.Screen
        name="diet"
        options={{
          title: t('tabs.diet'),
          tabBarLabel: t('tabs.diet'),
          tabBarIcon: tabIcon('nutrition', 'nutrition-outline'),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tabs.profile'),
          tabBarLabel: t('tabs.profile'),
          tabBarIcon: tabIcon('person-circle', 'person-circle-outline'),
        }}
      />
    </Tabs>
  )
}
