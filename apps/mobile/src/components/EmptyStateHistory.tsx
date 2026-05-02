import React from 'react'
import { View, Text, TouchableOpacity } from 'react-native'
import { useTheme } from '@/theme/ThemeContext'
import { useTranslation } from 'react-i18next'

interface EmptyStateGlobalProps {
  onStartSession: () => void
}

export function EmptyStateGlobal({ onStartSession }: EmptyStateGlobalProps) {
  const { tokens, fonts, label } = useTheme()
  const { t } = useTranslation()

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingVertical: 60 }}>
      <Text style={{ fontFamily: fonts.jpX, fontSize: 96, color: tokens.accent, opacity: 0.85 }}>
        錬
      </Text>
      <Text style={{ ...label.md, color: tokens.accent,
        marginTop: 12 }}>
        {t('history.emptyGlobalLabel')}
      </Text>
      <Text style={{
        fontFamily: fonts.sansX,
        fontSize: 24,
        color: tokens.text,
        textTransform: 'uppercase',
        textAlign: 'center',
        marginTop: 8,
      }}>
        {t('history.emptyGlobalTitle')}
      </Text>
      <Text style={{
        fontFamily: fonts.sans,
        fontSize: 14,
        color: tokens.textMute,
        textAlign: 'center',
        marginTop: 8,
        lineHeight: 20,
      }}>
        {t('history.emptyGlobalDesc')}
      </Text>
      <TouchableOpacity
        onPress={onStartSession}
        style={{
          backgroundColor: tokens.accent,
          height: 48,
          paddingHorizontal: 24,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 4,
          marginTop: 20,
        }}
        accessibilityLabel={t('history.emptyGlobalCTA')}
        accessibilityRole="button"
      >
        <Text style={{
          fontFamily: fonts.sansB,
          fontSize: 14,
          letterSpacing: 0.6,
          textTransform: 'uppercase',
          color: '#FFFFFF',
        }}>
          {t('history.emptyGlobalCTA')}
        </Text>
      </TouchableOpacity>
    </View>
  )
}

interface EmptyStateFilteredProps {
  onReset: () => void
}

export function EmptyStateFiltered({ onReset }: EmptyStateFilteredProps) {
  const { tokens, fonts, label } = useTheme()
  const { t } = useTranslation()

  return (
    <View style={{ alignItems: 'center', paddingVertical: 40, paddingHorizontal: 32 }}>
      <View style={{ width: 48, height: 48, borderWidth: 1, borderColor: tokens.border, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontFamily: fonts.jpX, fontSize: 24, color: tokens.textMute }}>錬</Text>
      </View>
      <Text style={{
        fontFamily: fonts.sansB,
        fontSize: 16,
        color: tokens.text,
        textTransform: 'uppercase',
        textAlign: 'center',
        marginTop: 12,
      }}>
        {t('history.emptyFilteredTitle')}
      </Text>
      <Text style={{
        fontFamily: fonts.sans,
        fontSize: 13,
        color: tokens.textMute,
        textAlign: 'center',
        marginTop: 6,
      }}>
        {t('history.emptyFilteredDesc')}
      </Text>
      <TouchableOpacity
        onPress={onReset}
        style={{ marginTop: 12 }}
        accessibilityLabel={t('history.emptyFilteredReset')}
        accessibilityRole="button"
      >
        <Text style={{
          fontFamily: fonts.sansB,
          fontSize: 12,
          color: tokens.accent,
          textTransform: 'uppercase',
          letterSpacing: 0.6,
        }}>
          {t('history.emptyFilteredReset')}
        </Text>
      </TouchableOpacity>
    </View>
  )
}
