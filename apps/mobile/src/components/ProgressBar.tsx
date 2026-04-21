import React from 'react'
import { View, Text } from 'react-native'
import { useTheme } from '@/theme/ThemeContext'

interface ProgressBarProps {
  start: number
  current: number
  target: number
  label?: string
  unit?: string
}

export function ProgressBar({ start, current, target, label, unit = 'kg' }: ProgressBarProps) {
  const { tokens, fonts } = useTheme()
  const progress = Math.min((current - start) / Math.max(target - start, 1), 1)

  return (
    <View>
      {label && (
        <Text style={{ fontFamily: fonts.sansB, fontSize: 12, color: tokens.text, marginBottom: 4 }}>
          {label}
        </Text>
      )}
      <View style={{ height: 4, backgroundColor: tokens.surface2, overflow: 'hidden' }}>
        <View style={{ height: '100%', width: `${Math.round(progress * 100)}%`, backgroundColor: tokens.accent }} />
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
        <Text style={{ fontFamily: fonts.mono, fontSize: 10, color: tokens.textMute }}>
          {start}{unit}
        </Text>
        <Text style={{ fontFamily: fonts.monoB, fontSize: 10, color: tokens.accent }}>
          {current}{unit}
        </Text>
        <Text style={{ fontFamily: fonts.mono, fontSize: 10, color: tokens.textMute }}>
          {target}{unit}
        </Text>
      </View>
    </View>
  )
}
