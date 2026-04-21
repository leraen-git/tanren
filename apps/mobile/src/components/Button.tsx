import React from 'react'
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  type ViewStyle,
  type TextStyle,
} from 'react-native'
import { useTheme } from '@/theme/ThemeContext'

type Variant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps {
  label: string
  onPress: () => void
  variant?: Variant
  size?: Size
  loading?: boolean
  disabled?: boolean
  accessibilityLabel?: string
  style?: ViewStyle
}

const HEIGHT: Record<Size, number> = { sm: 36, md: 48, lg: 52 }

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  accessibilityLabel,
  style,
}: ButtonProps) {
  const { tokens, typography } = useTheme()

  const isPrimary = variant === 'primary' || variant === 'danger'

  const containerStyle: ViewStyle = {
    height: HEIGHT[size],
    paddingHorizontal: 20,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: disabled ? 0.5 : 1,
    ...(variant === 'primary' && { backgroundColor: tokens.accent }),
    ...(variant === 'danger' && { backgroundColor: tokens.accent }),
    ...(variant === 'secondary' && {
      backgroundColor: 'transparent',
      borderWidth: 1.5,
      borderColor: tokens.accent,
    }),
    ...(variant === 'outline' && {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: tokens.text,
    }),
    ...(variant === 'ghost' && { backgroundColor: 'transparent' }),
  }

  const textStyle: TextStyle = {
    fontFamily: typography.family.sansB,
    fontSize: size === 'sm' ? 13 : 15,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: isPrimary ? '#FFFFFF' : variant === 'secondary' ? tokens.accent : variant === 'outline' ? tokens.text : tokens.textMute,
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[containerStyle, style]}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole="button"
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? '#FFFFFF' : tokens.accent} />
      ) : (
        <Text style={textStyle}>{label}</Text>
      )}
    </TouchableOpacity>
  )
}
