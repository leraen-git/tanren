import React, { type ReactNode } from 'react'
import { KeyboardAvoidingView, Platform, type ViewStyle } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTheme } from '@/theme/ThemeContext'
import { KanjiWatermark } from './KanjiWatermark'

interface ScreenProps {
  children: ReactNode
  showKanji?: boolean
  kanjiChar?: '鍛' | '錬'
  edges?: ('top' | 'bottom' | 'left' | 'right')[]
  style?: ViewStyle
  keyboardAvoiding?: boolean
}

export function Screen({
  children,
  showKanji = false,
  kanjiChar = '鍛',
  edges = ['top'],
  style,
  keyboardAvoiding = true,
}: ScreenProps) {
  const { tokens } = useTheme()

  return (
    <SafeAreaView
      edges={edges}
      style={[{ flex: 1, backgroundColor: tokens.bg }, style]}
    >
      {showKanji && <KanjiWatermark char={kanjiChar} />}
      {keyboardAvoiding ? (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          {children}
        </KeyboardAvoidingView>
      ) : (
        children
      )}
    </SafeAreaView>
  )
}
