import React, { useEffect, useRef, useState } from 'react'
import { View, Text, ActivityIndicator, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useTheme } from '@/theme/ThemeContext'
import { trpc } from '@/lib/trpc'
import { useDietIntakeStore } from '@/stores/dietIntakeStore'
import { useTranslation } from 'react-i18next'

const MSG_KEYS = [
  'diet.generatingMsg1',
  'diet.generatingMsg2',
  'diet.generatingMsg3',
  'diet.generatingMsg4',
  'diet.generatingMsg5',
  'diet.generatingMsg6',
  'diet.generatingMsg7',
  'diet.generatingMsg8',
  'diet.generatingMsg9',
] as const

export default function DietGeneratingScreen() {
  const { colors, typography, spacing } = useTheme()
  const { intake } = useDietIntakeStore()
  const { t, i18n } = useTranslation()
  const lang = (i18n.language === 'fr' ? 'fr' : 'en') as 'en' | 'fr'
  const [msgIndex, setMsgIndex] = useState(0)
  const triggered = useRef(false)
  const utils = trpc.useUtils()

  useEffect(() => {
    const interval = setInterval(() => {
      setMsgIndex((i) => Math.min(i + 1, MSG_KEYS.length - 1))
    }, 4000)
    return () => clearInterval(interval)
  }, [])

  const generatePlan = trpc.diet.generatePlan.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.diet.activePlan.invalidate(),
        utils.diet.todayMeals.invalidate(),
      ])
      router.replace('/diet')
    },
    onError: (err) => {
      router.replace('/diet/intake')
      setTimeout(() => {
        Alert.alert(t('diet.generatingError'), err.message)
      }, 300)
    },
  })

  useEffect(() => {
    if (triggered.current) return
    triggered.current = true
    generatePlan.mutate({
      age: Number(intake.age) || 25,
      sex: intake.sex,
      goalWeight: intake.goalWeight ? Number(intake.goalWeight) : null,
      goalPace: intake.goalPace,
      jobType: intake.jobType,
      exerciseFrequency: intake.exerciseFrequency,
      sleepHours: Number(intake.sleepHours) || 7,
      stressLevel: intake.stressLevel,
      alcoholPerWeek: intake.alcoholPerWeek,
      favoriteFoods: intake.favoriteFoods,
      hatedFoods: intake.hatedFoods,
      dietaryRestrictions: intake.dietaryRestrictions,
      cookingStyle: intake.cookingStyle,
      foodAdventure: intake.foodAdventure,
      currentSnacks: intake.currentSnacks,
      snackReason: intake.snackReason,
      snackPreference: intake.snackPreference,
      nightSnacking: intake.nightSnacking,
      language: lang,
    })
  }, [])

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ alignItems: 'center', gap: spacing.xl, paddingHorizontal: spacing.xl }}>
        <View style={{ alignItems: 'center', gap: spacing.sm }}>
          <Text style={{ fontFamily: typography.family.extraBold, fontSize: typography.size['2xl'], color: colors.textPrimary, textAlign: 'center' }}>
            {t('diet.generatingTitle')}
          </Text>
          <Text style={{ fontFamily: typography.family.regular, fontSize: typography.size.base, color: colors.textMuted, textAlign: 'center' }}>
            {t('diet.generatingSubtitle')}
          </Text>
        </View>

        <ActivityIndicator size="large" color={colors.primary} />

        <View style={{ height: 48, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontFamily: typography.family.semiBold, fontSize: typography.size.body, color: colors.textMuted, textAlign: 'center' }}>
            {t(MSG_KEYS[msgIndex] ?? MSG_KEYS[0])}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', gap: spacing.xs }}>
          {MSG_KEYS.map((_, i) => (
            <View
              key={i}
              style={{
                width: i === msgIndex ? 20 : 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: i <= msgIndex ? colors.primary : colors.surface2,
              }}
            />
          ))}
        </View>
      </View>
    </SafeAreaView>
  )
}
