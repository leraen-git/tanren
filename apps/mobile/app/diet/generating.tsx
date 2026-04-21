import React, { useEffect, useRef, useState } from 'react'
import { View, Text, Alert } from 'react-native'
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
  const { tokens, fonts } = useTheme()
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
    <SafeAreaView style={{ flex: 1, backgroundColor: tokens.bg, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ alignItems: 'center', gap: 24, paddingHorizontal: 32 }}>
        {/* AI badge */}
        <View style={{
          width: 56, height: 56,
          borderWidth: 1,
          borderColor: tokens.accent,
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Text style={{ fontFamily: fonts.sansB, fontSize: 12, color: tokens.accent, letterSpacing: 2 }}>AI</Text>
        </View>

        <View style={{ alignItems: 'center', gap: 8 }}>
          <Text style={{ fontFamily: fonts.sansX, fontSize: 24, color: tokens.text, textAlign: 'center', textTransform: 'uppercase' }}>
            {t('diet.generatingTitle')}
          </Text>
          <Text style={{ fontFamily: fonts.sans, fontSize: 13, color: tokens.textMute, textAlign: 'center' }}>
            {t('diet.generatingSubtitle')}
          </Text>
        </View>

        {/* Progress bar */}
        <View style={{ width: 120, height: 3, backgroundColor: tokens.surface2 }}>
          <View style={{
            width: `${Math.min(((msgIndex + 1) / MSG_KEYS.length) * 100, 100)}%`,
            height: 3,
            backgroundColor: tokens.accent,
          }} />
        </View>

        <View style={{ height: 48, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontFamily: fonts.sansM, fontSize: 13, color: tokens.textDim, textAlign: 'center' }}>
            {t(MSG_KEYS[msgIndex] ?? MSG_KEYS[0])}
          </Text>
        </View>

        {/* Step dots — flat squares */}
        <View style={{ flexDirection: 'row', gap: 4 }}>
          {MSG_KEYS.map((_, i) => (
            <View
              key={i}
              style={{
                width: i === msgIndex ? 16 : 6,
                height: 6,
                backgroundColor: i <= msgIndex ? tokens.accent : tokens.surface2,
              }}
            />
          ))}
        </View>
      </View>
    </SafeAreaView>
  )
}
