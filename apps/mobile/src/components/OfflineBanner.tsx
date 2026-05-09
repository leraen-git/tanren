import React, { useSyncExternalStore } from 'react'
import { View, Text } from 'react-native'
import { onlineManager } from '@tanstack/react-query'
import { useTheme } from '@/theme/ThemeContext'
import { useTranslation } from 'react-i18next'

const subscribe = (cb: () => void) => onlineManager.subscribe(cb)
const getSnapshot = () => onlineManager.isOnline()

export function OfflineBanner() {
  const online = useSyncExternalStore(subscribe, getSnapshot)
  const { tokens, fonts } = useTheme()
  const { t } = useTranslation()

  if (online) return null

  return (
    <View style={{
      marginHorizontal: 16,
      marginBottom: 8,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderWidth: 1,
      borderColor: tokens.border,
      backgroundColor: tokens.surface1,
    }}>
      <Text style={{
        fontFamily: fonts.sans,
        fontSize: 12,
        color: tokens.textMute,
        textAlign: 'center',
      }}>
        {t('common.offlineBanner')}
      </Text>
    </View>
  )
}
