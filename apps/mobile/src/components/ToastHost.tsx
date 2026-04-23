import React from 'react'
import { Text, Pressable, StyleSheet } from 'react-native'
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useToastStore, type ToastType } from '@/stores/toastStore'
import { useTheme } from '@/theme/ThemeContext'

const typeColors: Record<ToastType, string> = {
  success: '#2BAE43',
  error: '#FF2D3F',
  info: '#AAAAAA',
}

export function ToastHost() {
  const toasts = useToastStore((s) => s.toasts)
  const dismiss = useToastStore((s) => s.dismiss)
  const insets = useSafeAreaInsets()
  const { tokens } = useTheme()

  if (toasts.length === 0) return null

  return (
    <>
      {toasts.map((toast) => (
        <Animated.View
          key={toast.id}
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(200)}
          style={[styles.container, { top: insets.top + 8, borderLeftColor: typeColors[toast.type] }]}
        >
          <Pressable onPress={() => dismiss(toast.id)} style={[styles.inner, { backgroundColor: tokens.surface2 }]}>
            <Text style={[styles.text, { color: tokens.text }]} numberOfLines={2}>{toast.message}</Text>
          </Pressable>
        </Animated.View>
      ))}
    </>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 10000,
    borderLeftWidth: 3,
  },
  inner: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  text: {
    fontFamily: 'BarlowCondensed_500Medium',
    fontSize: 14,
  },
})
