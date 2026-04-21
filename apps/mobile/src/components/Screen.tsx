import React, { type ReactNode } from 'react'
import { View, type ViewStyle } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTheme } from '@/theme/ThemeContext'
import { KanjiWatermark } from './KanjiWatermark'

interface ScreenProps {
  children: ReactNode
  showKanji?: boolean
  kanjiChar?: '鍛' | '錬'
  edges?: ('top' | 'bottom' | 'left' | 'right')[]
  style?: ViewStyle
}

export function Screen({
  children,
  showKanji = false,
  kanjiChar = '鍛',
  edges = ['top'],
  style,
}: ScreenProps) {
  const { tokens } = useTheme()

  return (
    <SafeAreaView
      edges={edges}
      style={[{ flex: 1, backgroundColor: tokens.bg }, style]}
    >
      {showKanji && <KanjiWatermark char={kanjiChar} />}
      {children}
    </SafeAreaView>
  )
}
