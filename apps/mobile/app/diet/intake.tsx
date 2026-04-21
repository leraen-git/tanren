import React, { useState, useRef } from 'react'
import {
  View, Text, TextInput, ScrollView, TouchableOpacity,
  Alert, KeyboardAvoidingView, Platform, Switch,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useTheme } from '@/theme/ThemeContext'
import { Button } from '@/components/Button'
import { trpc } from '@/lib/trpc'
import { useDietIntakeStore } from '@/stores/dietIntakeStore'
import { useTranslation } from 'react-i18next'

const TOTAL_STEPS = 4

function ProgressDots({ step }: { step: number }) {
  const { tokens } = useTheme()
  return (
    <View style={{ flexDirection: 'row', gap: 4, justifyContent: 'center' }}>
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
        <View key={i} style={{
          width: i === step ? 16 : 6, height: 6,
          backgroundColor: i === step ? tokens.accent : tokens.surface2,
        }} />
      ))}
    </View>
  )
}

function Chip({
  label, selected, onPress,
}: { label: string; selected: boolean; onPress: () => void }) {
  const { tokens, fonts } = useTheme()
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: selected ? tokens.accent : tokens.border,
        backgroundColor: selected ? tokens.accent : 'transparent',
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Text style={{
        fontFamily: fonts.sansB,
        fontSize: 10,
        letterSpacing: 1.4,
        color: selected ? '#FFFFFF' : tokens.textMute,
        textTransform: 'uppercase',
      }}>{label}</Text>
    </TouchableOpacity>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  const { tokens, fonts } = useTheme()
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontFamily: fonts.sansB, fontSize: 9, color: tokens.textMute, textTransform: 'uppercase', letterSpacing: 2 }}>
        {label}
      </Text>
      {children}
    </View>
  )
}

export default function DietIntakeScreen() {
  const { tokens, fonts } = useTheme()
  const { t } = useTranslation()
  const [step, setStep] = useState(0)
  const { intake, update } = useDietIntakeStore()
  const { data: user } = trpc.users.me.useQuery()
  const scrollRef = useRef<ScrollView>(null)

  React.useEffect(() => {
    if (!user) return
    const prefill: Partial<typeof intake> = {}
    if (user.gender && (user.gender === 'female' || user.gender === 'male')) {
      prefill.sex = user.gender
    }
    if (user.weightKg && !intake.goalWeight) {
      prefill.goalWeight = String(Math.round(user.weightKg))
    }
    if (!intake.goalPace || intake.goalPace === 'steady') {
      prefill.goalPace = user.goal === 'WEIGHT_LOSS' ? 'fast' : 'steady'
    }
    if (user.weeklyTarget && !intake.exerciseFrequency) {
      prefill.exerciseFrequency = `${user.weeklyTarget} sessions per week`
    }
    if (Object.keys(prefill).length > 0) update(prefill)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const inputStyle = {
    fontFamily: fonts.mono,
    fontSize: 14,
    color: tokens.text,
    borderBottomWidth: 1,
    borderBottomColor: tokens.border,
    paddingVertical: 8,
  }

  const validateStep = () => {
    if (step === 0) {
      if (!intake.age || isNaN(Number(intake.age))) return t('intake.errAge')
      if (!intake.sex) return t('intake.errSex')
    }
    if (step === 1) {
      if (!intake.jobType.trim()) return t('intake.errJob')
      if (!intake.exerciseFrequency.trim()) return t('intake.errExercise')
    }
    if (step === 2) {
      if (intake.favoriteFoods.length === 0) return t('intake.errFoods')
    }
    return null
  }

  const handleNext = () => {
    const err = validateStep()
    if (err) { Alert.alert(t('intake.errMissingInfo'), err); return }
    if (step < TOTAL_STEPS - 1) {
      setStep(step + 1)
      scrollRef.current?.scrollTo({ y: 0, animated: false })
    } else {
      router.push('/diet/generating')
    }
  }

  const stepTitles = [
    t('intake.step1Title'),
    t('intake.step2Title'),
    t('intake.step3Title'),
    t('intake.step4Title'),
  ]

  const stepSubtitles = [
    t('intake.step1Subtitle'),
    t('intake.step2Subtitle'),
    t('intake.step3Subtitle'),
    t('intake.step4Subtitle'),
  ]

  const [foodInput, setFoodInput] = useState('')
  const addFood = () => {
    const trimmed = foodInput.trim()
    if (!trimmed || intake.favoriteFoods.length >= 10) return
    update({ favoriteFoods: [...intake.favoriteFoods, trimmed] })
    setFoodInput('')
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: tokens.bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Header */}
        <View style={{ padding: 16, gap: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <TouchableOpacity
              onPress={() => { if (step === 0) router.back(); else setStep(step - 1) }}
              accessibilityLabel={t('common.back')} accessibilityRole="button"
            >
              <Text style={{ fontFamily: fonts.sansB, fontSize: 10, color: tokens.accent, textTransform: 'uppercase', letterSpacing: 2 }}>
                {'< BACK'}
              </Text>
            </TouchableOpacity>
            <View style={{ flex: 1 }} />
            <Text style={{ fontFamily: fonts.monoB, fontSize: 12, color: tokens.textMute }}>
              {step + 1}/{TOTAL_STEPS}
            </Text>
          </View>
          <Text style={{ fontFamily: fonts.sansX, fontSize: 20, color: tokens.text, textTransform: 'uppercase' }}>
            {stepTitles[step]}
          </Text>
          <ProgressDots step={step} />
          <Text style={{ fontFamily: fonts.sans, fontSize: 13, color: tokens.textDim }}>
            {stepSubtitles[step]}
          </Text>
        </View>

        <ScrollView
          ref={scrollRef}
          contentContainerStyle={{ padding: 16, gap: 20, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* STEP 0: Stats */}
          {step === 0 && (
            <>
              <Field label={t('intake.ageLabel')}>
                <TextInput
                  value={intake.age}
                  onChangeText={(v) => update({ age: v })}
                  keyboardType="number-pad"
                  placeholder={t('intake.agePlaceholder')}
                  placeholderTextColor={tokens.textGhost}
                  style={inputStyle}
                  accessibilityLabel={t('intake.ageLabel')}
                />
              </Field>

              <Field label={t('intake.sexLabel')}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Chip label={t('intake.male')} selected={intake.sex === 'male'} onPress={() => update({ sex: 'male' })} />
                  <Chip label={t('intake.female')} selected={intake.sex === 'female'} onPress={() => update({ sex: 'female' })} />
                </View>
              </Field>

              <Field label={t('intake.goalWeightLabel')}>
                <TextInput
                  value={intake.goalWeight}
                  onChangeText={(v) => update({ goalWeight: v })}
                  keyboardType="decimal-pad"
                  placeholder={t('intake.goalWeightPlaceholder')}
                  placeholderTextColor={tokens.textGhost}
                  style={inputStyle}
                  accessibilityLabel={t('intake.goalWeightLabel')}
                />
              </Field>

              <Field label={t('intake.goalPaceLabel')}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Chip label={t('intake.goalPaceSteady')} selected={intake.goalPace === 'steady'} onPress={() => update({ goalPace: 'steady' })} />
                  <Chip label={t('intake.goalPaceFast')} selected={intake.goalPace === 'fast'} onPress={() => update({ goalPace: 'fast' })} />
                </View>
              </Field>
            </>
          )}

          {/* STEP 1: Lifestyle */}
          {step === 1 && (
            <>
              <Field label={t('intake.jobLabel')}>
                <TextInput
                  value={intake.jobType}
                  onChangeText={(v) => update({ jobType: v })}
                  placeholder={t('intake.jobPlaceholder')}
                  placeholderTextColor={tokens.textGhost}
                  style={inputStyle}
                  accessibilityLabel={t('intake.jobLabel')}
                />
              </Field>

              <Field label={t('intake.exerciseLabel')}>
                <TextInput
                  value={intake.exerciseFrequency}
                  onChangeText={(v) => update({ exerciseFrequency: v })}
                  placeholder={t('intake.exercisePlaceholder')}
                  placeholderTextColor={tokens.textGhost}
                  style={inputStyle}
                  accessibilityLabel={t('intake.exerciseLabel')}
                />
              </Field>

              <Field label={t('intake.sleepLabel')}>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {['5', '6', '7', '8', '9+'].map((h) => (
                    <Chip key={h} label={h} selected={intake.sleepHours === h} onPress={() => update({ sleepHours: h })} />
                  ))}
                </View>
              </Field>

              <Field label={t('intake.stressLabel')}>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {([
                    { key: 'low', label: t('intake.stressLow') },
                    { key: 'moderate', label: t('intake.stressModerate') },
                    { key: 'high', label: t('intake.stressHigh') },
                  ] as const).map((s) => (
                    <Chip key={s.key} label={s.label} selected={intake.stressLevel === s.key} onPress={() => update({ stressLevel: s.key })} />
                  ))}
                </View>
              </Field>

              <Field label={t('intake.alcoholLabel')}>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {([
                    { key: 'none', label: t('intake.alcoholNone') },
                    { key: '1-2 drinks', label: t('intake.alcohol12') },
                    { key: '3-5 drinks', label: t('intake.alcohol35') },
                    { key: '6-10 drinks', label: t('intake.alcohol610') },
                    { key: '10+ drinks', label: t('intake.alcohol10plus') },
                  ]).map((a) => (
                    <Chip key={a.key} label={a.label} selected={intake.alcoholPerWeek === a.key} onPress={() => update({ alcoholPerWeek: a.key })} />
                  ))}
                </View>
              </Field>
            </>
          )}

          {/* STEP 2: Food preferences */}
          {step === 2 && (
            <>
              <Field label={t('intake.favFoodsLabel', { count: intake.favoriteFoods.length })}>
                <View style={{ gap: 8 }}>
                  {intake.favoriteFoods.map((f, i) => (
                    <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <View style={{ flex: 1, borderBottomWidth: 1, borderBottomColor: tokens.border, paddingVertical: 8 }}>
                        <Text style={{ fontFamily: fonts.sans, fontSize: 14, color: tokens.text }}>{f}</Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => update({ favoriteFoods: intake.favoriteFoods.filter((_, j) => j !== i) })}
                        accessibilityLabel={`${t('common.remove')} ${f}`}
                        accessibilityRole="button"
                      >
                        <Text style={{ fontFamily: fonts.sansB, fontSize: 17, color: tokens.textMute }}>x</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                  {intake.favoriteFoods.length < 10 && (
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <TextInput
                        value={foodInput}
                        onChangeText={setFoodInput}
                        placeholder={t('intake.favFoodsPlaceholder')}
                        placeholderTextColor={tokens.textGhost}
                        style={{ ...inputStyle, flex: 1 }}
                        onSubmitEditing={addFood}
                        returnKeyType="done"
                        accessibilityLabel={t('intake.favFoodsLabel', { count: intake.favoriteFoods.length })}
                      />
                      <TouchableOpacity
                        onPress={addFood}
                        style={{
                          backgroundColor: tokens.accent,
                          width: 40, height: 40,
                          alignItems: 'center', justifyContent: 'center',
                        }}
                        accessibilityLabel={t('common.add')} accessibilityRole="button"
                      >
                        <Text style={{ fontFamily: fonts.sansB, fontSize: 20, color: '#FFFFFF' }}>+</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </Field>

              <Field label={t('intake.hatedFoodsLabel')}>
                <TextInput
                  value={intake.hatedFoods}
                  onChangeText={(v) => update({ hatedFoods: v })}
                  placeholder={t('intake.hatedFoodsPlaceholder')}
                  placeholderTextColor={tokens.textGhost}
                  style={inputStyle}
                  accessibilityLabel={t('intake.hatedFoodsLabel')}
                />
              </Field>

              <Field label={t('intake.restrictionsLabel')}>
                <TextInput
                  value={intake.dietaryRestrictions}
                  onChangeText={(v) => update({ dietaryRestrictions: v })}
                  placeholder={t('intake.restrictionsPlaceholder')}
                  placeholderTextColor={tokens.textGhost}
                  style={inputStyle}
                  accessibilityLabel={t('intake.restrictionsLabel')}
                />
              </Field>

              <Field label={t('intake.cookingStyleLabel')}>
                <View style={{ gap: 0 }}>
                  {([
                    { key: 'scratch', label: t('intake.cookingScratch'), desc: t('intake.cookingScratchDesc') },
                    { key: 'quick',   label: t('intake.cookingQuick'),   desc: t('intake.cookingQuickDesc') },
                    { key: 'batch',   label: t('intake.cookingBatch'),   desc: t('intake.cookingBatchDesc') },
                  ] as const).map((o) => (
                    <TouchableOpacity
                      key={o.key}
                      onPress={() => update({ cookingStyle: o.key })}
                      style={{
                        flexDirection: 'row', alignItems: 'center', gap: 12,
                        padding: 12,
                        borderWidth: 1,
                        borderColor: intake.cookingStyle === o.key ? tokens.accent : tokens.border,
                        borderLeftWidth: intake.cookingStyle === o.key ? 3 : 1,
                        borderLeftColor: intake.cookingStyle === o.key ? tokens.accent : tokens.border,
                        marginTop: -1,
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={o.label}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontFamily: fonts.sansB, fontSize: 13, color: tokens.text, textTransform: 'uppercase' }}>{o.label}</Text>
                        <Text style={{ fontFamily: fonts.sans, fontSize: 12, color: tokens.textMute }}>{o.desc}</Text>
                      </View>
                      {intake.cookingStyle === o.key && (
                        <Text style={{ color: tokens.accent, fontFamily: fonts.sansB, fontSize: 12 }}>V</Text>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </Field>

              <Field label={t('intake.adventureLabel', { score: intake.foodAdventure })}>
                <View style={{ flexDirection: 'row', gap: 2 }}>
                  {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                    <TouchableOpacity
                      key={n}
                      onPress={() => update({ foodAdventure: n })}
                      style={{
                        flex: 1, paddingVertical: 8,
                        backgroundColor: n <= intake.foodAdventure ? tokens.accent : tokens.surface2,
                        alignItems: 'center',
                      }}
                      accessibilityRole="button" accessibilityLabel={`${n}`}
                    >
                      <Text style={{ fontFamily: fonts.monoB, fontSize: 9, color: n <= intake.foodAdventure ? '#FFFFFF' : tokens.textMute }}>
                        {n}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontFamily: fonts.sans, fontSize: 9, color: tokens.textMute }}>{t('intake.adventureMin')}</Text>
                  <Text style={{ fontFamily: fonts.sans, fontSize: 9, color: tokens.textMute }}>{t('intake.adventureMax')}</Text>
                </View>
              </Field>
            </>
          )}

          {/* STEP 3: Snack habits */}
          {step === 3 && (
            <>
              <Field label={t('intake.currentSnacksLabel')}>
                <TextInput
                  value={intake.currentSnacks}
                  onChangeText={(v) => update({ currentSnacks: v })}
                  placeholder={t('intake.currentSnacksPlaceholder')}
                  placeholderTextColor={tokens.textGhost}
                  style={inputStyle}
                  accessibilityLabel={t('intake.currentSnacksLabel')}
                />
              </Field>

              <Field label={t('intake.snackReasonLabel')}>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {([
                    { key: 'hunger',  label: t('intake.snackReasonHunger') },
                    { key: 'boredom', label: t('intake.snackReasonBoredom') },
                    { key: 'habit',   label: t('intake.snackReasonHabit') },
                  ] as const).map((r) => (
                    <Chip key={r.key} label={r.label} selected={intake.snackReason === r.key} onPress={() => update({ snackReason: r.key })} />
                  ))}
                </View>
              </Field>

              <Field label={t('intake.snackPrefLabel')}>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {([
                    { key: 'sweet',   label: t('intake.snackPrefSweet') },
                    { key: 'savoury', label: t('intake.snackPrefSavoury') },
                    { key: 'both',    label: t('intake.snackPrefBoth') },
                  ] as const).map((p) => (
                    <Chip key={p.key} label={p.label} selected={intake.snackPreference === p.key} onPress={() => update({ snackPreference: p.key })} />
                  ))}
                </View>
              </Field>

              <Field label={t('intake.nightSnackLabel')}>
                <View style={{
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                  borderWidth: 1, borderColor: tokens.border, padding: 12,
                }}>
                  <Text style={{ fontFamily: fonts.sans, fontSize: 14, color: tokens.text }}>
                    {intake.nightSnacking ? t('intake.nightSnackYes') : t('intake.nightSnackNo')}
                  </Text>
                  <Switch
                    value={intake.nightSnacking}
                    onValueChange={(v) => update({ nightSnacking: v })}
                    trackColor={{ true: tokens.accent, false: tokens.surface2 }}
                    thumbColor="#FFFFFF"
                    accessibilityLabel={t('intake.nightSnackLabel')}
                  />
                </View>
              </Field>

              {/* Summary */}
              <View style={{
                padding: 12,
                borderWidth: 1,
                borderColor: tokens.accent,
                borderLeftWidth: 3,
                borderLeftColor: tokens.accent,
                gap: 4,
              }}>
                <Text style={{ fontFamily: fonts.sansB, fontSize: 13, color: tokens.accent, textTransform: 'uppercase' }}>
                  {t('intake.readyTitle')}
                </Text>
                <Text style={{ fontFamily: fonts.sans, fontSize: 12, color: tokens.textMute }}>
                  {t('intake.readyDesc')}
                </Text>
              </View>
            </>
          )}

          <Button
            label={step < TOTAL_STEPS - 1 ? t('intake.continue') : t('intake.generate')}
            onPress={handleNext}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
