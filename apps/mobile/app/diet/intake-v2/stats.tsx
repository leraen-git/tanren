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
import type { BiologicalSex, GoalMode, Pace } from '@/stores/intakeDraftV2Store'
import { useTranslation } from 'react-i18next'
import { useProfile } from '@/data/useProfile'

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
  value, onChangeText, placeholder, unit,
}: { value: string; onChangeText: (v: string) => void; placeholder?: string; unit: string }) {
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
        placeholder={placeholder}
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

export default function IntakeStatsScreen() {
  const { tokens, fonts } = useTheme()
  const { t } = useTranslation()
  const { draft, update } = useIntakeDraftV2Store()
  const { data: user } = useProfile()

  React.useEffect(() => {
    if (!user) return
    const prefill: Partial<typeof draft> = {}
    if (user.heightCm && !draft.heightCm)
      prefill.heightCm = String(user.heightCm)
    if (user.weightKg && !draft.currentWeightKg)
      prefill.currentWeightKg = String(user.weightKg)
    if (user.gender && !draft.biologicalSex)
      prefill.biologicalSex = user.gender === 'FEMALE' ? 'FEMALE' : 'MALE'
    if (Object.keys(prefill).length > 0) update(prefill)
  }, [user])

  function validate(): boolean {
    if (!draft.age || Number(draft.age) < 16 || Number(draft.age) > 100) {
      Alert.alert(t('intakeV2.errAge')); return false
    }
    if (!draft.heightCm || Number(draft.heightCm) < 120) {
      Alert.alert(t('intakeV2.errHeight')); return false
    }
    if (!draft.currentWeightKg || Number(draft.currentWeightKg) < 35) {
      Alert.alert(t('intakeV2.errWeight')); return false
    }
    if (draft.goalMode === 'WEIGHT' && (!draft.goalWeightKg || Number(draft.goalWeightKg) < 35)) {
      Alert.alert(t('intakeV2.errGoal')); return false
    }
    if (draft.goalMode === 'FEEL' && !draft.goalFeel.trim()) {
      Alert.alert(t('intakeV2.errGoal')); return false
    }
    return true
  }

  return (
    <Screen showKanji kanjiChar="錬">
      <ScreenHeader
        showBack
        onBack={() => router.back()}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 16 }}
          keyboardShouldPersistTaps="handled"
        >
          <ProgressPills step={0} />

          <Text style={{
            fontFamily: fonts.sansB, fontSize: 10, letterSpacing: 2,
            textTransform: 'uppercase', color: tokens.textMute,
          }}>
            {t('intakeV2.step1Label')}
          </Text>

          <Text style={{
            fontFamily: fonts.sansX, fontSize: 26, color: tokens.text,
            textTransform: 'uppercase', letterSpacing: 0.6,
          }}>
            {t('intakeV2.step1Title')}
          </Text>

          <Text style={{ fontFamily: fonts.sans, fontSize: 13, color: tokens.textDim, lineHeight: 18 }}>
            {t('intakeV2.step1Sub')}
          </Text>

          {/* Age & Sex */}
          <View style={{ gap: 8 }}>
            <MiniLabel>{t('intakeV2.ageSexLabel')}</MiniLabel>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: fonts.sansB, fontSize: 9, color: tokens.textMute, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 4 }}>
                  {t('intakeV2.ageLabel')}
                </Text>
                <NumericInput
                  value={draft.age}
                  onChangeText={(v) => update({ age: v.replace(/[^0-9]/g, '') })}
                  unit={t('intakeV2.ageUnit')}
                />
              </View>
              <View style={{ flex: 1, flexDirection: 'row' }}>
                <SegOption
                  label={t('intakeV2.male')}
                  selected={draft.biologicalSex === 'MALE'}
                  onPress={() => update({ biologicalSex: 'MALE' as BiologicalSex })}
                />
                <SegOption
                  label={t('intakeV2.female')}
                  selected={draft.biologicalSex === 'FEMALE'}
                  onPress={() => update({ biologicalSex: 'FEMALE' as BiologicalSex })}
                />
              </View>
            </View>
          </View>

          {/* Height & Weight */}
          <View style={{ gap: 8 }}>
            <MiniLabel>{t('intakeV2.heightWeightLabel')}</MiniLabel>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: fonts.sansB, fontSize: 9, color: tokens.textMute, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 4 }}>
                  {t('intakeV2.heightLabel')}
                </Text>
                <NumericInput
                  value={draft.heightCm}
                  onChangeText={(v) => update({ heightCm: v.replace(/[^0-9]/g, '') })}
                  unit={t('intakeV2.heightUnit')}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: fonts.sansB, fontSize: 9, color: tokens.textMute, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 4 }}>
                  {t('intakeV2.weightLabel')}
                </Text>
                <NumericInput
                  value={draft.currentWeightKg}
                  onChangeText={(v) => update({ currentWeightKg: v.replace(/[^0-9.,]/g, '') })}
                  unit={t('intakeV2.weightUnit')}
                />
              </View>
            </View>
          </View>

          {/* Goal mode toggle */}
          <View style={{ gap: 8 }}>
            <MiniLabel>{t('intakeV2.goalLabel')}</MiniLabel>
            <View style={{ flexDirection: 'row' }}>
              <SegOption
                label={t('intakeV2.goalWeight')}
                selected={draft.goalMode === 'WEIGHT'}
                onPress={() => update({ goalMode: 'WEIGHT' as GoalMode })}
              />
              <SegOption
                label={t('intakeV2.goalFeel')}
                selected={draft.goalMode === 'FEEL'}
                onPress={() => update({ goalMode: 'FEEL' as GoalMode })}
              />
            </View>

            {draft.goalMode === 'WEIGHT' ? (
              <View>
                <Text style={{ fontFamily: fonts.sansB, fontSize: 9, color: tokens.textMute, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 4 }}>
                  {t('intakeV2.goalWeightLabel')}
                </Text>
                <NumericInput
                  value={draft.goalWeightKg}
                  onChangeText={(v) => update({ goalWeightKg: v.replace(/[^0-9.,]/g, '') })}
                  unit={t('intakeV2.weightUnit')}
                />
              </View>
            ) : (
              <TextInput
                value={draft.goalFeel}
                onChangeText={(v) => update({ goalFeel: v })}
                placeholder={t('intakeV2.goalFeelPlaceholder')}
                placeholderTextColor={tokens.textGhost}
                style={{
                  fontFamily: fonts.sans, fontSize: 14, color: tokens.text,
                  borderBottomWidth: 1, borderBottomColor: draft.goalFeel ? tokens.text : tokens.borderStrong,
                  paddingBottom: 6, paddingTop: 4,
                }}
              />
            )}
          </View>

          {/* Pace */}
          <View style={{ gap: 8 }}>
            <MiniLabel>{t('intakeV2.paceLabel')}</MiniLabel>
            <RadioCard
              title={t('intakeV2.paceSteady')}
              desc={t('intakeV2.paceSteadyDesc')}
              selected={draft.pace === 'STEADY'}
              onPress={() => update({ pace: 'STEADY' as Pace })}
            />
            <RadioCard
              title={t('intakeV2.paceFast')}
              desc={t('intakeV2.paceFastDesc')}
              selected={draft.pace === 'FAST'}
              onPress={() => update({ pace: 'FAST' as Pace })}
            />
          </View>

          <Button
            label={t('intakeV2.continue')}
            onPress={() => { if (validate()) router.push('/diet/intake-v2/lifestyle') }}
            style={{ marginTop: 4 }}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  )
}
