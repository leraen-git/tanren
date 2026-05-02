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
  const { tokens, fonts, label } = useTheme()
  const { t } = useTranslation()

  const macros = [
    { label: t('diet.protein'), value: protein, color: tokens.accent },
    { label: t('diet.carbs') ?? 'Glucides', value: carbs, color: tokens.amber },
    { label: t('diet.fat') ?? 'Lipides', value: fat, color: tokens.green },
  ]

  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      {macros.map((m) => (
        <View key={m.label} style={{ flex: 1, borderWidth: 1, borderColor: m.color, paddingVertical: 10, paddingHorizontal: 8, alignItems: 'center' }}>
          <Text style={{ ...label.sm, color: tokens.textMute, marginBottom: 2 }}>
            {m.label}
          </Text>
          <Text style={{ fontFamily: fonts.sansX, fontSize: 18, color: m.color, lineHeight: 18 }}>
            {m.value}
            <Text style={{ fontFamily: fonts.sansM, fontSize: 10, color: tokens.textMute }}>g</Text>
          </Text>
        </View>
      ))}
    </View>
  )
}
