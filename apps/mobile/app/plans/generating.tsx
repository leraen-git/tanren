import React, { useEffect, useRef, useState } from 'react'
import { View, Text, ActivityIndicator, Alert } from 'react-native'
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
  const { colors, typography, spacing } = useTheme()
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
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ alignItems: 'center', gap: spacing.xl, paddingHorizontal: spacing.xl }}>
        <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: `${colors.primary}18`, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontFamily: typography.family.bold, fontSize: typography.size.base, color: colors.primary, letterSpacing: 1 }}>AI</Text>
        </View>

        <View style={{ alignItems: 'center', gap: spacing.sm }}>
          <Text style={{ fontFamily: typography.family.extraBold, fontSize: typography.size['2xl'], color: colors.textPrimary, textAlign: 'center' }}>
            {t('plans.generatingTitle')}
          </Text>
          <Text style={{ fontFamily: typography.family.regular, fontSize: typography.size.base, color: colors.textMuted, textAlign: 'center' }}>
            {t('plans.generatingSubtitle')}
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
