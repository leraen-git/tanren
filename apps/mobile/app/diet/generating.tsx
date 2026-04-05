import React, { useEffect, useRef, useState } from 'react'
import { View, Text, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useTheme } from '@/theme/ThemeContext'
import { trpc } from '@/lib/trpc'
import { useDietIntakeStore } from '@/stores/dietIntakeStore'

const MESSAGES = [
  'Calculating your BMR with Mifflin-St Jeor...',
  'Setting your calorie & macro targets...',
  'Building your 7-day meal plan...',
  'Crafting meals around your favourite foods...',
  'Finding your snack swaps...',
  'Writing your personalised rules...',
  'Calculating your hydration target...',
  'Checking supplement recommendations...',
  'Putting it all together...',
]

export default function DietGeneratingScreen() {
  const { colors, typography, spacing } = useTheme()
  const { intake } = useDietIntakeStore()
  const [msgIndex, setMsgIndex] = useState(0)
  const triggered = useRef(false)
  const utils = trpc.useUtils()

  // Cycle through messages every 4s
  useEffect(() => {
    const interval = setInterval(() => {
      setMsgIndex((i) => Math.min(i + 1, MESSAGES.length - 1))
    }, 4000)
    return () => clearInterval(interval)
  }, [])

  const generatePlan = trpc.diet.generatePlan.useMutation({
    onSuccess: async () => {
      await utils.diet.activePlan.invalidate()
      router.replace('/(tabs)/diet' as any)
    },
    onError: (err) => {
      router.replace('/diet/intake' as any)
      setTimeout(() => {
        const { Alert } = require('react-native')
        Alert.alert('Generation failed', err.message)
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
    })
  }, [])

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ alignItems: 'center', gap: spacing.xl, paddingHorizontal: spacing.xl }}>
        {/* Icon */}
        <Text style={{ fontSize: 64 }}>🥗</Text>

        {/* Title */}
        <View style={{ alignItems: 'center', gap: spacing.sm }}>
          <Text style={{ fontFamily: typography.family.extraBold, fontSize: typography.size['2xl'], color: colors.textPrimary, textAlign: 'center' }}>
            Building your diet plan
          </Text>
          <Text style={{ fontFamily: typography.family.regular, fontSize: typography.size.base, color: colors.textMuted, textAlign: 'center' }}>
            This may take up to 1–2 minutes
          </Text>
        </View>

        {/* Spinner */}
        <ActivityIndicator size="large" color={colors.primary} />

        {/* Cycling message */}
        <View style={{ height: 48, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontFamily: typography.family.semiBold, fontSize: typography.size.body, color: colors.textMuted, textAlign: 'center' }}>
            {MESSAGES[msgIndex]}
          </Text>
        </View>

        {/* Progress dots */}
        <View style={{ flexDirection: 'row', gap: spacing.xs }}>
          {MESSAGES.map((_, i) => (
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
