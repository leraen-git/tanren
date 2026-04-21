import React from 'react'
import { ScrollView, TouchableOpacity, Text, View } from 'react-native'
import { useTheme } from '@/theme/ThemeContext'

interface PillFilterProps {
  options: string[]
  selected: string
  onSelect: (option: string) => void
}

export function PillFilter({ options, selected, onSelect }: PillFilterProps) {
  const { tokens, fonts } = useTheme()

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={{ flexDirection: 'row', gap: 4 }}>
        {options.map((option) => {
          const isSelected = option === selected
          return (
            <TouchableOpacity
              key={option}
              onPress={() => onSelect(option)}
              style={{
                paddingVertical: 6,
                paddingHorizontal: 12,
                borderWidth: 1,
                borderColor: isSelected ? tokens.accent : tokens.border,
                backgroundColor: isSelected ? tokens.accent : 'transparent',
              }}
              accessibilityLabel={`Filter by ${option}`}
              accessibilityRole="button"
            >
              <Text style={{
                fontFamily: isSelected ? fonts.sansB : fonts.sans,
                fontSize: 10,
                color: isSelected ? '#FFFFFF' : tokens.textMute,
                textTransform: 'uppercase',
                letterSpacing: 1,
              }}>
                {option}
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>
    </ScrollView>
  )
}
