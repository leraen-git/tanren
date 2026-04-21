import React from 'react'
import { Text } from 'react-native'
import { useTheme } from '@/theme/ThemeContext'

interface GhostValueProps {
  label: string
  value: string
}

export function GhostValue({ label, value }: GhostValueProps) {
  const { tokens, typography } = useTheme()

  return (
    <Text
      style={{
        fontFamily: typography.family.sansM,
        fontSize: 10,
        letterSpacing: 1,
        textTransform: 'uppercase',
        color: tokens.textGhost,
      }}
    >
      {label}{' '}
      <Text style={{ fontFamily: typography.family.sansB, color: tokens.textMute }}>
        {value}
      </Text>
    </Text>
  )
}
