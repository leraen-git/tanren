import React, { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useTheme } from '@/theme/ThemeContext'
import { colors as tokenColors } from '@/theme/tokens'
import { trpc } from '@/lib/trpc'
import { useTranslation } from 'react-i18next'

export default function OnboardingStep1() {
  const { colors, typography, spacing, radius } = useTheme()
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [gender, setGender] = useState<'male' | 'female' | null>(null)
  const updateMe = trpc.users.updateMe.useMutation()

  const handleNext = async () => {
    if (!name.trim()) {
      Alert.alert(t('onboarding.alertMissingName'), t('onboarding.alertMissingNameDesc'))
      return
    }
    if (!gender) {
      Alert.alert(t('onboarding.alertMissingGender'), t('onboarding.alertMissingGenderDesc'))
      return
    }
    await updateMe.mutateAsync({ name: name.trim(), gender })
    router.push('/onboarding/step2' as any)
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ flex: 1, padding: spacing.xl, gap: spacing.xl, justifyContent: 'center' }}>

        {/* Progress dots */}
        <View style={{ flexDirection: 'row', gap: spacing.sm, justifyContent: 'center' }}>
          <View style={{ width: 24, height: 6, borderRadius: 3, backgroundColor: colors.primary }} />
          <View style={{ width: 8, height: 6, borderRadius: 3, backgroundColor: colors.surface2 }} />
        </View>

        {/* Title */}
        <View style={{ gap: spacing.sm }}>
          <Text style={{ fontFamily: typography.family.extraBold, fontSize: typography.size['3xl'], color: colors.textPrimary }}>
            {t('onboarding.welcomeTo')}{'\n'}<Text style={{ color: colors.primary }}>FitTrack</Text>
          </Text>
          <Text style={{ fontFamily: typography.family.regular, fontSize: typography.size.body, color: colors.textMuted }}>
            {t('onboarding.step1Subtitle')}
          </Text>
        </View>

        {/* Name */}
        <View style={{ gap: spacing.sm }}>
          <Text style={{ fontFamily: typography.family.semiBold, fontSize: typography.size.body, color: colors.textPrimary }}>
            {t('onboarding.nameLabel')}
          </Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder={t('onboarding.namePlaceholder')}
            placeholderTextColor={colors.textMuted}
            autoFocus
            style={{
              backgroundColor: colors.surface,
              borderRadius: radius.md,
              padding: spacing.base,
              fontFamily: typography.family.semiBold,
              fontSize: typography.size.xl,
              color: colors.textPrimary,
              borderWidth: 2,
              borderColor: name ? colors.primary : 'transparent',
            }}
            accessibilityLabel={t('onboarding.nameLabel')}
          />
        </View>

        {/* Gender */}
        <View style={{ gap: spacing.sm }}>
          <Text style={{ fontFamily: typography.family.semiBold, fontSize: typography.size.body, color: colors.textPrimary }}>
            {t('onboarding.genderLabel')}
          </Text>
          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            {(['male', 'female'] as const).map((g) => {
              const selected = gender === g
              const emoji = g === 'male' ? '♂️' : '♀️'
              const label = g === 'male' ? t('intake.male') : t('intake.female')
              return (
                <TouchableOpacity
                  key={g}
                  onPress={() => setGender(g)}
                  style={{
                    flex: 1,
                    paddingVertical: spacing.lg,
                    borderRadius: radius.lg,
                    borderWidth: 2,
                    borderColor: selected ? colors.primary : colors.surface2,
                    backgroundColor: selected ? `${colors.primary}18` : colors.surface,
                    alignItems: 'center',
                    gap: spacing.sm,
                  }}
                  accessibilityLabel={label}
                  accessibilityRole="button"
                >
                  <Text style={{ fontSize: typography.size['3xl'] }}>{emoji}</Text>
                  <Text style={{
                    fontFamily: selected ? typography.family.bold : typography.family.regular,
                    fontSize: typography.size.body,
                    color: selected ? colors.primary : colors.textMuted,
                  }}>
                    {label}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>
        </View>

        {/* Privacy disclaimer */}
        <Text style={{
          fontFamily: typography.family.regular,
          fontSize: typography.size.xs,
          color: colors.textMuted,
          textAlign: 'center',
          lineHeight: 16,
          marginTop: spacing.base,
        }}>
          {t('onboarding.privacyDisclaimer')}
        </Text>

        {/* Next button */}
        <TouchableOpacity
          onPress={handleNext}
          disabled={updateMe.isPending}
          style={{
            backgroundColor: name && gender ? colors.primary : colors.surface2,
            borderRadius: radius.lg,
            paddingVertical: spacing.base,
            alignItems: 'center',
            marginTop: spacing.base,
          }}
          accessibilityLabel={t('onboarding.continue')}
          accessibilityRole="button"
        >
          <Text style={{
            fontFamily: typography.family.extraBold,
            fontSize: typography.size.xl,
            color: name && gender ? tokenColors.white : colors.textMuted,
          }}>
            {t('onboarding.continue')}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}
