import React, { useState } from 'react'
import { View, Text, TextInput, ScrollView, TouchableOpacity, Alert, KeyboardAvoidingView, Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useTheme } from '@/theme/ThemeContext'
import { Button } from '@/components/Button'
import { trpc } from '@/lib/trpc'
import { useAIPlanStore } from '@/stores/aiPlanStore'
import { colors as tokenColors } from '@/theme/tokens'

const GOAL_LABELS: Record<string, string> = {
  MUSCLE_GAIN: 'Muscle gain',
  WEIGHT_LOSS: 'Weight loss',
  MAINTENANCE: 'Maintenance',
}

const LEVEL_LABELS: Record<string, string> = {
  BEGINNER: 'Beginner',
  INTERMEDIATE: 'Intermediate',
  ADVANCED: 'Advanced',
}

const PROMPT_SUGGESTIONS = [
  'Push/pull/legs 3x per week, focus on compound lifts',
  'Upper/lower split 4 days, I want to get stronger',
  'Full body 3 days, I have limited time (~45 min)',
  '5 days per week, bodybuilding style',
]

export default function GeneratePlanScreen() {
  const { colors, typography, spacing, radius } = useTheme()
  const { data: user } = trpc.users.me.useQuery()
  const { conversationHistory, lastPrompt, setPendingPrompt, reset } = useAIPlanStore()
  const [prompt, setPrompt] = useState(lastPrompt)

  const handleGenerate = () => {
    const trimmed = prompt.trim()
    if (!trimmed) {
      Alert.alert('Describe your goals', 'Tell us what kind of plan you are looking for.')
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
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <Text style={{ fontFamily: typography.family.bold, fontSize: typography.size.title, color: colors.primary }}>←</Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: typography.family.extraBold, fontSize: typography.size.xl, color: colors.textPrimary }}>
              {isRefinement ? 'Ask for changes' : 'AI Plan Generator'}
            </Text>
            <Text style={{ fontFamily: typography.family.regular, fontSize: typography.size.base, color: colors.textMuted }}>
              Powered by Claude
            </Text>
          </View>
          <Text style={{ fontSize: 24 }}>✨</Text>
        </View>

        <ScrollView
          contentContainerStyle={{ padding: spacing.base, gap: spacing.base, paddingBottom: spacing.xl }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Profile chips */}
          {user && (
            <View style={{ gap: spacing.xs }}>
              <Text style={{ fontFamily: typography.family.semiBold, fontSize: typography.size.base, color: colors.textMuted }}>
                Your profile
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
                {[
                  LEVEL_LABELS[user.level] ?? user.level,
                  GOAL_LABELS[user.goal] ?? user.goal,
                  `${user.weeklyTarget}x / week`,
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
              {isRefinement ? 'What would you like to change?' : 'Describe your ideal plan'}
            </Text>
            <TextInput
              value={prompt}
              onChangeText={setPrompt}
              placeholder={
                isRefinement
                  ? 'e.g. Make it 4 days instead of 3, add more leg work...'
                  : 'e.g. Push/pull/legs 3 days a week, I want to build muscle and have about 60 min per session...'
              }
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
              accessibilityLabel="Describe your plan"
            />
          </View>

          {/* Quick suggestions (only on first generation) */}
          {!isRefinement && (
            <View style={{ gap: spacing.sm }}>
              <Text style={{ fontFamily: typography.family.semiBold, fontSize: typography.size.base, color: colors.textMuted }}>
                Quick start
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
                    accessibilityLabel={`Use suggestion: ${s}`}
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
            label={isRefinement ? '✨ Regenerate with changes' : '✨ Generate my plan'}
            onPress={handleGenerate}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
