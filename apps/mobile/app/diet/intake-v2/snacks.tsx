import React from 'react'
import {
  View, Text, TextInput, ScrollView, TouchableOpacity,
  Alert, KeyboardAvoidingView, Platform,
} from 'react-native'
import { router } from 'expo-router'
import { useTheme } from '@/theme/ThemeContext'
import { Screen } from '@/components/Screen'
import { ScreenHeader } from '@/components/ScreenHeader'
import { Button } from '@/components/Button'
import { useIntakeDraftV2Store } from '@/stores/intakeDraftV2Store'
import type { SnackMotivation, SnackPreference, NightSnacking } from '@/stores/intakeDraftV2Store'
import { useTranslation } from 'react-i18next'

function ProgressPills({ step }: { step: number }) {
  const { tokens } = useTheme()
  return (
    <View style={{ flexDirection: 'row', gap: 4 }}>
      {[0, 1, 2, 3].map((i) => (
        <View key={i} style={{
          flex: 1, height: 3,
          backgroundColor: i <= step ? tokens.accent : tokens.surface2,
        }} />
      ))}
    </View>
  )
}

function MiniLabel({ children }: { children: string }) {
  const { tokens, fonts } = useTheme()
  return (
    <Text style={{
      fontFamily: fonts.sansB, fontSize: 9, color: tokens.textMute,
      textTransform: 'uppercase', letterSpacing: 2,
    }}>
      {children}
    </Text>
  )
}

function SegOption({
  label, selected, onPress,
}: { label: string; selected: boolean; onPress: () => void }) {
  const { tokens, fonts } = useTheme()
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        flex: 1, paddingVertical: 10, alignItems: 'center',
        backgroundColor: selected ? tokens.accent : tokens.surface2,
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Text style={{
        fontFamily: fonts.sansB, fontSize: 12, letterSpacing: 0.8,
        textTransform: 'uppercase',
        color: selected ? '#FFFFFF' : tokens.textMute,
      }}>
        {label}
      </Text>
    </TouchableOpacity>
  )
}

function RadioCard({
  title, desc, selected, onPress,
}: { title: string; desc: string; selected: boolean; onPress: () => void }) {
  const { tokens, fonts } = useTheme()
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        padding: 14,
        borderWidth: 1,
        borderColor: selected ? tokens.accent : tokens.border,
        backgroundColor: selected ? `${tokens.accent}10` : 'transparent',
      }}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
    >
      <Text style={{ fontFamily: fonts.sansB, fontSize: 14, color: tokens.text }}>
        {title}
      </Text>
      <Text style={{ fontFamily: fonts.sans, fontSize: 12, color: tokens.textMute, marginTop: 2 }}>
        {desc}
      </Text>
    </TouchableOpacity>
  )
}

export default function IntakeSnacksScreen() {
  const { tokens, fonts } = useTheme()
  const { t } = useTranslation()
  const { draft, update } = useIntakeDraftV2Store()

  function validate(): boolean {
    if (!draft.currentSnacks.trim()) {
      Alert.alert(t('intakeV2.errSnacks')); return false
    }
    return true
  }

  return (
    <Screen showKanji kanjiChar="錬">
      <ScreenHeader showBack onBack={() => router.back()} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 16 }}
          keyboardShouldPersistTaps="handled"
        >
          <ProgressPills step={3} />

          <Text style={{
            fontFamily: fonts.sansB, fontSize: 10, letterSpacing: 2,
            textTransform: 'uppercase', color: tokens.textMute,
          }}>
            {t('intakeV2.step4Label')}
          </Text>

          <Text style={{
            fontFamily: fonts.sansX, fontSize: 26, color: tokens.text,
            textTransform: 'uppercase', letterSpacing: 0.6,
          }}>
            {t('intakeV2.step4Title')}
          </Text>

          <Text style={{ fontFamily: fonts.sans, fontSize: 13, color: tokens.textDim, lineHeight: 18 }}>
            {t('intakeV2.step4Sub')}
          </Text>

          {/* Current snacks */}
          <View style={{ gap: 8 }}>
            <MiniLabel>{t('intakeV2.currentSnacksLabel')}</MiniLabel>
            <TextInput
              value={draft.currentSnacks}
              onChangeText={(v) => update({ currentSnacks: v })}
              placeholder={t('intakeV2.currentSnacksPlaceholder')}
              placeholderTextColor={tokens.textGhost}
              multiline
              style={{
                fontFamily: fonts.sans, fontSize: 14, color: tokens.text,
                backgroundColor: tokens.surface2,
                padding: 12, minHeight: 64,
              }}
            />
          </View>

          {/* Snack motivation */}
          <View style={{ gap: 8 }}>
            <MiniLabel>{t('intakeV2.snackWhyLabel')}</MiniLabel>
            <View style={{ flexDirection: 'row' }}>
              {(['HUNGER', 'BOREDOM', 'HABIT'] as SnackMotivation[]).map((m) => (
                <SegOption
                  key={m}
                  label={t(`intakeV2.snackWhy${m === 'HUNGER' ? 'Hunger' : m === 'BOREDOM' ? 'Boredom' : 'Habit'}`)}
                  selected={draft.snackMotivation === m}
                  onPress={() => update({ snackMotivation: m })}
                />
              ))}
            </View>
          </View>

          {/* Snack preference */}
          <View style={{ gap: 8 }}>
            <MiniLabel>{t('intakeV2.snackPrefLabel')}</MiniLabel>
            <View style={{ flexDirection: 'row' }}>
              {(['SWEET', 'SAVOURY', 'BOTH'] as SnackPreference[]).map((p) => (
                <SegOption
                  key={p}
                  label={t(`intakeV2.snackPref${p === 'SWEET' ? 'Sweet' : p === 'SAVOURY' ? 'Savoury' : 'Both'}`)}
                  selected={draft.snackPreference === p}
                  onPress={() => update({ snackPreference: p })}
                />
              ))}
            </View>
          </View>

          {/* Night snacking */}
          <View style={{ gap: 8 }}>
            <MiniLabel>{t('intakeV2.nightLabel')}</MiniLabel>
            <RadioCard
              title={t('intakeV2.nightNever')}
              desc={t('intakeV2.nightNeverDesc')}
              selected={draft.nightSnacking === 'NEVER'}
              onPress={() => update({ nightSnacking: 'NEVER' as NightSnacking })}
            />
            <RadioCard
              title={t('intakeV2.nightSometimes')}
              desc={t('intakeV2.nightSometimesDesc')}
              selected={draft.nightSnacking === 'SOMETIMES'}
              onPress={() => update({ nightSnacking: 'SOMETIMES' as NightSnacking })}
            />
            <RadioCard
              title={t('intakeV2.nightOften')}
              desc={t('intakeV2.nightOftenDesc')}
              selected={draft.nightSnacking === 'OFTEN'}
              onPress={() => update({ nightSnacking: 'OFTEN' as NightSnacking })}
            />
          </View>

          <Button
            label={t('intakeV2.generate')}
            onPress={() => {
              if (validate()) router.replace('/diet/generating-v2')
            }}
            style={{ marginTop: 4 }}
          />
          <Text style={{
            fontFamily: fonts.sans, fontSize: 11, color: tokens.textGhost,
            textAlign: 'center',
          }}>
            {t('intakeV2.ctaMeta')}
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  )
}
