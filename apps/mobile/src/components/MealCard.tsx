import React from 'react'
import { View, Text, TouchableOpacity } from 'react-native'
import { useTheme } from '@/theme/ThemeContext'
import { MacrosInline } from './MacrosInline'

interface MealCardProps {
  typeLabel: string
  name: string
  calories: number
  protein: number
  carbs: number
  fat: number
  onPress?: () => void
  accessibilityLabel?: string
}

export function MealCard({
  typeLabel, name, calories, protein, carbs, fat, onPress, accessibilityLabel,
}: MealCardProps) {
  const { tokens, fonts } = useTheme()

  const content = (
    <View style={{ borderWidth: 1, borderColor: tokens.border, borderLeftWidth: 3, borderLeftColor: tokens.accent, padding: 14, paddingLeft: 16 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Text style={{ fontFamily: fonts.sansM, fontSize: 10, letterSpacing: 1.6, textTransform: 'uppercase', color: tokens.accent }}>
          {typeLabel}
        </Text>
        <Text style={{ fontFamily: fonts.sansX, fontSize: 16, color: tokens.text }}>
          {calories}
          <Text style={{ fontFamily: fonts.sansM, fontSize: 10, color: tokens.textMute }}> kcal</Text>
        </Text>
      </View>
      <Text style={{ fontFamily: fonts.sansX, fontSize: 17, letterSpacing: 0.17, textTransform: 'uppercase', color: tokens.text, marginTop: 4 }}>
        {name}
      </Text>
      <View style={{ marginTop: 6 }}>
        <MacrosInline protein={protein} carbs={carbs} fat={fat} />
      </View>
    </View>
  )

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7} accessibilityLabel={accessibilityLabel} accessibilityRole="button">
        {content}
      </TouchableOpacity>
    )
  }

  return content
}
