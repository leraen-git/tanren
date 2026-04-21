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
  const { tokens, typography, spacing } = useTheme()
  const { t } = useTranslation()

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.base,
        paddingVertical: spacing.md,
        minHeight: 48,
      }}
    >
      {showBack && (
        <TouchableOpacity
          onPress={onBack ?? (() => router.back())}
          accessibilityLabel={t('common.back')}
          accessibilityRole="button"
          style={{ marginRight: spacing.md }}
        >
          <Text
            style={{
              fontFamily: typography.family.sansM,
              fontSize: 13,
              letterSpacing: 2,
              textTransform: 'uppercase',
              color: tokens.textMute,
            }}
          >
            {'‹ '}{t('common.back')}
          </Text>
        </TouchableOpacity>
      )}
      {title && (
        <Text
          style={{
            flex: 1,
            fontFamily: typography.family.sansX,
            fontSize: typography.size['2xl'],
            letterSpacing: 0.9,
            textTransform: 'uppercase',
            color: tokens.text,
            textAlign: showBack ? 'center' : 'left',
          }}
          numberOfLines={1}
        >
          {title}
        </Text>
      )}
      {right ? <View style={{ marginLeft: 'auto' }}>{right}</View> : showBack && title ? <View style={{ width: 60 }} /> : null}
    </View>
  )
}
