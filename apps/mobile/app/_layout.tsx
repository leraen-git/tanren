import { Stack, router } from 'expo-router'
import { ThemeProvider } from '@/theme/ThemeContext'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { trpc } from '@/lib/trpc'
import { httpBatchLink } from '@trpc/client'
import { useState, useEffect, useRef } from 'react'
import { View, AppState, type AppStateStatus } from 'react-native'
import * as Notifications from 'expo-notifications'
import { useTranslation } from 'react-i18next'
import { SplashScreen } from '@/components/SplashScreen'
import { initMusicService } from '@/services/musicService'
import { setupNotificationChannels } from '@/services/notificationPermissions'
import { rescheduleAll } from '@/services/notificationScheduler'
import { useNotificationSettingsStore } from '@/stores/notificationSettingsStore'
import '@/i18n'

// Handle incoming notification taps — deep-link to the relevant screen
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
})

const API_URL = process.env['EXPO_PUBLIC_API_URL'] ?? 'http://localhost:3000'

function TRPCProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
  }))
  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [httpBatchLink({ url: `${API_URL}/trpc`, headers: async () => ({}) })],
    }),
  )

  // Battery: cancel all in-flight queries when app backgrounds to prevent radio wake-ups
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'background') queryClient.cancelQueries()
    })
    return () => sub.remove()
  }, [queryClient])

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  )
}

function OnboardingGate() {
  const me = trpc.users.me.useQuery()
  const redirected = useRef(false)

  useEffect(() => {
    if (redirected.current) return
    if (me.data && !me.data.onboardingDone) {
      redirected.current = true
      router.replace('/onboarding/step1' as any)
    }
  }, [me.data])

  return null
}

function NotificationWatcher() {
  const settings = useNotificationSettingsStore()
  const { i18n } = useTranslation()
  const lang = (i18n.language === 'fr' ? 'fr' : 'en') as 'en' | 'fr'

  useEffect(() => {
    // Setup Android channels on mount
    setupNotificationChannels()

    // Reschedule all on foreground (catches DST and timezone changes)
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') {
        rescheduleAll(settings, undefined, lang).catch(() => null)
      }
    })

    // Deep-link on notification tap
    const tapSub = Notifications.addNotificationResponseReceivedListener((response) => {
      const screen = response.notification.request.content.data?.screen as string | undefined
      if (screen === 'workout') router.navigate('/(tabs)/' as any)
      else if (screen === 'diet') router.navigate('/(tabs)/diet' as any)
      else router.navigate('/(tabs)/' as any)
    })

    return () => {
      sub.remove()
      tapSub.remove()
    }
  // settings reference is stable from Zustand; run once on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return null
}

export default function RootLayout() {
  const [splashDone, setSplashDone] = useState(false)

  // Init music service once — sets audio session to ambient/duck mode
  useEffect(() => {
    initMusicService().catch(() => null) // graceful fallback if native module absent
  }, [])

  return (
    <View style={{ flex: 1 }}>
      <ThemeProvider>
        <TRPCProvider>
          <Stack screenOptions={{ headerShown: false }} />
          {splashDone && <OnboardingGate />}
          <NotificationWatcher />
        </TRPCProvider>
      </ThemeProvider>
      {!splashDone && <SplashScreen onFinish={() => setSplashDone(true)} />}
    </View>
  )
}
