import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { useColorScheme } from 'react-native'
import * as FileSystem from 'expo-file-system/legacy'
import {
  darkTheme,
  lightTheme,
  fonts,
  type ThemeTokens,
} from './tokens'

export type ThemePreference = 'light' | 'dark' | 'system'
type ColorScheme = 'light' | 'dark'

interface Theme {
  tokens: ThemeTokens
  fonts: typeof fonts
  scheme: ColorScheme
  isDark: boolean
  preference: ThemePreference
  setTheme: (pref: ThemePreference) => void
}

const PREF_FILE = (FileSystem.documentDirectory ?? '') + 'theme_pref.json'

async function loadPreference(): Promise<ThemePreference> {
  try {
    const content = await FileSystem.readAsStringAsync(PREF_FILE)
    const parsed = JSON.parse(content)
    if (parsed.preference === 'light' || parsed.preference === 'dark' || parsed.preference === 'system') {
      return parsed.preference
    }
  } catch {}
  return 'system'
}

async function savePreference(pref: ThemePreference) {
  try {
    await FileSystem.writeAsStringAsync(PREF_FILE, JSON.stringify({ preference: pref }))
  } catch {}
}

const ThemeContext = createContext<Theme | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const deviceScheme = (useColorScheme() ?? 'dark') as ColorScheme
  const [preference, setPreference] = useState<ThemePreference>('system')

  useEffect(() => {
    loadPreference().then(setPreference)
  }, [])

  const setTheme = useCallback((pref: ThemePreference) => {
    setPreference(pref)
    savePreference(pref)
  }, [])

  const scheme: ColorScheme = preference === 'system' ? deviceScheme : preference
  const isDark = scheme === 'dark'
  const tokens = isDark ? darkTheme : lightTheme

  const theme: Theme = {
    tokens,
    fonts,
    scheme,
    isDark,
    preference,
    setTheme,
  }

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
}

export function useTheme(): Theme {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider')
  return ctx
}
