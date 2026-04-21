import React from 'react'
import { View, Text } from 'react-native'
import { useTheme } from '@/theme/ThemeContext'
import { useTranslation } from 'react-i18next'

interface MacroRowProps {
  protein: number
  carbs: number
  fat: number
}

export function MacroRow({ protein, carbs, fat }: MacroRowProps) {
  const { tokens, fonts } = useTheme()
  const { t } = useTranslation()

  const macros = [
    { label: t('diet.protein'), value: protein, color: tokens.accent },
    { label: t('diet.carbs') ?? 'Glucides', value: carbs, color: tokens.amber },
    { label: t('diet.fat') ?? 'Lipides', value: fat, color: tokens.green },
  ]

  return (
    <View style={{ flexDirection: 'row', gap: 6 }}>
      {macros.map((m) => (
        <View key={m.label} style={{ flex: 1, borderWidth: 1, borderColor: m.color, padding: 12 }}>
          <Text style={{ fontFamily: fonts.sansM, fontSize: 10, letterSpacing: 1.6, textTransform: 'uppercase', color: tokens.textMute }}>
            {m.label}
          </Text>
          <Text style={{ fontFamily: fonts.sansX, fontSize: 20, color: m.color }}>
            {m.value}
            <Text style={{ fontFamily: fonts.sansM, fontSize: 11, color: tokens.textMute }}>g</Text>
          </Text>
        </View>
      ))}
    </View>
  )
}
