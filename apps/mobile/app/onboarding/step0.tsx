import React from 'react'
import { View, Text, TouchableOpacity, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useTheme } from '@/theme/ThemeContext'
import { colors as tokenColors } from '@/theme/tokens'
import { trpc } from '@/lib/trpc'
import { useTranslation } from 'react-i18next'

function DataRow({
  icon, label, value, muted,
}: {
  icon: string
  label: string
  value: string
  muted?: boolean
}) {
  const { colors, typography } = useTheme()
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <Text style={{ fontSize: 18, width: 28 }}>{icon}</Text>
      <Text style={{
        fontFamily: typography.family.regular,
        fontSize: typography.size.base,
        color: colors.textMuted,
        flex: 1,
      }}>
        {label}
      </Text>
      <Text style={{
        fontFamily: muted ? typography.family.regular : typography.family.semiBold,
        fontSize: typography.size.base,
        color: muted ? colors.textMuted : colors.textPrimary,
        textAlign: 'right',
        maxWidth: '55%',
      }}>
        {value}
      </Text>
    </View>
  )
}

export default function OnboardingStep0() {
  const { colors, typography, spacing, radius } = useTheme()
  const { t } = useTranslation()
  const { data: user } = trpc.users.me.useQuery()

  const isGoogle = user?.authProvider === 'google'
  const isPrivateRelay = user?.email?.endsWith('@privaterelay.appleid.com') ?? false
  const displayEmail = isPrivateRelay
    ? t('onboarding.step0PrivateEmail')
    : (user?.email ?? '…')

  // Apple: name only on first sign-in (excluded "Athlete" fallback)
  // Google: always provides name
  const hasName = user?.name && user.name !== 'Athlete'

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={{ padding: spacing.xl, gap: spacing.xl }}
        showsVerticalScrollIndicator={false}
      >
        {/* Progress dots — 4 steps total, step 0 active */}
        <View style={{ flexDirection: 'row', gap: spacing.sm, justifyContent: 'center', marginTop: spacing.base }}>
          <View style={{ width: 24, height: 6, borderRadius: 3, backgroundColor: colors.primary }} />
          <View style={{ width: 8, height: 6, borderRadius: 3, backgroundColor: colors.surface2 }} />
          <View style={{ width: 8, height: 6, borderRadius: 3, backgroundColor: colors.surface2 }} />
          <View style={{ width: 8, height: 6, borderRadius: 3, backgroundColor: colors.surface2 }} />
        </View>

        {/* Title */}
        <View style={{ gap: spacing.sm }}>
          <Text style={{
            fontFamily: typography.family.extraBold,
            fontSize: typography.size['3xl'],
            color: colors.textPrimary,
          }}>
            {t('onboarding.step0Title')}{'\n'}
            <Text style={{ color: colors.primary }}>
              {t('onboarding.step0TitleHighlight')}
            </Text>
          </Text>
          <Text style={{
            fontFamily: typography.family.regular,
            fontSize: typography.size.body,
            color: colors.textMuted,
            lineHeight: 22,
          }}>
            {t('onboarding.step0Subtitle')}
          </Text>
        </View>

        {/* What the provider shared */}
        <View style={{
          backgroundColor: colors.surface,
          borderRadius: radius.lg,
          padding: spacing.base,
          gap: spacing.md,
        }}>
          <Text style={{
            fontFamily: typography.family.semiBold,
            fontSize: typography.size.xs,
            color: colors.textMuted,
            textTransform: 'uppercase',
            letterSpacing: 1.2,
          }}>
            {isGoogle ? t('onboarding.step0GoogleSection') : t('onboarding.step0AppleSection')}
          </Text>
          <DataRow icon="✉️" label={t('onboarding.step0Email')} value={displayEmail} />
          {hasName && (
            <DataRow icon="👤" label={t('onboarding.step0Name')} value={user!.name} />
          )}
          {isGoogle && user?.avatarUrl && (
            <DataRow icon="🖼️" label={t('onboarding.step0AvatarUrl')} value="✓" />
          )}
        </View>

        {/* What we'll ask next */}
        <View style={{
          backgroundColor: colors.surface,
          borderRadius: radius.lg,
          padding: spacing.base,
          gap: spacing.md,
        }}>
          <Text style={{
            fontFamily: typography.family.semiBold,
            fontSize: typography.size.xs,
            color: colors.textMuted,
            textTransform: 'uppercase',
            letterSpacing: 1.2,
          }}>
            {t('onboarding.step0YouSection')}
          </Text>
          <DataRow icon="⚧️" label={t('onboarding.step0Gender')} value={t('onboarding.step0YouEnter')} muted />
          <DataRow icon="🏋️" label={t('onboarding.step0FitnessProfile')} value={t('onboarding.step0YouEnter')} muted />
          <DataRow icon="📏" label={t('onboarding.step0Measurements')} value={t('onboarding.step0Optional')} muted />
        </View>

        {/* Privacy policy link */}
        <TouchableOpacity
          onPress={() => router.push('/privacy' as any)}
          accessibilityRole="link"
          accessibilityLabel={t('onboarding.step0PrivacyLink')}
        >
          <Text style={{
            fontFamily: typography.family.regular,
            fontSize: typography.size.base,
            color: colors.primary,
            textAlign: 'center',
            textDecorationLine: 'underline',
          }}>
            {t('onboarding.step0PrivacyLink')}
          </Text>
        </TouchableOpacity>

        {/* Agree & continue */}
        <TouchableOpacity
          onPress={() => router.push('/onboarding/step1' as any)}
          style={{
            backgroundColor: colors.primary,
            borderRadius: radius.lg,
            paddingVertical: spacing.base,
            alignItems: 'center',
            marginBottom: spacing.xl,
          }}
          accessibilityLabel={t('onboarding.step0Agree')}
          accessibilityRole="button"
        >
          <Text style={{
            fontFamily: typography.family.extraBold,
            fontSize: typography.size.xl,
            color: tokenColors.white,
          }}>
            {t('onboarding.step0Agree')}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}
