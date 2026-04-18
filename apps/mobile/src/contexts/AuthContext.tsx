import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import * as AppleAuthentication from 'expo-apple-authentication'
import * as Google from 'expo-auth-session/providers/google'
import * as WebBrowser from 'expo-web-browser'
import { getToken, setToken, clearToken } from '@/services/authTokenService'

// Required for expo-auth-session redirect handling on iOS/Android
WebBrowser.maybeCompleteAuthSession()

const API_URL = process.env['EXPO_PUBLIC_API_URL'] ?? 'http://localhost:3000'

export type AuthStatus = 'loading' | 'unauthenticated' | 'authenticated'

interface AuthContextValue {
  status: AuthStatus
  token: string | null
  /** Triggers the native Apple Sign-In sheet and exchanges the token with the API. */
  signInWithApple: () => Promise<void>
  /** Opens a browser for Google OAuth and exchanges the token with the API. */
  signInWithGoogle: () => Promise<void>
  /** Whether the Google Sign-In button should be shown (requires client IDs to be configured). */
  googleAvailable: boolean
  /**
   * Email OTP — step 1: request a 6-digit code sent to the given address.
   * Does not authenticate; call verifyOtp next.
   */
  requestOtp: (email: string) => Promise<void>
  /**
   * Email OTP — step 2: verify the code and sign in.
   */
  verifyOtp: (email: string, code: string) => Promise<void>
  /** Create an anonymous guest account and sign in immediately. */
  signInAsGuest: () => Promise<void>
  /** Dev-only: sign in as the seeded dev user without Apple. No-op in production. */
  devSignIn: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
  status: 'loading',
  token: null,
  signInWithApple: async () => {},
  signInWithGoogle: async () => {},
  googleAvailable: false,
  requestOtp: async () => {},
  verifyOtp: async () => {},
  signInAsGuest: async () => {},
  devSignIn: async () => {},
  signOut: async () => {},
})

// ─── Shared fetch helper ──────────────────────────────────────────────────────

async function authFetch(path: string, body: Record<string, unknown>): Promise<{ token: string }> {
  const res = await fetch(`${API_URL}/trpc/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    let message = 'Sign-in failed'
    try {
      const err: { error?: { message?: string } } = await res.json()
      message = err?.error?.message ?? message
    } catch {}
    throw new Error(message)
  }
  const data = await res.json() as { result: { data: { token: string } } }
  return { token: data.result.data.token }
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [token, setTokenState] = useState<string | null>(null)

  // Google OAuth — hooks must always be called
  const [_req, _res, promptAsync] = Google.useAuthRequest({
    iosClientId: process.env['EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID'] ?? '',
    webClientId: process.env['EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID'] ?? '',
  })

  const googleAvailable = __DEV__ || !!(
    process.env['EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID'] &&
    process.env['EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID']
  )

  // On mount: restore token from SecureStore
  useEffect(() => {
    getToken().then((stored) => {
      if (stored) {
        setTokenState(stored)
        setStatus('authenticated')
      } else {
        setStatus('unauthenticated')
      }
    }).catch(() => {
      setStatus('unauthenticated')
    })
  }, [])

  const saveAndAuthenticate = useCallback(async (jwt: string) => {
    await setToken(jwt)
    setTokenState(jwt)
    setStatus('authenticated')
  }, [])

  const signInWithApple = useCallback(async () => {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    })

    const fullName = [
      credential.fullName?.givenName,
      credential.fullName?.familyName,
    ].filter(Boolean).join(' ') || null

    const { token } = await authFetch('auth.signInWithApple', {
      identityToken: credential.identityToken,
      fullName,
      email: credential.email ?? null,
    })
    await saveAndAuthenticate(token)
  }, [saveAndAuthenticate])

  const signInWithGoogle = useCallback(async () => {
    if (!googleAvailable) throw new Error('Google Sign-In is not configured')

    const result = await promptAsync()
    if (result.type === 'cancel' || result.type === 'dismiss') return
    if (result.type !== 'success') throw new Error('Google Sign-In failed')

    const accessToken = result.authentication?.accessToken
    if (!accessToken) throw new Error('No access token received from Google')

    const { token } = await authFetch('auth.signInWithGoogle', { accessToken })
    await saveAndAuthenticate(token)
  }, [googleAvailable, promptAsync, saveAndAuthenticate])

  const requestOtp = useCallback(async (email: string) => {
    const res = await fetch(`${API_URL}/trpc/auth.requestOtp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    if (!res.ok) {
      let message = 'Could not send code'
      try {
        const err: { error?: { message?: string } } = await res.json()
        message = err?.error?.message ?? message
      } catch {}
      throw new Error(message)
    }
  }, [])

  const verifyOtp = useCallback(async (email: string, code: string) => {
    const { token } = await authFetch('auth.verifyOtp', { email, code })
    await saveAndAuthenticate(token)
  }, [saveAndAuthenticate])

  const signInAsGuest = useCallback(async () => {
    const { token } = await authFetch('auth.guestSignIn', {})
    await saveAndAuthenticate(token)
  }, [saveAndAuthenticate])

  const devSignIn = useCallback(async () => {
    if (!__DEV__) return
    const userId = process.env['EXPO_PUBLIC_DEV_USER_ID']
    if (!userId) throw new Error('EXPO_PUBLIC_DEV_USER_ID is not set')
    const { token } = await authFetch('auth.devSignIn', { userId })
    await saveAndAuthenticate(token)
  }, [saveAndAuthenticate])

  const signOut = useCallback(async () => {
    const currentToken = token
    if (currentToken) {
      try {
        await fetch(`${API_URL}/trpc/auth.signOut`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${currentToken}`,
          },
          body: JSON.stringify({}),
        })
      } catch {}
    }
    await clearToken()
    setTokenState(null)
    setStatus('unauthenticated')
  }, [token])

  return (
    <AuthContext.Provider value={{
      status, token,
      signInWithApple, signInWithGoogle, googleAvailable,
      requestOtp, verifyOtp, signInAsGuest,
      devSignIn, signOut,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
