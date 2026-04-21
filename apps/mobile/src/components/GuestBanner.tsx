import React from 'react'
import { View, Text, TouchableOpacity } from 'react-native'
import { router } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '@/theme/ThemeContext'
import { trpc } from '@/lib/trpc'

export function GuestBanner() {
  const { tokens, fonts } = useTheme()
  const { t } = useTranslation()
  const { data: user } = trpc.users.me.useQuery()
  const insets = useSafeAreaInsets()

  if (user?.authProvider !== 'guest') return null

  return (
    <TouchableOpacity
      onPress={() => router.push('/sign-in?upgrade=1')}
      style={{
        backgroundColor: tokens.surface1,
        borderBottomWidth: 1,
        borderBottomColor: tokens.border,
        borderLeftWidth: 3,
        borderLeftColor: tokens.amber,
        paddingTop: insets.top + 4,
        paddingBottom: 8,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
      }}
      accessibilityLabel={t('guestBanner.message')}
      accessibilityRole="button"
    >
      <View style={{ width: 16, height: 16, borderWidth: 1, borderColor: tokens.amber, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontFamily: fonts.sansB, fontSize: 8, color: tokens.amber }}>!</Text>
      </View>
      <Text style={{ fontFamily: fonts.sans, fontSize: 11, color: tokens.textMute, flex: 1 }}>
        {t('guestBanner.message')}
      </Text>
      <Text style={{ fontFamily: fonts.sansB, fontSize: 11, color: tokens.amber, textTransform: 'uppercase', letterSpacing: 1 }}>
        {t('guestBanner.signIn')} {'->'}
      </Text>
    </TouchableOpacity>
  )
}
