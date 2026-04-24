import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { Stack, router } from 'expo-router'
import { ThemeProvider, useTheme } from '@/theme/ThemeContext'
import { QueryClient } from '@tanstack/react-query'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { mmkvPersister } from '@/lib/queryPersister'
import { trpc } from '@/lib/trpc'
import { httpBatchLink } from '@trpc/client'
import React, { useState, useEffect, useRef } from 'react'
import { View, AppState, type AppStateStatus, StatusBar, StyleSheet } from 'react-native'
import { useFonts, BarlowCondensed_300Light, BarlowCondensed_400Regular, BarlowCondensed_500Medium, BarlowCondensed_700Bold, BarlowCondensed_900Black } from '@expo-google-fonts/barlow-condensed'
import { JetBrainsMono_400Regular, JetBrainsMono_700Bold } from '@expo-google-fonts/jetbrains-mono'
import * as Notifications from 'expo-notifications'
import { useTranslation } from 'react-i18next'
import { SplashScreen } from '@/components/SplashScreen'
import { initMusicService } from '@/services/musicService'
import { setupNotificationChannels, requestPermission, getPermissionStatus } from '@/services/notificationPermissions'
import { rescheduleAll } from '@/services/notificationScheduler'
import { useNotificationSettingsStore } from '@/stores/notificationSettingsStore'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { GuestBannerProvider } from '@/contexts/GuestBannerContext'
import * as Sentry from '@sentry/react-native'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { ToastHost } from '@/components/ToastHost'
import { useActiveSessionStore } from '@/stores/activeSessionStore'
import { useSyncWorker } from '@/hooks/useSyncWorker'
import { useProfile } from '@/data/useProfile'
import '@/i18n'

const SENTRY_DSN = process.env['EXPO_PUBLIC_SENTRY_DSN']
if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    tracesSampleRate: __DEV__ ? 1.0 : 0.2,
  })
}

// Handle incoming notification taps — deep-link to the relevant screen
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
})

const API_URL = process.env['EXPO_PUBLIC_API_URL'] ?? 'http://localhost:3000'

function TRPCProvider({ children }: { children: React.ReactNode }) {
  const { token } = useAuth()

  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 24 * 60 * 60 * 1000,
        retry: (failureCount, error: any) => {
          const status = error?.data?.httpStatus
          if (status && status >= 400 && status < 500) return false
          return failureCount < 2
        },
        retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
      },
      mutations: { retry: 0 },
    },
  }))

  const tokenRef = useRef<string | null>(token)
  const prevTokenRef = useRef<string | null>(token)
  useEffect(() => {
    const prev = prevTokenRef.current
    tokenRef.current = token
    prevTokenRef.current = token
    if (prev && prev !== token) {
      queryClient.clear()
    }
  }, [token, queryClient])

  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [httpBatchLink({
        url: `${API_URL}/trpc`,
        methodOverride: 'POST',
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
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{
          persister: mmkvPersister,
          maxAge: 24 * 60 * 60 * 1000,
        }}
        onSuccess={() => {
          queryClient.resumePausedMutations()
        }}
      >
        {children}
      </PersistQueryClientProvider>
    </trpc.Provider>
  )
}

function OnboardingGate() {
  const { status } = useAuth()
  const me = useProfile()
  const redirected = useRef(false)

  useEffect(() => {
    if (status !== 'authenticated') {
      redirected.current = false
      return
    }
    if (redirected.current) return
    if (me.data && !me.data.onboardingDone) {
      redirected.current = true
      const skipConsent = me.data.authProvider === 'guest' || me.data.authProvider === 'email'
      router.replace(skipConsent ? '/onboarding/step1' : '/onboarding/step0')
    }
  }, [me.data, status])

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

    const s = settingsRef.current
    const anyEnabled = s.workoutEnabled || s.hydrationEnabled ||
      Object.values(s.meals).some((m: any) => m.enabled)
    if (anyEnabled) {
      getPermissionStatus().then((status) => {
        if (status === 'undetermined') requestPermission()
      })
    }

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

function SessionResumeChecker() {
  const checked = useRef(false)
  useEffect(() => {
    if (checked.current) return
    checked.current = true

    const { currentWorkout, startedAt, exercises, finishSession } =
      useActiveSessionStore.getState()

    if (!currentWorkout) return

    if (!startedAt) {
      finishSession()
      return
    }

    const ts = startedAt instanceof Date
      ? startedAt.getTime()
      : new Date(startedAt as any).getTime()

    if (isNaN(ts)) {
      finishSession()
      return
    }

    const ageHours = (Date.now() - ts) / 3600000
    const hasIncompleteSets = exercises.some(ex =>
      ex.sets.some(s => !s.isCompleted)
    )

    if (ageHours < 3 && hasIncompleteSets) {
      router.push('/workout/active')
    } else {
      finishSession()
    }
  }, [])

  return null
}

function SyncWorkerHost() {
  useSyncWorker()
  return null
}

function ThemedStatusBar() {
  const { isDark } = useTheme()
  return <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const { status } = useAuth()
  const { data: user } = useProfile()
  const isGuest = user?.authProvider === 'guest'

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/sign-in')
    }
  }, [status])

  if (status === 'loading' || status === 'unauthenticated') return null

  return (
    <GuestBannerProvider value={isGuest ?? false}>
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
    JetBrainsMono_400Regular,
    JetBrainsMono_700Bold,
  })

  useEffect(() => {
    initMusicService().catch(() => null)
  }, [])

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#000000' }}>
      <ErrorBoundary>
        <ThemeProvider>
          <ThemedStatusBar />
          <AuthProvider>
            <TRPCProvider>
              <AuthGate>
                <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: 'transparent' } }} />
                {splashDone && <OnboardingGate />}
                {splashDone && <SessionResumeChecker />}
                <SyncWorkerHost />
                <NotificationWatcher />
                <ToastHost />
              </AuthGate>
            </TRPCProvider>
          </AuthProvider>
        </ThemeProvider>
      </ErrorBoundary>
      {!splashDone && (fontsLoaded
        ? <SplashScreen onFinish={() => setSplashDone(true)} />
        : <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: '#000000', zIndex: 9999 }} />
      )}
    </GestureHandlerRootView>
  )
}
