import React, { useEffect, useRef, useState } from 'react'
import { View, Text, TouchableOpacity } from 'react-native'
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing } from 'react-native-reanimated'
import { router } from 'expo-router'
import { useTheme } from '@/theme/ThemeContext'
import { Screen } from '@/components/Screen'
import { useIntakeDraftV2Store } from '@/stores/intakeDraftV2Store'
import { useDietGenerationStore } from '@/stores/dietGenerationStore'
import { useTranslation } from 'react-i18next'
import { promptReminders } from '@/lib/reminderPrompt'
import { useNotificationSettingsStore } from '@/stores/notificationSettingsStore'

const FREQ_MAP = { '0-1': 1, '2-3': 3, '4+': 5 } as const
const ALCOHOL_MAP = { '0': 0, '1-5': 3, '6+': 8 } as const

const GEN_STEPS = [
  { key: 'genStep1', doneAt: 8 },
  { key: 'genStep2', doneAt: 18 },
  { key: 'genStep3', doneAt: 30 },
  { key: 'genStep4', doneAt: 50 },
  { key: 'genStep5', doneAt: 70 },
  { key: 'genStep6', doneAt: 85 },
  { key: 'genStep7', doneAt: 95 },
] as const

export default function GeneratingV2Screen() {
  const { tokens, fonts } = useTheme()
  const { t } = useTranslation()
  const { draft, reset } = useIntakeDraftV2Store()
  const triggered = useRef(false)
  const started = useRef(false)
  const { status, errorMessage, start, retry, reset: resetGen } = useDietGenerationStore()
  const [progress, setProgress] = useState(0)

  const pulseScale = useSharedValue(1)
  const pulseOpacity = useSharedValue(0.9)

  useEffect(() => {
    pulseScale.value = withRepeat(
      withTiming(1.08, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
      -1, true,
    )
    pulseOpacity.value = withRepeat(
      withTiming(0.5, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
      -1, true,
    )
  }, [])

  const kanjiStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: pulseOpacity.value,
  }))

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((p) => Math.min(p + 1, 90))
    }, 800)
    return () => clearInterval(interval)
  }, [])

  // Kick off generation via global store (watcher in root layout runs the mutation)
  // If already generating (e.g. regen navigated here), skip start()
  useEffect(() => {
    if (status === 'generating') {
      started.current = true
      return
    }
    if (triggered.current) return
    triggered.current = true

    resetGen()
    started.current = true
    start({
      mode: 'submit',
      submitInput: {
        age: Number(draft.age) || 25,
        biologicalSex: draft.biologicalSex,
        heightCm: Number(draft.heightCm) || 170,
        currentWeightKg: parseFloat(draft.currentWeightKg.replace(',', '.')) || 75,
        goalWeightKg: draft.goalMode === 'WEIGHT' && draft.goalWeightKg
          ? parseFloat(draft.goalWeightKg.replace(',', '.'))
          : undefined,
        goalFeel: draft.goalMode === 'FEEL' ? draft.goalFeel : undefined,
        pace: draft.pace,
        jobType: draft.jobType,
        exerciseFrequencyPerWeek: FREQ_MAP[draft.exerciseFrequency],
        exerciseType: draft.exerciseType,
        sleepHours: Number(draft.sleepHours) || 7,
        stressLevel: draft.stressLevel,
        alcoholDrinksPerWeek: ALCOHOL_MAP[draft.alcoholBracket],
        top5Meals: draft.top5Meals,
        hatedFoods: draft.hatedFoods || undefined,
        restrictions: draft.restrictions,
        cookingStyle: draft.cookingStyle,
        adventurousness: draft.adventurousness,
        currentSnacks: draft.currentSnacks,
        snackMotivation: draft.snackMotivation,
        snackPreference: draft.snackPreference,
        nightSnacking: draft.nightSnacking,
      },
    })
  }, [])

  // Navigate away when generation finishes (only after we've started)
  useEffect(() => {
    if (!started.current) return
    if (status === 'done') {
      setProgress(100)
      reset()
      const mealRemindersAlreadyOn = useNotificationSettingsStore.getState().meals.breakfast.enabled
        || useNotificationSettingsStore.getState().meals.lunch.enabled
        || useNotificationSettingsStore.getState().meals.dinner.enabled
      router.replace('/diet')
      if (!mealRemindersAlreadyOn) {
        setTimeout(() => promptReminders('diet'), 600)
      }
    }
  }, [status])

  function currentStepIndex(): number {
    for (let i = GEN_STEPS.length - 1; i >= 0; i--) {
      if (progress >= GEN_STEPS[i]!.doneAt) return i + 1
    }
    return 0
  }
  const stepIdx = currentStepIndex()

  if (status === 'error') {
    return (
      <Screen showKanji kanjiChar="錬">
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <Text style={{
            fontFamily: 'NotoSerifJP_900Black_subset',
            fontSize: 96, color: tokens.accent, lineHeight: 110, opacity: 0.3,
          }}>
            鍛
          </Text>

          <Text style={{
            fontFamily: fonts.sansX, fontSize: 22, color: tokens.text,
            textAlign: 'center', textTransform: 'uppercase', letterSpacing: 0.4,
            marginTop: 24, marginBottom: 12,
          }}>
            {t('intakeV2.genFailedTitle')}
          </Text>

          <Text style={{
            fontFamily: fonts.sans, fontSize: 13, color: tokens.textDim,
            textAlign: 'center', lineHeight: 18, maxWidth: 280, marginBottom: 8,
          }}>
            {errorMessage || t('intakeV2.genFailedSub')}
          </Text>

          <Text style={{
            fontFamily: fonts.sans, fontSize: 11, color: tokens.textMute,
            textAlign: 'center', marginBottom: 32,
          }}>
            {t('intakeV2.genFailedNoCredit')}
          </Text>

          <TouchableOpacity
            onPress={() => { setProgress(0); retry() }}
            style={{
              width: 240, height: 52, backgroundColor: tokens.accent,
              alignItems: 'center', justifyContent: 'center',
            }}
            accessibilityRole="button"
          >
            <Text style={{
              fontFamily: fonts.sansB, fontSize: 13, color: '#FFFFFF',
              textTransform: 'uppercase', letterSpacing: 0.8,
            }}>
              {t('intakeV2.genRetry')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => { resetGen(); router.replace('/diet') }}
            style={{ marginTop: 16, paddingVertical: 12, paddingHorizontal: 24 }}
            accessibilityRole="button"
          >
            <Text style={{
              fontFamily: fonts.sansM, fontSize: 13, color: tokens.textMute,
              textAlign: 'center',
            }}>
              {t('common.back')}
            </Text>
          </TouchableOpacity>
        </View>
      </Screen>
    )
  }

  return (
    <Screen showKanji kanjiChar="錬">
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        {/* Pulsing kanji */}
        <Animated.Text
          style={[kanjiStyle, {
            fontFamily: 'NotoSerifJP_900Black_subset',
            fontSize: 96, color: tokens.accent, lineHeight: 110,
          }]}
        >
          鍛
        </Animated.Text>

        <Text style={{
          fontFamily: fonts.sansX, fontSize: 22, color: tokens.text,
          textAlign: 'center', textTransform: 'uppercase', letterSpacing: 0.4,
          marginTop: 24, marginBottom: 12,
        }}>
          {t('intakeV2.genTitle')}
        </Text>

        <Text style={{
          fontFamily: fonts.sans, fontSize: 12, color: tokens.textDim,
          textAlign: 'center', lineHeight: 18, maxWidth: 280, marginBottom: 8,
        }}>
          {t('intakeV2.genSub')}
        </Text>

        <Text style={{
          fontFamily: fonts.sans, fontSize: 12, color: tokens.textMute,
          textAlign: 'center', marginBottom: 24,
        }}>
          {t('intakeV2.genCanLeave')}
        </Text>

        {/* Progress bar */}
        <View style={{
          width: 240, height: 2, backgroundColor: tokens.surface2,
          marginBottom: 22, overflow: 'hidden',
        }}>
          <View style={{
            width: `${progress}%`, height: 2, backgroundColor: tokens.accent,
          }} />
        </View>

        {/* Step checklist */}
        <View style={{ width: 240, gap: 10 }}>
          {GEN_STEPS.map((step, i) => {
            const done = i < stepIdx
            const active = i === stepIdx
            return (
              <View key={step.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                {done ? (
                  <Text style={{ color: tokens.green, fontFamily: fonts.sansB, fontSize: 13, width: 14, textAlign: 'center' }}>
                    {'✓'}
                  </Text>
                ) : (
                  <View style={{
                    width: 10, height: 10, marginHorizontal: 2,
                    backgroundColor: active ? tokens.accent : 'transparent',
                    borderWidth: active ? 0 : 1,
                    borderColor: tokens.textGhost,
                  }} />
                )}
                <Text style={{
                  fontFamily: active ? fonts.sansB : fonts.sans,
                  fontSize: 11, letterSpacing: 0.8,
                  color: done ? tokens.textMute : active ? tokens.text : tokens.textGhost,
                }}>
                  {t(`intakeV2.${step.key}`)}
                </Text>
              </View>
            )
          })}
        </View>

        <TouchableOpacity
          onPress={() => router.replace('/(tabs)')}
          style={{ marginTop: 32, paddingVertical: 12, paddingHorizontal: 24 }}
          accessibilityRole="button"
        >
          <Text style={{
            fontFamily: fonts.sansM, fontSize: 13, color: tokens.textMute,
            textAlign: 'center',
          }}>
            {t('intakeV2.genContinueBrowsing')}
          </Text>
        </TouchableOpacity>

      </View>
    </Screen>
  )
}
