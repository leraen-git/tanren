import { Stack, router } from 'expo-router'
import { ThemeProvider } from '@/theme/ThemeContext'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { trpc } from '@/lib/trpc'
import { httpBatchLink } from '@trpc/client'
import { useState, useEffect, useRef } from 'react'
import { View } from 'react-native'
import { SplashScreen } from '@/components/SplashScreen'

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

export default function RootLayout() {
  const [splashDone, setSplashDone] = useState(false)

  return (
    <View style={{ flex: 1 }}>
      <ThemeProvider>
        <TRPCProvider>
          <Stack screenOptions={{ headerShown: false }} />
          {splashDone && <OnboardingGate />}
        </TRPCProvider>
      </ThemeProvider>
      {!splashDone && <SplashScreen onFinish={() => setSplashDone(true)} />}
    </View>
  )
}
