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
import type { JobType, ExerciseFrequency, StressLevel, AlcoholBracket } from '@/stores/intakeDraftV2Store'
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

function NumericInput({
  value, onChangeText, unit,
}: { value: string; onChangeText: (v: string) => void; unit: string }) {
  const { tokens, fonts } = useTheme()
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center',
      borderBottomWidth: 1, borderBottomColor: value ? tokens.text : tokens.borderStrong,
      paddingBottom: 6, gap: 4,
    }}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType="numeric"
        placeholderTextColor={tokens.textGhost}
        style={{
          flex: 1, fontFamily: fonts.sansX, fontSize: 24, color: tokens.text,
          padding: 0,
        }}
      />
      <Text style={{ fontFamily: fonts.sans, fontSize: 14, color: tokens.textMute }}>
        {unit}
      </Text>
    </View>
  )
}

export default function IntakeLifestyleScreen() {
  const { tokens, fonts } = useTheme()
  const { t } = useTranslation()
  const { draft, update } = useIntakeDraftV2Store()

  function validate(): boolean {
    if (!draft.exerciseType.trim()) {
      Alert.alert(t('intakeV2.errExerciseType')); return false
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
          <ProgressPills step={1} />

          <Text style={{
            fontFamily: fonts.sansB, fontSize: 10, letterSpacing: 2,
            textTransform: 'uppercase', color: tokens.textMute,
          }}>
            {t('intakeV2.step2Label')}
          </Text>

          <Text style={{
            fontFamily: fonts.sansX, fontSize: 26, color: tokens.text,
            textTransform: 'uppercase', letterSpacing: 0.6,
          }}>
            {t('intakeV2.step2Title')}
          </Text>

          <Text style={{ fontFamily: fonts.sans, fontSize: 13, color: tokens.textDim, lineHeight: 18 }}>
            {t('intakeV2.step2Sub')}
          </Text>

          {/* Job type */}
          <View style={{ gap: 8 }}>
            <MiniLabel>{t('intakeV2.jobLabel')}</MiniLabel>
            <RadioCard
              title={t('intakeV2.jobDesk')}
              desc={t('intakeV2.jobDeskDesc')}
              selected={draft.jobType === 'DESK'}
              onPress={() => update({ jobType: 'DESK' as JobType })}
            />
            <RadioCard
              title={t('intakeV2.jobStanding')}
              desc={t('intakeV2.jobStandingDesc')}
              selected={draft.jobType === 'STANDING'}
              onPress={() => update({ jobType: 'STANDING' as JobType })}
            />
            <RadioCard
              title={t('intakeV2.jobManual')}
              desc={t('intakeV2.jobManualDesc')}
              selected={draft.jobType === 'MANUAL'}
              onPress={() => update({ jobType: 'MANUAL' as JobType })}
            />
          </View>

          {/* Exercise frequency */}
          <View style={{ gap: 8 }}>
            <MiniLabel>{t('intakeV2.exerciseFreqLabel')}</MiniLabel>
            <View style={{ flexDirection: 'row' }}>
              {(['0-1', '2-3', '4+'] as ExerciseFrequency[]).map((freq) => (
                <SegOption
                  key={freq}
                  label={t(`intakeV2.exerciseFreq${freq === '0-1' ? '01' : freq === '2-3' ? '23' : '4'}`)}
                  selected={draft.exerciseFrequency === freq}
                  onPress={() => update({ exerciseFrequency: freq })}
                />
              ))}
            </View>

            <Text style={{ fontFamily: fonts.sansB, fontSize: 9, color: tokens.textMute, textTransform: 'uppercase', letterSpacing: 1.5, marginTop: 4 }}>
              {t('intakeV2.exerciseTypeLabel')}
            </Text>
            <TextInput
              value={draft.exerciseType}
              onChangeText={(v) => update({ exerciseType: v })}
              placeholder={t('intakeV2.exerciseTypePlaceholder')}
              placeholderTextColor={tokens.textGhost}
              multiline
              style={{
                fontFamily: fonts.sans, fontSize: 14, color: tokens.text,
                borderBottomWidth: 1,
                borderBottomColor: draft.exerciseType ? tokens.text : tokens.borderStrong,
                paddingBottom: 6, paddingTop: 2, minHeight: 40,
              }}
            />
          </View>

          {/* Sleep & Stress */}
          <View style={{ gap: 8 }}>
            <MiniLabel>{t('intakeV2.sleepStressLabel')}</MiniLabel>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: fonts.sansB, fontSize: 9, color: tokens.textMute, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 4 }}>
                  {t('intakeV2.sleepLabel')}
                </Text>
                <NumericInput
                  value={draft.sleepHours}
                  onChangeText={(v) => update({ sleepHours: v.replace(/[^0-9]/g, '') })}
                  unit={t('intakeV2.sleepUnit')}
                />
              </View>
              <View style={{ flex: 1, flexDirection: 'row' }}>
                {(['LOW', 'MODERATE', 'HIGH'] as StressLevel[]).map((level) => (
                  <SegOption
                    key={level}
                    label={t(`intakeV2.stress${level === 'LOW' ? 'Low' : level === 'MODERATE' ? 'Mod' : 'High'}`)}
                    selected={draft.stressLevel === level}
                    onPress={() => update({ stressLevel: level })}
                  />
                ))}
              </View>
            </View>
          </View>

          {/* Alcohol */}
          <View style={{ gap: 8 }}>
            <MiniLabel>{t('intakeV2.alcoholLabel')}</MiniLabel>
            <View style={{ flexDirection: 'row' }}>
              {(['0', '1-5', '6+'] as AlcoholBracket[]).map((bracket) => (
                <SegOption
                  key={bracket}
                  label={t(`intakeV2.alcohol${bracket === '0' ? 'None' : bracket === '1-5' ? '15' : '6'}`)}
                  selected={draft.alcoholBracket === bracket}
                  onPress={() => update({ alcoholBracket: bracket })}
                />
              ))}
            </View>
          </View>

          <Button
            label={t('intakeV2.continue')}
            onPress={() => { if (validate()) router.push('/diet/intake-v2/food-preferences') }}
            style={{ marginTop: 4 }}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  )
}
