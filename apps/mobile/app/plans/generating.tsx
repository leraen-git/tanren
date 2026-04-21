import React, { useEffect, useRef, useState } from 'react'
import { View, Text, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useTheme } from '@/theme/ThemeContext'
import { trpc } from '@/lib/trpc'
import { useAIPlanStore } from '@/stores/aiPlanStore'
import { useTranslation } from 'react-i18next'

const MSG_KEYS = [
  'plans.generatingMsg1',
  'plans.generatingMsg2',
  'plans.generatingMsg3',
  'plans.generatingMsg4',
  'plans.generatingMsg5',
  'plans.generatingMsg6',
] as const

export default function PlanGeneratingScreen() {
  const { tokens, fonts } = useTheme()
  const { pendingPrompt, conversationHistory, setProposedPlan } = useAIPlanStore()
  const { t, i18n } = useTranslation()
  const lang = (i18n.language === 'fr' ? 'fr' : 'en') as 'en' | 'fr'
  const [msgIndex, setMsgIndex] = useState(0)
  const triggered = useRef(false)

  useEffect(() => {
    const interval = setInterval(() => {
      setMsgIndex((i) => Math.min(i + 1, MSG_KEYS.length - 1))
    }, 3500)
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
        Alert.alert(t('plans.generatingError'), err.message)
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
            {t('plans.generatingTitle')}
          </Text>
          <Text style={{ fontFamily: fonts.sans, fontSize: 13, color: tokens.textMute, textAlign: 'center' }}>
            {t('plans.generatingSubtitle')}
          </Text>
        </View>

        {/* Progress bar instead of spinner */}
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
