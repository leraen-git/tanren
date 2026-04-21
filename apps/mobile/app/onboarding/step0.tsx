import React from 'react'
import { View, Text, TouchableOpacity, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useTheme } from '@/theme/ThemeContext'
import { trpc } from '@/lib/trpc'
import { useTranslation } from 'react-i18next'

function DataRow({
  label, value, muted,
}: {
  label: string
  value: string
  muted?: boolean
}) {
  const { tokens, fonts } = useTheme()
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: tokens.border }}>
      <Text style={{ fontFamily: fonts.sans, fontSize: 12, color: tokens.textMute, flex: 1 }}>
        {label}
      </Text>
      <Text style={{
        fontFamily: muted ? fonts.sans : fonts.sansB,
        fontSize: 12,
        color: muted ? tokens.textMute : tokens.text,
        textAlign: 'right',
        maxWidth: '55%',
      }}>
        {value}
      </Text>
    </View>
  )
}

export default function OnboardingStep0() {
  const { tokens, fonts } = useTheme()
  const { t } = useTranslation()
  const { data: user } = trpc.users.me.useQuery()

  const isGoogle = user?.authProvider === 'google'
  const isPrivateRelay = user?.email?.endsWith('@privaterelay.appleid.com') ?? false
  const displayEmail = isPrivateRelay
    ? t('onboarding.step0PrivateEmail')
    : (user?.email ?? '...')

  const hasName = user?.name && user.name !== 'Athlete'

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: tokens.bg }}>
      <ScrollView
        contentContainerStyle={{ padding: 20, gap: 24 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Progress dots */}
        <View style={{ flexDirection: 'row', gap: 4, justifyContent: 'center', marginTop: 16 }}>
          <View style={{ width: 16, height: 6, backgroundColor: tokens.accent }} />
          <View style={{ width: 6, height: 6, backgroundColor: tokens.border }} />
          <View style={{ width: 6, height: 6, backgroundColor: tokens.border }} />
          <View style={{ width: 6, height: 6, backgroundColor: tokens.border }} />
        </View>

        {/* Title */}
        <View style={{ gap: 6 }}>
          <Text style={{ fontFamily: fonts.sansX, fontSize: 24, color: tokens.text, textTransform: 'uppercase' }}>
            {t('onboarding.step0Title')}{'\n'}
            <Text style={{ color: tokens.accent }}>
              {t('onboarding.step0TitleHighlight')}
            </Text>
          </Text>
          <Text style={{ fontFamily: fonts.sans, fontSize: 13, color: tokens.textMute, lineHeight: 20 }}>
            {t('onboarding.step0Subtitle')}
          </Text>
        </View>

        {/* What the provider shared */}
        <View style={{ borderWidth: 1, borderColor: tokens.border, padding: 12, gap: 4 }}>
          <Text style={{ fontFamily: fonts.sansB, fontSize: 9, color: tokens.textMute, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 4 }}>
            {isGoogle ? t('onboarding.step0GoogleSection') : t('onboarding.step0AppleSection')}
          </Text>
          <DataRow label={t('onboarding.step0Email')} value={displayEmail} />
          {hasName && (
            <DataRow label={t('onboarding.step0Name')} value={user!.name} />
          )}
          {isGoogle && user?.avatarUrl && (
            <DataRow label={t('onboarding.step0AvatarUrl')} value="V" />
          )}
        </View>

        {/* What we'll ask next */}
        <View style={{ borderWidth: 1, borderColor: tokens.border, padding: 12, gap: 4 }}>
          <Text style={{ fontFamily: fonts.sansB, fontSize: 9, color: tokens.textMute, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 4 }}>
            {t('onboarding.step0YouSection')}
          </Text>
          <DataRow label={t('onboarding.step0Gender')} value={t('onboarding.step0YouEnter')} muted />
          <DataRow label={t('onboarding.step0FitnessProfile')} value={t('onboarding.step0YouEnter')} muted />
          <DataRow label={t('onboarding.step0Measurements')} value={t('onboarding.step0Optional')} muted />
        </View>

        {/* Privacy policy link */}
        <TouchableOpacity
          onPress={() => router.push('/privacy')}
          accessibilityRole="link"
          accessibilityLabel={t('onboarding.step0PrivacyLink')}
        >
          <Text style={{
            fontFamily: fonts.sansB, fontSize: 11, color: tokens.accent,
            textAlign: 'center', textTransform: 'uppercase', letterSpacing: 1,
          }}>
            {t('onboarding.step0PrivacyLink')}
          </Text>
        </TouchableOpacity>

        {/* Agree & continue */}
        <TouchableOpacity
          onPress={() => router.push('/onboarding/step1')}
          style={{
            backgroundColor: tokens.accent,
            height: 48,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 20,
          }}
          accessibilityLabel={t('onboarding.step0Agree')}
          accessibilityRole="button"
        >
          <Text style={{ fontFamily: fonts.sansX, fontSize: 14, color: '#FFFFFF', textTransform: 'uppercase', letterSpacing: 1 }}>
            {t('onboarding.step0Agree')}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}
