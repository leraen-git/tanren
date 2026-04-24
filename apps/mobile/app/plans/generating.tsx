import React, { useEffect, useRef, useState } from 'react'
import { View, Text, Alert, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useTheme } from '@/theme/ThemeContext'
import { trpc } from '@/lib/trpc'
import { useAIPlanStore } from '@/stores/aiPlanStore'
import { useTranslation } from 'react-i18next'

const STEPS = [
  'ai.genStepProfile',
  'ai.genStepWeekly',
  'ai.genStepExercises',
  'ai.genStepVolume',
] as const

export default function PlanGeneratingScreen() {
  const { tokens, fonts } = useTheme()
  const { pendingPrompt, conversationHistory, setProposedPlan } = useAIPlanStore()
  const { t, i18n } = useTranslation()
  const lang = (i18n.language === 'fr' ? 'fr' : 'en') as 'en' | 'fr'
  const [stepIndex, setStepIndex] = useState(0)
  const triggered = useRef(false)

  useEffect(() => {
    const interval = setInterval(() => {
      setStepIndex((i) => Math.min(i + 1, STEPS.length - 1))
    }, 4000)
    return () => clearInterval(interval)
  }, [])

  const generate = trpc.plans.generateWithAI.useMutation({
    onSuccess: (data) => {
      setProposedPlan(data.plan, pendingPrompt, data.assistantMessage)
      router.replace('/plans/preview')
    },
    onError: (err) => {
      router.replace('/plans/generate')
      setTimeout(() => {
        Alert.alert(t('common.error'), t('ai.generateError'))
      }, 300)
    },
  })

  useEffect(() => {
    if (triggered.current || !pendingPrompt) return
    triggered.current = true
    generate.mutate({ prompt: pendingPrompt, language: lang, conversationHistory })
  }, [])

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: tokens.bg, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ alignItems: 'center', gap: 32, paddingHorizontal: 32 }}>
        {/* Kanji hero */}
        <Text style={{ fontFamily: fonts.jp, fontSize: 96, color: tokens.accent, opacity: 0.15 }}>
          鍛
        </Text>

        {/* Title */}
        <View style={{ alignItems: 'center', gap: 8 }}>
          <Text style={{ fontFamily: fonts.sansX, fontSize: 24, color: tokens.text, textAlign: 'center', textTransform: 'uppercase' }}>
            {t('ai.generatingTitle')}{' '}
            <Text style={{ color: tokens.accent }}>{t('ai.generatingTitleAccent')}</Text>
          </Text>
          <Text style={{ fontFamily: fonts.sans, fontSize: 13, color: tokens.textMute, textAlign: 'center' }}>
            {t('ai.generatingDesc')}
          </Text>
        </View>

        {/* 4-step progress */}
        <View style={{ width: '100%', gap: 6 }}>
          {STEPS.map((key, i) => {
            const isDone = i < stepIndex
            const isCurrent = i === stepIndex
            return (
              <View
                key={key}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                  opacity: isDone ? 0.5 : isCurrent ? 1 : 0.3,
                }}
              >
                <View style={{
                  width: 20, height: 20,
                  borderWidth: 1,
                  borderColor: isDone ? tokens.green : isCurrent ? tokens.accent : tokens.border,
                  backgroundColor: isDone ? tokens.green : 'transparent',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  {isDone && (
                    <Text style={{ fontFamily: fonts.sansB, fontSize: 10, color: '#FFFFFF' }}>
                      ✓
                    </Text>
                  )}
                  {isCurrent && (
                    <View style={{ width: 6, height: 6, backgroundColor: tokens.accent }} />
                  )}
                </View>
                <Text style={{
                  fontFamily: isCurrent ? fonts.sansB : fonts.sans,
                  fontSize: 13,
                  color: isCurrent ? tokens.text : tokens.textMute,
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                }}>
                  {t(key)}
                </Text>
              </View>
            )
          })}
        </View>

        {/* Progress bar */}
        <View style={{ width: 120, height: 3, backgroundColor: tokens.surface2 }}>
          <View style={{
            width: `${Math.min(((stepIndex + 1) / STEPS.length) * 100, 100)}%`,
            height: 3,
            backgroundColor: tokens.accent,
          }} />
        </View>
      </View>
    </SafeAreaView>
  )
}
