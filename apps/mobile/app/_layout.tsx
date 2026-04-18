import { Stack, router } from 'expo-router'
import { ThemeProvider } from '@/theme/ThemeContext'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { trpc } from '@/lib/trpc'
import { httpBatchLink } from '@trpc/client'
import React, { useState, useEffect, useRef } from 'react'
import { View, AppState, type AppStateStatus } from 'react-native'
import { useFonts, BarlowCondensed_300Light, BarlowCondensed_400Regular, BarlowCondensed_500Medium, BarlowCondensed_700Bold, BarlowCondensed_900Black } from '@expo-google-fonts/barlow-condensed'
import * as Notifications from 'expo-notifications'
import { useTranslation } from 'react-i18next'
import { SplashScreen } from '@/components/SplashScreen'
import { initMusicService } from '@/services/musicService'
import { setupNotificationChannels, requestPermission } from '@/services/notificationPermissions'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { rescheduleAll } from '@/services/notificationScheduler'
import { useNotificationSettingsStore } from '@/stores/notificationSettingsStore'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { GuestBanner } from '@/components/GuestBanner'
import { GuestBannerProvider } from '@/contexts/GuestBannerContext'
import { ErrorBoundary } from '@/components/ErrorBoundary'
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
          const h: Record<string, string> = {
            'X-Request-Timestamp': Date.now().toString(),
          }
          if (t) h['Authorization'] = `Bearer ${t}`
          return h
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
      router.replace(skipConsent ? '/onboarding/step1' : '/onboarding/step0')
    }
  }, [me.data])

  return null
}

function NotificationWatcher() {
  const settingsRef = useRef(useNotificationSettingsStore.getState())
  const { i18n } = useTranslation()
  const langRef = useRef<'en' | 'fr'>((i18n.language === 'fr' ? 'fr' : 'en') as 'en' | 'fr')

  useEffect(() => {
    langRef.current = (i18n.language === 'fr' ? 'fr' : 'en') as 'en' | 'fr'
  }, [i18n.language])

  useEffect(() => {
    const unsub = useNotificationSettingsStore.subscribe((s) => { settingsRef.current = s })
    return unsub
  }, [])

  useEffect(() => {
    setupNotificationChannels()
    AsyncStorage.getItem('notif_permission_asked').then((asked) => {
      if (!asked) {
        requestPermission().then(() =>
          AsyncStorage.setItem('notif_permission_asked', '1'),
        )
      }
    })
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') {
        rescheduleAll(settingsRef.current, undefined, langRef.current).catch(() => null)
      }
    })
    const tapSub = Notifications.addNotificationResponseReceivedListener((response) => {
      const screen = response.notification.request.content.data?.screen as string | undefined
      if (screen === 'workout') router.navigate('/')
      else if (screen === 'diet') router.navigate('/diet')
      else router.navigate('/')
    })
    return () => { sub.remove(); tapSub.remove() }
  }, [])

  return null
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const { status } = useAuth()
  const { data: user } = trpc.users.me.useQuery()
  const isGuest = user?.authProvider === 'guest'

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/sign-in')
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
    BarlowCondensed_900Black,
    // Subsetted Noto Serif JP — only contains 鍛錬 characters (~2.7KB each)
    NotoSerifJP_700Bold_subset: require('../assets/fonts/NotoSerifJP_700Bold_subset.ttf'),
    NotoSerifJP_900Black_subset: require('../assets/fonts/NotoSerifJP_900Black_subset.ttf'),
  })

  useEffect(() => {
    initMusicService().catch(() => null)
  }, [])

  return (
    <View style={{ flex: 1 }}>
      <ErrorBoundary>
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
      </ErrorBoundary>
      {(!splashDone || !fontsLoaded) && <SplashScreen onFinish={() => setSplashDone(true)} />}
    </View>
  )
}
