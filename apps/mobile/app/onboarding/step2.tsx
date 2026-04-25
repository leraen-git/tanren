import React, { useState } from 'react'
import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useTheme } from '@/theme/ThemeContext'
import { trpc } from '@/lib/trpc'
import { useTranslation } from 'react-i18next'
import { useOnboardingStore } from '@/stores/onboardingStore'

export default function OnboardingStep2() {
  const { tokens, fonts } = useTheme()
  const { t } = useTranslation()
  const ob = useOnboardingStore()
  const [level, setLevel] = useState<'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | null>(ob.level)
  const [days, setDays] = useState<number | null>(ob.weeklyTarget)
  const [goal, setGoal] = useState<'WEIGHT_LOSS' | 'MUSCLE_GAIN' | 'MAINTENANCE' | null>(ob.goal)
  const updateMe = trpc.users.updateMe.useMutation({
    onError: (err) => Alert.alert(t('common.error'), err.message),
  })

  React.useEffect(() => { ob.setStep(2) }, [])

  const LEVELS = [
    { value: 'BEGINNER' as const, label: t('profile.levelBeginner'), desc: t('onboarding.levelBeginnerDesc') },
    { value: 'INTERMEDIATE' as const, label: t('profile.levelIntermediate'), desc: t('onboarding.levelIntermediateDesc') },
    { value: 'ADVANCED' as const, label: t('profile.levelAdvanced'), desc: t('onboarding.levelAdvancedDesc') },
  ]

  const GOALS = [
    { value: 'WEIGHT_LOSS' as const, label: t('profile.goalWeightLoss') },
    { value: 'MUSCLE_GAIN' as const, label: t('profile.goalMuscleGain') },
    { value: 'MAINTENANCE' as const, label: t('profile.goalMaintenance') },
  ]

  const canContinue = level && days && goal

  const handleFinish = async () => {
    if (!level || !days || !goal) return
    ob.setField('level', level)
    ob.setField('weeklyTarget', days)
    ob.setField('goal', goal)
    await updateMe.mutateAsync({ level, weeklyTarget: days, goal })
    router.push('/onboarding/step3')
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: tokens.bg }}>
      <ScrollView
        contentContainerStyle={{ padding: 20, gap: 24 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Progress dots */}
        <View style={{ flexDirection: 'row', gap: 4, justifyContent: 'center', marginTop: 16 }}>
          <View style={{ width: 6, height: 6, backgroundColor: tokens.border }} />
          <View style={{ width: 16, height: 6, backgroundColor: tokens.accent }} />
          <View style={{ width: 6, height: 6, backgroundColor: tokens.border }} />
        </View>

        {/* Title */}
        <View style={{ gap: 6 }}>
          <Text style={{ fontFamily: fonts.sansX, fontSize: 24, color: tokens.text, textTransform: 'uppercase' }}>
            {t('onboarding.step2TitlePre')}{'\n'}<Text style={{ color: tokens.accent }}>{t('onboarding.step2Title')}</Text>
          </Text>
          <Text style={{ fontFamily: fonts.sans, fontSize: 13, color: tokens.textMute }}>
            {t('onboarding.step2Subtitle')}
          </Text>
        </View>

        {/* Level */}
        <View style={{ gap: 8 }}>
          <Text style={{ fontFamily: fonts.sansB, fontSize: 9, color: tokens.textMute, textTransform: 'uppercase', letterSpacing: 2 }}>
            {t('onboarding.levelLabel')}
          </Text>
          <View style={{ gap: 6 }}>
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
                    padding: 12,
                    borderWidth: 1,
                    borderColor: selected ? tokens.accent : tokens.border,
                    borderLeftWidth: selected ? 3 : 1,
                    borderLeftColor: selected ? tokens.accent : tokens.border,
                  }}
                  accessibilityLabel={l.label}
                  accessibilityRole="button"
                >
                  <Text style={{
                    fontFamily: fonts.sansB,
                    fontSize: 13,
                    color: selected ? tokens.accent : tokens.text,
                    textTransform: 'uppercase',
                  }}>
                    {l.label}
                  </Text>
                  <Text style={{ fontFamily: fonts.sans, fontSize: 11, color: tokens.textMute }}>
                    {l.desc}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>
        </View>

        {/* Training days */}
        <View style={{ gap: 8 }}>
          <Text style={{ fontFamily: fonts.sansB, fontSize: 9, color: tokens.textMute, textTransform: 'uppercase', letterSpacing: 2 }}>
            {t('onboarding.daysLabel')}
          </Text>
          <View style={{ flexDirection: 'row', gap: 0 }}>
            {[1, 2, 3, 4, 5, 6, 7].map((d) => {
              const selected = days === d
              return (
                <TouchableOpacity
                  key={d}
                  onPress={() => setDays(d)}
                  style={{
                    flex: 1,
                    aspectRatio: 1,
                    borderWidth: 1,
                    borderColor: selected ? tokens.accent : tokens.border,
                    backgroundColor: selected ? tokens.accent : 'transparent',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginLeft: d > 1 ? -1 : 0,
                  }}
                  accessibilityLabel={String(d)}
                  accessibilityRole="button"
                >
                  <Text style={{
                    fontFamily: fonts.monoB,
                    fontSize: 14,
                    color: selected ? '#FFFFFF' : tokens.textMute,
                  }}>
                    {d}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>
        </View>

        {/* Goal */}
        <View style={{ gap: 8 }}>
          <Text style={{ fontFamily: fonts.sansB, fontSize: 9, color: tokens.textMute, textTransform: 'uppercase', letterSpacing: 2 }}>
            {t('onboarding.goalLabel')}
          </Text>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {GOALS.map((g) => {
              const selected = goal === g.value
              return (
                <TouchableOpacity
                  key={g.value}
                  onPress={() => setGoal(g.value)}
                  style={{
                    flex: 1,
                    paddingVertical: 16,
                    borderWidth: 1,
                    borderColor: selected ? tokens.accent : tokens.border,
                    backgroundColor: selected ? tokens.accent : 'transparent',
                    alignItems: 'center',
                  }}
                  accessibilityLabel={g.label}
                  accessibilityRole="button"
                >
                  <Text style={{
                    fontFamily: fonts.sansB,
                    fontSize: 10,
                    color: selected ? '#FFFFFF' : tokens.textMute,
                    textTransform: 'uppercase',
                    textAlign: 'center',
                    letterSpacing: 0.5,
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
          fontFamily: fonts.sans, fontSize: 10, color: tokens.textMute,
          textAlign: 'center', lineHeight: 16, marginTop: 8,
        }}>
          {t('onboarding.privacyDisclaimer')}
        </Text>

        {/* Continue button */}
        <TouchableOpacity
          onPress={handleFinish}
          disabled={!canContinue || updateMe.isPending}
          style={{
            backgroundColor: canContinue ? tokens.accent : tokens.border,
            height: 48,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 20,
          }}
          accessibilityLabel={t('onboarding.continue')}
          accessibilityRole="button"
        >
          <Text style={{
            fontFamily: fonts.sansX, fontSize: 14,
            color: canContinue ? '#FFFFFF' : tokens.textMute,
            textTransform: 'uppercase', letterSpacing: 1,
          }}>
            {t('onboarding.continue')}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}
