import React from 'react'
import { View, Text, TouchableOpacity } from 'react-native'
import { router } from 'expo-router'
import { useTheme } from '@/theme/ThemeContext'
import { useTranslation } from 'react-i18next'

interface ScreenHeaderProps {
  title?: string
  showBack?: boolean
  onBack?: () => void
  right?: React.ReactNode
}

export function ScreenHeader({ title, showBack = true, onBack, right }: ScreenHeaderProps) {
  const { tokens, fonts } = useTheme()
  const { t } = useTranslation()

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        minHeight: 48,
      }}
    >
      {showBack && (
        <TouchableOpacity
          onPress={onBack ?? (() => router.back())}
          accessibilityLabel={t('common.back')}
          accessibilityRole="button"
          style={{ marginRight: 12 }}
        >
          <Text
            style={{
              fontFamily: fonts.sansB,
              fontSize: 10,
              letterSpacing: 2,
              textTransform: 'uppercase',
              color: tokens.accent,
            }}
          >
            {'< BACK'}
          </Text>
        </TouchableOpacity>
      )}
      {title && (
        <Text
          style={{
            flex: 1,
            fontFamily: fonts.sansX,
            fontSize: 20,
            letterSpacing: 0.9,
            textTransform: 'uppercase',
            color: tokens.text,
            textAlign: showBack ? 'left' : 'left',
          }}
          numberOfLines={1}
        >
          {title}
        </Text>
      )}
      {right ? <View style={{ marginLeft: 'auto' }}>{right}</View> : null}
    </View>
  )
}
