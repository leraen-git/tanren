import React from 'react'
import { View, Text } from 'react-native'
import { useTheme } from '@/theme/ThemeContext'

type Trend = 'up' | 'flat' | 'down'

interface CompareBadgeProps {
  percent: number
  trend: Trend
}

export function CompareBadge({ percent, trend }: CompareBadgeProps) {
  const { tokens, typography } = useTheme()

  const colorMap: Record<Trend, string> = {
    up: tokens.green,
    flat: tokens.amber,
    down: tokens.accent,
  }
  const color = colorMap[trend]
  const prefix = trend === 'up' ? '+' : trend === 'flat' ? '=' : ''
  const formatted = `${prefix}${percent.toFixed(1).replace('.', ',')}%`

  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: color,
        backgroundColor: `${color}1A`,
        paddingVertical: 3,
        paddingHorizontal: 8,
      }}
    >
      <Text
        style={{
          fontFamily: typography.family.sansB,
          fontSize: 11,
          letterSpacing: 0.5,
          color,
        }}
      >
        {formatted}
      </Text>
    </View>
  )
}
