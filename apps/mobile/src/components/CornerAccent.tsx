import React from 'react'
import { View, type ViewStyle } from 'react-native'
import { useTheme } from '@/theme/ThemeContext'

type Position = 'tl' | 'tr' | 'bl' | 'br'

interface CornerAccentProps {
  position?: Position
  size?: 'sm' | 'md'
}

const POS_STYLE: Record<Position, ViewStyle> = {
  tl: { top: 0, left: 0 },
  tr: { top: 0, right: 0 },
  bl: { bottom: 0, left: 0 },
  br: { bottom: 0, right: 0 },
}

export function CornerAccent({ position = 'tl', size = 'sm' }: CornerAccentProps) {
  const { tokens } = useTheme()
  const px = size === 'sm' ? 10 : 12

  return (
    <View
      style={{
        position: 'absolute',
        width: px,
        height: px,
        backgroundColor: tokens.accent,
        ...POS_STYLE[position],
      }}
      pointerEvents="none"
    />
  )
}
