import React from 'react'
import { TouchableOpacity, Text } from 'react-native'
import { useTheme } from '@/theme/ThemeContext'

interface ChipProps {
  label: string
  selected?: boolean
  onPress?: () => void
  accessibilityLabel?: string
}

export function Chip({ label, selected = false, onPress, accessibilityLabel }: ChipProps) {
  const { tokens, fonts } = useTheme()

  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        paddingVertical: 7,
        paddingHorizontal: 10,
        borderRadius: 0,
        borderWidth: 1,
        borderColor: selected ? tokens.accent : tokens.borderStrong,
        backgroundColor: selected ? tokens.accent : 'transparent',
      }}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole="button"
    >
      <Text
        style={{
          fontFamily: selected ? fonts.sansB : fonts.sans,
          fontSize: 10,
          letterSpacing: 1.4,
          textTransform: 'uppercase',
          color: selected ? '#FFFFFF' : tokens.textDim,
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  )
}
