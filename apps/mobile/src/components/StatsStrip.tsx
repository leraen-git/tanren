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
  const { tokens, fonts } = useTheme()

  return (
    <View style={{ flexDirection: 'row', backgroundColor: tokens.border }}>
      {stats.map((s, i) => (
        <View
          key={s.label}
          style={{
            flex: 1,
            alignItems: 'center',
            paddingVertical: 14,
            backgroundColor: tokens.bg,
            marginLeft: i > 0 ? 1 : 0,
          }}
        >
          <Text style={{ fontFamily: fonts.sansX, fontSize: 24, color: s.highlight ? tokens.accent : tokens.text, lineHeight: 24 }}>
            {s.value}
          </Text>
          <Text style={{
            fontFamily: fonts.sansM, fontSize: 10, letterSpacing: 2,
            textTransform: 'uppercase', color: tokens.textMute, marginTop: 4,
          }}>
            {s.label}
          </Text>
        </View>
      ))}
    </View>
  )
}
