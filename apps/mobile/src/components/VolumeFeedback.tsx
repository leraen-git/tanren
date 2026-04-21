import React from 'react'
import { View, Text } from 'react-native'
import { useTheme } from '@/theme/ThemeContext'
import { useTranslation } from 'react-i18next'

interface VolumeFeedbackProps {
  percent: number
}

export function VolumeFeedback({ percent }: VolumeFeedbackProps) {
  const { tokens, fonts } = useTheme()
  const { t } = useTranslation()
  const sign = percent >= 0 ? '+' : ''
  const formatted = `${sign}${percent.toFixed(1).replace('.', ',')}%`

  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: tokens.borderStrong,
        borderStyle: 'dashed',
        padding: 14,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <Text style={{ fontFamily: fonts.jp, fontSize: 18, color: tokens.accent }}>
        鍛
      </Text>
      <View style={{ flex: 1 }}>
        <Text style={{
          fontFamily: fonts.sansX, fontSize: 14,
          letterSpacing: 0.6, textTransform: 'uppercase', color: tokens.accent,
        }}>
          Volume {formatted}
        </Text>
        <Text style={{ fontFamily: fonts.sans, fontSize: 12, color: tokens.textDim, marginTop: 2 }}>
          {t('workout.vsPreviousSession') ?? 'vs ta dernière séance sur cet exo'}
        </Text>
      </View>
    </View>
  )
}
