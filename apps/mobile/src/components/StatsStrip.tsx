import React from 'react'
import { View, Text } from 'react-native'
import { useTheme } from '@/theme/ThemeContext'

interface Stat {
  value: string
  label: string
  highlight?: boolean
}

interface StatsStripProps {
  stats: [Stat, Stat, Stat]
}

export function StatsStrip({ stats }: StatsStripProps) {
  const { tokens, typography, spacing } = useTheme()

  return (
    <View style={{ flexDirection: 'row', borderWidth: 1, borderColor: tokens.border }}>
      {stats.map((s, i) => (
        <View
          key={s.label}
          style={{
            flex: 1,
            alignItems: 'center',
            paddingVertical: spacing.md,
            borderLeftWidth: i > 0 ? 1 : 0,
            borderLeftColor: tokens.border,
          }}
        >
          <Text
            style={{
              fontFamily: typography.family.sansX,
              fontSize: 24,
              color: s.highlight ? tokens.accent : tokens.text,
            }}
          >
            {s.value}
          </Text>
          <Text
            style={{
              fontFamily: typography.family.sansM,
              fontSize: 10,
              letterSpacing: 1.6,
              textTransform: 'uppercase',
              color: tokens.textMute,
              marginTop: 2,
            }}
          >
            {s.label}
          </Text>
        </View>
      ))}
    </View>
  )
}
