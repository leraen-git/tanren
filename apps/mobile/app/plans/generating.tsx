import React, { useEffect, useRef, useState } from 'react'
import { View, Text, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useTheme } from '@/theme/ThemeContext'
import { trpc } from '@/lib/trpc'
import { useAIPlanStore } from '@/stores/aiPlanStore'

const MESSAGES = [
  'Reading your profile...',
  'Selecting the right exercises...',
  'Building your weekly schedule...',
  'Balancing muscle groups across days...',
  'Checking rest and recovery...',
  'Finalising your plan...',
]

export default function PlanGeneratingScreen() {
  const { colors, typography, spacing } = useTheme()
  const { pendingPrompt, conversationHistory, setProposedPlan } = useAIPlanStore()
  const [msgIndex, setMsgIndex] = useState(0)
  const triggered = useRef(false)

  // Cycle through messages
  useEffect(() => {
    const interval = setInterval(() => {
      setMsgIndex((i) => Math.min(i + 1, MESSAGES.length - 1))
    }, 3500)
    return () => clearInterval(interval)
  }, [])

  const generate = trpc.plans.generateWithAI.useMutation({
    onSuccess: (data) => {
      setProposedPlan(data.plan, pendingPrompt, data.assistantMessage)
      router.replace('/plans/preview' as any)
    },
    onError: (err) => {
      router.replace('/plans/generate' as any)
      // Small delay so screen has transitioned before showing alert
      setTimeout(() => {
        const { Alert } = require('react-native')
        Alert.alert('Generation failed', err.message)
      }, 300)
    },
  })

  useEffect(() => {
    if (triggered.current || !pendingPrompt) return
    triggered.current = true
    generate.mutate({ prompt: pendingPrompt, conversationHistory })
  }, [])

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ alignItems: 'center', gap: spacing.xl, paddingHorizontal: spacing.xl }}>
        {/* Icon */}
        <Text style={{ fontSize: 64 }}>✨</Text>

        {/* Title */}
        <View style={{ alignItems: 'center', gap: spacing.sm }}>
          <Text style={{ fontFamily: typography.family.extraBold, fontSize: typography.size['2xl'], color: colors.textPrimary, textAlign: 'center' }}>
            Building your plan
          </Text>
          <Text style={{ fontFamily: typography.family.regular, fontSize: typography.size.base, color: colors.textMuted, textAlign: 'center' }}>
            This may take up to a minute
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
