import React, { useState } from 'react'
import { View, Text, TextInput, ScrollView, TouchableOpacity, Alert, KeyboardAvoidingView, Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useTheme } from '@/theme/ThemeContext'
import { Button } from '@/components/Button'
import { trpc } from '@/lib/trpc'
import { useAIPlanStore } from '@/stores/aiPlanStore'
import { colors as tokenColors } from '@/theme/tokens'
import { useTranslation } from 'react-i18next'

export default function GeneratePlanScreen() {
  const { colors, typography, spacing, radius } = useTheme()
  const { t } = useTranslation()
  const { data: user } = trpc.users.me.useQuery()
  const { conversationHistory, lastPrompt, setPendingPrompt, reset } = useAIPlanStore()
  const [prompt, setPrompt] = useState(lastPrompt)

  const GOAL_LABELS: Record<string, string> = {
    MUSCLE_GAIN: t('profile.goalMuscleGain'),
    WEIGHT_LOSS: t('profile.goalWeightLoss'),
    MAINTENANCE: t('profile.goalMaintenance'),
  }

  const LEVEL_LABELS: Record<string, string> = {
    BEGINNER: t('profile.levelBeginner'),
    INTERMEDIATE: t('profile.levelIntermediate'),
    ADVANCED: t('profile.levelAdvanced'),
  }

  const PROMPT_SUGGESTIONS = [
    t('generate.suggestion1'),
    t('generate.suggestion2'),
    t('generate.suggestion3'),
    t('generate.suggestion4'),
  ]

  const handleGenerate = () => {
    const trimmed = prompt.trim()
    if (!trimmed) {
      Alert.alert(t('generate.alertTitle'), t('generate.alertDesc'))
      return
    }
    setPendingPrompt(trimmed)
    router.push('/plans/generating' as any)
  }

  const isRefinement = conversationHistory.length > 0

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', padding: spacing.base, gap: spacing.md }}>
          <TouchableOpacity
            onPress={() => { reset(); router.back() }}
            accessibilityLabel={t('common.back')}
            accessibilityRole="button"
          >
            <Text style={{ fontFamily: typography.family.bold, fontSize: typography.size.title, color: colors.primary }}>←</Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: typography.family.extraBold, fontSize: typography.size.xl, color: colors.textPrimary }}>
              {isRefinement ? t('generate.titleRefine') : t('generate.title')}
            </Text>
            <Text style={{ fontFamily: typography.family.regular, fontSize: typography.size.base, color: colors.textMuted }}>
              {t('generate.poweredBy')}
            </Text>
          </View>
          <Text style={{ fontSize: typography.size['2xl'] }}>✨</Text>
        </View>

        <ScrollView
          contentContainerStyle={{ padding: spacing.base, gap: spacing.base, paddingBottom: spacing.xl }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Profile chips */}
          {user && (
            <View style={{ gap: spacing.xs }}>
              <Text style={{ fontFamily: typography.family.semiBold, fontSize: typography.size.base, color: colors.textMuted }}>
                {t('generate.yourProfile')}
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
                {[
                  LEVEL_LABELS[user.level] ?? user.level,
                  GOAL_LABELS[user.goal] ?? user.goal,
                  t('generate.xPerWeek', { n: user.weeklyTarget }),
                  ...(user.weightKg ? [`${user.weightKg}kg`] : []),
                  ...(user.heightCm ? [`${user.heightCm}cm`] : []),
                ].map((chip) => (
                  <View
                    key={chip}
                    style={{
                      paddingVertical: spacing.xs,
                      paddingHorizontal: spacing.md,
                      borderRadius: radius.pill,
                      backgroundColor: `${colors.primary}18`,
                    }}
                  >
                    <Text style={{ fontFamily: typography.family.semiBold, fontSize: typography.size.base, color: colors.primary }}>
                      {chip}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Prompt input */}
          <View style={{ gap: spacing.sm }}>
            <Text style={{ fontFamily: typography.family.semiBold, fontSize: typography.size.body, color: colors.textPrimary }}>
              {isRefinement ? t('generate.refinementLabel') : t('generate.describeLabel')}
            </Text>
            <TextInput
              value={prompt}
              onChangeText={setPrompt}
              placeholder={isRefinement ? t('generate.refinementPlaceholder') : t('generate.placeholder')}
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              style={{
                backgroundColor: colors.surface,
                borderRadius: radius.md,
                padding: spacing.md,
                color: colors.textPrimary,
                fontFamily: typography.family.regular,
                fontSize: typography.size.body,
                minHeight: 120,
                borderWidth: 1,
                borderColor: colors.surface2,
              }}
              accessibilityLabel={t('generate.describeLabel')}
            />
          </View>

          {/* Quick suggestions (only on first generation) */}
          {!isRefinement && (
            <View style={{ gap: spacing.sm }}>
              <Text style={{ fontFamily: typography.family.semiBold, fontSize: typography.size.base, color: colors.textMuted }}>
                {t('generate.quickStart')}
              </Text>
              <View style={{ gap: spacing.xs }}>
                {PROMPT_SUGGESTIONS.map((s) => (
                  <TouchableOpacity
                    key={s}
                    onPress={() => setPrompt(s)}
                    style={{
                      backgroundColor: colors.surface,
                      borderRadius: radius.md,
                      padding: spacing.md,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: spacing.sm,
                      borderWidth: 1,
                      borderColor: colors.surface2,
                    }}
                    accessibilityLabel={s}
                    accessibilityRole="button"
                  >
                    <Text style={{ fontFamily: typography.family.regular, fontSize: typography.size.base, color: colors.textMuted, flex: 1 }}>
                      {s}
                    </Text>
                    <Text style={{ color: colors.primary, fontFamily: typography.family.bold }}>↗</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          <Button
            label={isRefinement ? t('generate.regenerateBtn') : t('generate.generateBtn')}
            onPress={handleGenerate}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
