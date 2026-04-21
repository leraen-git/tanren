import React, { type ReactNode } from 'react'
import { TouchableOpacity, View, type ViewStyle } from 'react-native'
import { useTheme } from '@/theme/ThemeContext'

interface CardProps {
  children: ReactNode
  onPress?: () => void
  style?: ViewStyle
  accessibilityLabel?: string
}

export const Card = React.memo(function Card({ children, onPress, style, accessibilityLabel }: CardProps) {
  const { tokens, spacing } = useTheme()

  const cardStyle: ViewStyle = {
    backgroundColor: tokens.surface1,
    borderWidth: 1,
    borderColor: tokens.border,
    borderRadius: 0,
    padding: spacing.base,
    ...style,
  }

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        style={cardStyle}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
      >
        {children}
      </TouchableOpacity>
    )
  }

  return <View style={cardStyle}>{children}</View>
})
