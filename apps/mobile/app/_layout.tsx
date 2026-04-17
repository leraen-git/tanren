import { Stack, router } from 'expo-router'
import { ThemeProvider } from '@/theme/ThemeContext'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { trpc } from '@/lib/trpc'
import { httpBatchLink } from '@trpc/client'
import { useState, useEffect, useRef } from 'react'
import { View, AppState, type AppStateStatus } from 'react-native'
import { useFonts, BarlowCondensed_300Light, BarlowCondensed_400Regular, BarlowCondensed_500Medium, BarlowCondensed_700Bold } from '@expo-google-fonts/barlow-condensed'
import * as Notifications from 'expo-notifications'
import { useTranslation } from 'react-i18next'
import { SplashScreen } from '@/components/SplashScreen'
import { initMusicService } from '@/services/musicService'
import { setupNotificationChannels } from '@/services/notificationPermissions'
import { rescheduleAll } from '@/services/notificationScheduler'
import { useNotificationSettingsStore } from '@/stores/notificationSettingsStore'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { GuestBanner } from '@/components/GuestBanner'
import { GuestBannerProvider } from '@/contexts/GuestBannerContext'
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
  const { token } = useAuth()

  // Keep a stable ref to the latest token so the tRPC link closure never goes stale
  const tokenRef = useRef<string | null>(token)
  useEffect(() => { tokenRef.current = token }, [token])

  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
  }))

  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [httpBatchLink({
        url: `${API_URL}/trpc`,
        headers: () => {
          const t = tokenRef.current
          return t ? { Authorization: `Bearer ${t}` } : {}
        },
      })],
    }),
  )

  // Cancel all in-flight queries when app backgrounds to prevent radio wake-ups
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
      // Guests and email users skip the consent screen (no provider data to display)
      const skipConsent = me.data.authProvider === 'guest' || me.data.authProvider === 'email'
      router.replace((skipConsent ? '/onboarding/step1' : '/onboarding/step0') as any)
    }
  }, [me.data])

  return null
}

function NotificationWatcher() {
  const settings = useNotificationSettingsStore()
  const { i18n } = useTranslation()
  const lang = (i18n.language === 'fr' ? 'fr' : 'en') as 'en' | 'fr'

  useEffect(() => {
    setupNotificationChannels()
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') {
        rescheduleAll(settings, undefined, lang).catch(() => null)
      }
    })
    const tapSub = Notifications.addNotificationResponseReceivedListener((response) => {
      const screen = response.notification.request.content.data?.screen as string | undefined
      if (screen === 'workout') router.navigate('/(tabs)/' as any)
      else if (screen === 'diet') router.navigate('/(tabs)/diet' as any)
      else router.navigate('/(tabs)/' as any)
    })
    return () => { sub.remove(); tapSub.remove() }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return null
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const { status } = useAuth()
  const { data: user } = trpc.users.me.useQuery()
  const isGuest = user?.authProvider === 'guest'

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/(auth)/sign-in' as any)
    }
  }, [status])

  // While loading the stored token, render nothing (splash is already shown)
  if (status === 'loading') return null

  return (
    <GuestBannerProvider value={isGuest ?? false}>
      <GuestBanner />
      {children}
    </GuestBannerProvider>
  )
}

export default function RootLayout() {
  const [splashDone, setSplashDone] = useState(false)
  const [fontsLoaded] = useFonts({
    BarlowCondensed_300Light,
    BarlowCondensed_400Regular,
    BarlowCondensed_500Medium,
    BarlowCondensed_700Bold,
  })

  useEffect(() => {
    initMusicService().catch(() => null)
  }, [])

  return (
    <View style={{ flex: 1 }}>
      <ThemeProvider>
        <AuthProvider>
          <TRPCProvider>
            <AuthGate>
              <Stack screenOptions={{ headerShown: false }} />
              {splashDone && <OnboardingGate />}
              <NotificationWatcher />
            </AuthGate>
          </TRPCProvider>
        </AuthProvider>
      </ThemeProvider>
      {(!splashDone || !fontsLoaded) && <SplashScreen onFinish={() => setSplashDone(true)} />}
    </View>
  )
}
