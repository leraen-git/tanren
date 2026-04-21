import React from 'react'
import { Text, type ViewStyle } from 'react-native'
import { useTheme } from '@/theme/ThemeContext'

interface Props {
  char?: '鍛' | '錬'
  color?: string
}

export function KanjiWatermark({ char = '鍛', color }: Props) {
  const { tokens } = useTheme()

  return (
    <Text
      style={{
        position: 'absolute',
        top: 80,
        right: -10,
        fontFamily: 'NotoSerifJP_900Black_subset',
        fontSize: 48,
        letterSpacing: -2.4,
        color: color ?? tokens.accent,
        opacity: tokens.kanjiOpacity,
      } as ViewStyle}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {char}
    </Text>
  )
}
