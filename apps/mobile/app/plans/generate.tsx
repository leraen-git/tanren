import React, { useState } from 'react'
import { View, Text, TextInput, ScrollView, TouchableOpacity, Alert, KeyboardAvoidingView, Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useTheme } from '@/theme/ThemeContext'
import { Button } from '@/components/Button'
import { trpc } from '@/lib/trpc'
import { useProfile } from '@/data/useProfile'
import { useAIPlanStore } from '@/stores/aiPlanStore'
import { useTranslation } from 'react-i18next'

const SUGGESTIONS = [
  { titleKey: 'ai.suggestionPpl', descKey: 'ai.suggestionPplDesc', promptKey: 'ai.suggestionPplPrompt' },
  { titleKey: 'ai.suggestionUpperLower', descKey: 'ai.suggestionUpperLowerDesc', promptKey: 'ai.suggestionUpperLowerPrompt' },
  { titleKey: 'ai.suggestionFullBody', descKey: 'ai.suggestionFullBodyDesc', promptKey: 'ai.suggestionFullBodyPrompt' },
] as const

export default function GeneratePlanScreen() {
  const { tokens, fonts } = useTheme()
  const { t } = useTranslation()
  const { data: user } = useProfile()
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

  const handleGenerate = () => {
    const trimmed = prompt.trim()
    if (!trimmed) {
      Alert.alert(t('generate.alertTitle'), t('generate.alertDesc'))
      return
    }
    setPendingPrompt(trimmed)
    router.push('/plans/generating')
  }

  const isRefinement = conversationHistory.length > 0

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: tokens.bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 }}>
          <TouchableOpacity
            onPress={() => { reset(); router.back() }}
            accessibilityLabel={t('common.back')}
            accessibilityRole="button"
          >
            <Text style={{ fontFamily: fonts.sansB, fontSize: 10, color: tokens.accent, textTransform: 'uppercase', letterSpacing: 2 }}>
              {'< '}{t('common.back').toUpperCase()}
            </Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }} />
          <View style={{
            borderWidth: 1,
            borderColor: tokens.accent,
            paddingHorizontal: 8,
            paddingVertical: 3,
          }}>
            <Text style={{ fontFamily: fonts.sansB, fontSize: 9, color: tokens.accent, letterSpacing: 1.4 }}>AI</Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={{ padding: 16, gap: 20, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Hero */}
          <View style={{ gap: 4 }}>
            <Text style={{ fontFamily: fonts.sansX, fontSize: 24, color: tokens.text, textTransform: 'uppercase' }}>
              {isRefinement ? t('ai.heroTitleRefine') : t('ai.heroTitleInitial')}
            </Text>
            <Text style={{ fontFamily: fonts.sans, fontSize: 13, color: tokens.textMute }}>
              {isRefinement ? t('ai.heroDescRefine') : t('ai.heroDescInitial')}
            </Text>
          </View>

          {/* Profile chips */}
          {user && (
            <View style={{ gap: 8 }}>
              <Text style={{ fontFamily: fonts.sansB, fontSize: 9, color: tokens.textMute, textTransform: 'uppercase', letterSpacing: 2 }}>
                {t('ai.profile').toUpperCase()}
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {[
                  LEVEL_LABELS[user.level] ?? user.level,
                  GOAL_LABELS[user.goal] ?? user.goal,
                  `${user.weeklyTarget}× ${t('ai.perWeek')}`,
                  ...(user.weightKg ? [`${user.weightKg} kg`] : []),
                  ...(user.heightCm ? [`${user.heightCm} cm`] : []),
                ].map((chip) => (
                  <View
                    key={chip}
                    style={{
                      paddingVertical: 4,
                      paddingHorizontal: 10,
                      borderWidth: 1,
                      borderColor: tokens.accent,
                    }}
                  >
                    <Text style={{ fontFamily: fonts.sansB, fontSize: 10, color: tokens.accent, letterSpacing: 1 }}>
                      {chip.toUpperCase()}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Conversation history */}
          {isRefinement && conversationHistory.length > 0 && (
            <View style={{ gap: 8 }}>
              {conversationHistory.map((msg, i) => (
                <View key={i} style={{ gap: 2 }}>
                  <Text style={{ fontFamily: fonts.sansB, fontSize: 9, color: msg.role === 'user' ? tokens.accent : tokens.textMute, textTransform: 'uppercase', letterSpacing: 2 }}>
                    {msg.role === 'user' ? t('ai.conversationToi') : t('ai.conversationIa')}
                  </Text>
                  <Text style={{ fontFamily: fonts.sans, fontSize: 12, color: tokens.textDim }} numberOfLines={3}>
                    {msg.content}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Prompt input */}
          <View style={{ gap: 8 }}>
            <Text style={{ fontFamily: fonts.sansB, fontSize: 10, color: tokens.textMute, textTransform: 'uppercase', letterSpacing: 2 }}>
              {isRefinement ? t('ai.adjustments').toUpperCase() : t('ai.request').toUpperCase()}
            </Text>
            <TextInput
              value={prompt}
              onChangeText={setPrompt}
              placeholder={isRefinement ? t('ai.promptPlaceholderRefine') : t('ai.promptPlaceholderInitial')}
              placeholderTextColor={tokens.textGhost}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              style={{
                backgroundColor: tokens.surface1,
                padding: 12,
                color: tokens.text,
                fontFamily: fonts.sans,
                fontSize: 14,
                minHeight: 120,
                borderWidth: 1,
                borderColor: tokens.border,
              }}
              accessibilityLabel={t('ai.request')}
            />
          </View>

          {/* Suggestions */}
          {!isRefinement && (
            <View style={{ gap: 8 }}>
              <Text style={{ fontFamily: fonts.sansB, fontSize: 9, color: tokens.textMute, textTransform: 'uppercase', letterSpacing: 2 }}>
                {t('ai.suggestions').toUpperCase()}
              </Text>
              <View style={{ gap: 0 }}>
                {SUGGESTIONS.map((s, i) => (
                  <TouchableOpacity
                    key={s.titleKey}
                    onPress={() => setPrompt(t(s.promptKey))}
                    style={{
                      paddingVertical: 12,
                      paddingHorizontal: 12,
                      borderBottomWidth: 1,
                      borderBottomColor: tokens.border,
                      borderTopWidth: i === 0 ? 1 : 0,
                      borderTopColor: tokens.border,
                      gap: 2,
                    }}
                    accessibilityLabel={t(s.titleKey)}
                    accessibilityRole="button"
                  >
                    <Text style={{ fontFamily: fonts.sansB, fontSize: 13, color: tokens.text, textTransform: 'uppercase' }}>
                      {t(s.titleKey)}
                    </Text>
                    <Text style={{ fontFamily: fonts.sans, fontSize: 12, color: tokens.textMute }}>
                      {t(s.descKey)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          <Button
            label={isRefinement ? t('ai.refine') : t('ai.generate')}
            onPress={handleGenerate}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
