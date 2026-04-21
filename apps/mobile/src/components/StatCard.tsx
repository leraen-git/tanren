import React from 'react'
import { Text } from 'react-native'
import { useTheme } from '@/theme/ThemeContext'
import { Card } from './Card'

interface StatCardProps {
  label: string
  value: string
  trend?: 'up' | 'down' | 'neutral'
  accessibilityLabel?: string
}

export const StatCard = React.memo(function StatCard({ label, value, trend, accessibilityLabel }: StatCardProps) {
  const { tokens, fonts } = useTheme()

  const trendColor =
    trend === 'up' ? tokens.green : trend === 'down' ? tokens.accent : tokens.textMute

  return (
    <Card accessibilityLabel={accessibilityLabel ?? `${label}: ${value}`} style={{ flex: 1 }}>
      <Text style={{ fontFamily: fonts.sansM, fontSize: 10, color: tokens.textMute, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>
        {label}
      </Text>
      <Text style={{ fontFamily: fonts.sansX, fontSize: 20, color: trend ? trendColor : tokens.text }}>
        {value}
      </Text>
    </Card>
  )
})
