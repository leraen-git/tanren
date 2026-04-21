import React, { useState } from 'react'
import { View, Text, TextInput, ScrollView, TouchableOpacity, Alert, KeyboardAvoidingView, Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useTheme } from '@/theme/ThemeContext'
import { Button } from '@/components/Button'
import { trpc } from '@/lib/trpc'
import { useAIPlanStore } from '@/stores/aiPlanStore'
import { useTranslation } from 'react-i18next'

export default function GeneratePlanScreen() {
  const { tokens, fonts } = useTheme()
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
              {'< BACK'}
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

        {/* Title */}
        <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
          <Text style={{ fontFamily: fonts.sansX, fontSize: 24, color: tokens.text, textTransform: 'uppercase' }}>
            {isRefinement ? t('generate.titleRefine') : t('generate.title')}
          </Text>
          <Text style={{ fontFamily: fonts.sans, fontSize: 12, color: tokens.textMute, marginTop: 4 }}>
            {t('generate.poweredBy')}
          </Text>
        </View>

        <ScrollView
          contentContainerStyle={{ padding: 16, gap: 20, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Profile chips */}
          {user && (
            <View style={{ gap: 8 }}>
              <Text style={{ fontFamily: fonts.sansB, fontSize: 9, color: tokens.textMute, textTransform: 'uppercase', letterSpacing: 2 }}>
                YOUR PROFILE
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
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

          {/* Prompt input */}
          <View style={{ gap: 8 }}>
            <Text style={{ fontFamily: fonts.sansB, fontSize: 10, color: tokens.textMute, textTransform: 'uppercase', letterSpacing: 2 }}>
              {isRefinement ? t('generate.refinementLabel').toUpperCase() : t('generate.describeLabel').toUpperCase()}
            </Text>
            <TextInput
              value={prompt}
              onChangeText={setPrompt}
              placeholder={isRefinement ? t('generate.refinementPlaceholder') : t('generate.placeholder')}
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
              accessibilityLabel={t('generate.describeLabel')}
            />
          </View>

          {/* Quick suggestions */}
          {!isRefinement && (
            <View style={{ gap: 8 }}>
              <Text style={{ fontFamily: fonts.sansB, fontSize: 9, color: tokens.textMute, textTransform: 'uppercase', letterSpacing: 2 }}>
                QUICK START
              </Text>
              <View style={{ gap: 0 }}>
                {PROMPT_SUGGESTIONS.map((s, i) => (
                  <TouchableOpacity
                    key={s}
                    onPress={() => setPrompt(s)}
                    style={{
                      paddingVertical: 12,
                      paddingHorizontal: 12,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 8,
                      borderBottomWidth: 1,
                      borderBottomColor: tokens.border,
                      borderTopWidth: i === 0 ? 1 : 0,
                      borderTopColor: tokens.border,
                    }}
                    accessibilityLabel={s}
                    accessibilityRole="button"
                  >
                    <Text style={{ fontFamily: fonts.sans, fontSize: 13, color: tokens.textDim, flex: 1 }}>
                      {s}
                    </Text>
                    <Text style={{ color: tokens.accent, fontFamily: fonts.sansB, fontSize: 12 }}>-{'>'}</Text>
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
