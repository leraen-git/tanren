import React from 'react'
import { View, Text } from 'react-native'
import { useTheme } from '@/theme/ThemeContext'

interface MacrosInlineProps {
  protein: number
  carbs: number
  fat: number
}

export function MacrosInline({ protein, carbs, fat }: MacrosInlineProps) {
  const { tokens, fonts } = useTheme()

  const items = [
    { key: 'P', value: protein, color: tokens.accent },
    { key: 'G', value: carbs, color: tokens.amber },
    { key: 'L', value: fat, color: tokens.green },
  ]

  return (
    <View style={{ flexDirection: 'row', gap: 12 }}>
      {items.map((m) => (
        <Text key={m.key} style={{ fontFamily: fonts.sansB, fontSize: 12, letterSpacing: 0.7, color: m.color }}>
          {m.key} {m.value}g
        </Text>
      ))}
    </View>
  )
}
