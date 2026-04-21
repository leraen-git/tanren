import React from 'react'
import { View, TextInput, Text, type TextInputProps } from 'react-native'
import { useTheme } from '@/theme/ThemeContext'

interface InputProps extends Omit<TextInputProps, 'style'> {
  label?: string
  accessibilityLabel?: string
}

export function Input({ label, accessibilityLabel, ...props }: InputProps) {
  const { tokens, fonts } = useTheme()

  return (
    <View>
      {label && (
        <Text
          style={{
            fontFamily: fonts.sansM,
            fontSize: 10,
            letterSpacing: 1.6,
            textTransform: 'uppercase',
            color: tokens.textMute,
            marginBottom: 6,
          }}
        >
          {label}
        </Text>
      )}
      <TextInput
        {...props}
        placeholderTextColor={tokens.textGhost}
        style={{
          fontFamily: fonts.sansM,
          fontSize: 16,
          color: tokens.text,
          paddingBottom: 10,
          borderBottomWidth: 1,
          borderBottomColor: props.value ? tokens.text : tokens.borderStrong,
          borderRadius: 0,
        }}
        accessibilityLabel={accessibilityLabel ?? label}
      />
    </View>
  )
}
