import React, { useState } from 'react'
import { View, Text, TouchableOpacity, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useTheme } from '@/theme/ThemeContext'
import { colors as tokenColors } from '@/theme/tokens'
import { trpc } from '@/lib/trpc'
import { useTranslation } from 'react-i18next'

export default function OnboardingStep2() {
  const { colors, typography, spacing, radius } = useTheme()
  const { t } = useTranslation()
  const [level, setLevel] = useState<'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | null>(null)
  const [days, setDays] = useState<number | null>(null)
  const [goal, setGoal] = useState<'WEIGHT_LOSS' | 'MUSCLE_GAIN' | 'MAINTENANCE' | null>(null)
  const updateMe = trpc.users.updateMe.useMutation()

  const LEVELS = [
    { value: 'BEGINNER' as const, label: t('profile.levelBeginner'), desc: t('onboarding.levelBeginnerDesc') },
    { value: 'INTERMEDIATE' as const, label: t('profile.levelIntermediate'), desc: t('onboarding.levelIntermediateDesc') },
    { value: 'ADVANCED' as const, label: t('profile.levelAdvanced'), desc: t('onboarding.levelAdvancedDesc') },
  ]

  const GOALS = [
    { value: 'WEIGHT_LOSS' as const, label: t('profile.goalWeightLoss'), emoji: '🔥' },
    { value: 'MUSCLE_GAIN' as const, label: t('profile.goalMuscleGain'), emoji: '💪' },
    { value: 'MAINTENANCE' as const, label: t('profile.goalMaintenance'), emoji: '⚖️' },
  ]

  const canContinue = level && days && goal

  const handleFinish = async () => {
    if (!level || !days || !goal) return
    await updateMe.mutateAsync({ level, weeklyTarget: days, goal })
    router.push('/onboarding/step3' as any)
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={{ padding: spacing.xl, gap: spacing.xl }}
        showsVerticalScrollIndicator={false}
      >
        {/* Progress dots */}
        <View style={{ flexDirection: 'row', gap: spacing.sm, justifyContent: 'center', marginTop: spacing.base }}>
          <View style={{ width: 8, height: 6, borderRadius: 3, backgroundColor: colors.surface2 }} />
          <View style={{ width: 24, height: 6, borderRadius: 3, backgroundColor: colors.primary }} />
          <View style={{ width: 8, height: 6, borderRadius: 3, backgroundColor: colors.surface2 }} />
        </View>

        {/* Title */}
        <View style={{ gap: spacing.sm }}>
          <Text style={{ fontFamily: typography.family.extraBold, fontSize: typography.size['3xl'], color: colors.textPrimary }}>
            {t('onboarding.step2TitlePre')}{'\n'}<Text style={{ color: colors.primary }}>{t('onboarding.step2Title')}</Text>
          </Text>
          <Text style={{ fontFamily: typography.family.regular, fontSize: typography.size.body, color: colors.textMuted }}>
            {t('onboarding.step2Subtitle')}
          </Text>
        </View>

        {/* Level */}
        <View style={{ gap: spacing.sm }}>
          <Text style={{ fontFamily: typography.family.semiBold, fontSize: typography.size.body, color: colors.textPrimary }}>
            {t('onboarding.levelLabel')}
          </Text>
          <View style={{ gap: spacing.sm }}>
            {LEVELS.map((l) => {
              const selected = level === l.value
              return (
                <TouchableOpacity
                  key={l.value}
                  onPress={() => setLevel(l.value)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: spacing.base,
                    borderRadius: radius.md,
                    borderWidth: 2,
                    borderColor: selected ? colors.primary : colors.surface2,
                    backgroundColor: selected ? `${colors.primary}18` : colors.surface,
                  }}
                  accessibilityLabel={l.label}
                  accessibilityRole="button"
                >
                  <Text style={{
                    fontFamily: selected ? typography.family.bold : typography.family.semiBold,
                    fontSize: typography.size.body,
                    color: selected ? colors.primary : colors.textPrimary,
                  }}>
                    {l.label}
                  </Text>
                  <Text style={{
                    fontFamily: typography.family.regular,
                    fontSize: typography.size.sm,
                    color: colors.textMuted,
                  }}>
                    {l.desc}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>
        </View>

        {/* Training days */}
        <View style={{ gap: spacing.sm }}>
          <Text style={{ fontFamily: typography.family.semiBold, fontSize: typography.size.body, color: colors.textPrimary }}>
            {t('onboarding.daysLabel')}
          </Text>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            {[1, 2, 3, 4, 5, 6, 7].map((d) => {
              const selected = days === d
              return (
                <TouchableOpacity
                  key={d}
                  onPress={() => setDays(d)}
                  style={{
                    flex: 1,
                    aspectRatio: 1,
                    borderRadius: radius.md,
                    borderWidth: 2,
                    borderColor: selected ? colors.primary : colors.surface2,
                    backgroundColor: selected ? colors.primary : colors.surface,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  accessibilityLabel={String(d)}
                  accessibilityRole="button"
                >
                  <Text style={{
                    fontFamily: typography.family.bold,
                    fontSize: typography.size.body,
                    color: selected ? tokenColors.white : colors.textMuted,
                  }}>
                    {d}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>
        </View>

        {/* Goal */}
        <View style={{ gap: spacing.sm }}>
          <Text style={{ fontFamily: typography.family.semiBold, fontSize: typography.size.body, color: colors.textPrimary }}>
            {t('onboarding.goalLabel')}
          </Text>
          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            {GOALS.map((g) => {
              const selected = goal === g.value
              return (
                <TouchableOpacity
                  key={g.value}
                  onPress={() => setGoal(g.value)}
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
                  accessibilityLabel={g.label}
                  accessibilityRole="button"
                >
                  <Text style={{ fontSize: 28 }}>{g.emoji}</Text>
                  <Text style={{
                    fontFamily: selected ? typography.family.bold : typography.family.regular,
                    fontSize: typography.size.xs,
                    color: selected ? colors.primary : colors.textMuted,
                    textAlign: 'center',
                  }}>
                    {g.label}
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

        {/* Finish button */}
        <TouchableOpacity
          onPress={handleFinish}
          disabled={!canContinue || updateMe.isPending}
          style={{
            backgroundColor: canContinue ? colors.primary : colors.surface2,
            borderRadius: radius.lg,
            paddingVertical: spacing.base,
            alignItems: 'center',
            marginTop: spacing.sm,
            marginBottom: spacing.xl,
          }}
          accessibilityLabel={t('onboarding.continue')}
          accessibilityRole="button"
        >
          <Text style={{
            fontFamily: typography.family.extraBold,
            fontSize: typography.size.xl,
            color: canContinue ? tokenColors.white : colors.textMuted,
          }}>
            {t('onboarding.continue')}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}
