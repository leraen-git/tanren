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
import { colors as tokenColors } from '@/theme/tokens'
import { useTranslation } from 'react-i18next'

const TOTAL_STEPS = 4

function ProgressDots({ step }: { step: number }) {
  const { colors, spacing } = useTheme()
  return (
    <View style={{ flexDirection: 'row', gap: spacing.xs, justifyContent: 'center' }}>
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
        <View key={i} style={{
          width: i === step ? 20 : 8, height: 8,
          borderRadius: 4,
          backgroundColor: i === step ? colors.primary : colors.surface2,
        }} />
      ))}
    </View>
  )
}

function Chip({
  label, selected, onPress,
}: { label: string; selected: boolean; onPress: () => void }) {
  const { colors, typography, spacing, radius } = useTheme()
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderRadius: radius.pill,
        backgroundColor: selected ? colors.primary : colors.surface2,
        borderWidth: selected ? 0 : 1,
        borderColor: colors.surface2,
      }}
      accessibilityRole="button"
    >
      <Text style={{
        fontFamily: selected ? typography.family.semiBold : typography.family.regular,
        fontSize: typography.size.base,
        color: selected ? tokenColors.white : colors.textMuted,
      }}>{label}</Text>
    </TouchableOpacity>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  const { colors, typography, spacing } = useTheme()
  return (
    <View style={{ gap: spacing.xs }}>
      <Text style={{ fontFamily: typography.family.semiBold, fontSize: typography.size.base, color: colors.textMuted }}>
        {label}
      </Text>
      {children}
    </View>
  )
}

export default function DietIntakeScreen() {
  const { colors, typography, spacing, radius } = useTheme()
  const { t } = useTranslation()
  const [step, setStep] = useState(0)
  const { intake, update } = useDietIntakeStore()
  const { data: user } = trpc.users.me.useQuery()
  const scrollRef = useRef<ScrollView>(null)

  // Pre-fill from user profile on mount
  React.useEffect(() => {
    if (!user) return
    const prefill: Partial<typeof intake> = {}

    // Sex — default store value is 'male', so check against profile explicitly
    if (user.gender && (user.gender === 'female' || user.gender === 'male')) {
      prefill.sex = user.gender
    }

    // Goal weight — use current weight as starting point if not yet set
    if (user.weightKg && !intake.goalWeight) {
      prefill.goalWeight = String(Math.round(user.weightKg))
    }

    // Goal pace — derive from fitness goal
    if (!intake.goalPace || intake.goalPace === 'steady') {
      prefill.goalPace = user.goal === 'WEIGHT_LOSS' ? 'fast' : 'steady'
    }

    // Exercise frequency — derive from weekly training target
    if (user.weeklyTarget && !intake.exerciseFrequency) {
      prefill.exerciseFrequency = `${user.weeklyTarget} sessions per week`
    }

    if (Object.keys(prefill).length > 0) update(prefill)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const inputStyle = {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    color: colors.textPrimary,
    fontFamily: typography.family.regular,
    fontSize: typography.size.body,
    borderWidth: 1,
    borderColor: colors.surface2,
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
      router.push('/diet/generating' as any)
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
    if (!trimmed || intake.favoriteFoods.length >= 5) return
    update({ favoriteFoods: [...intake.favoriteFoods, trimmed] })
    setFoodInput('')
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Header */}
        <View style={{ padding: spacing.base, gap: spacing.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <TouchableOpacity
              onPress={() => { if (step === 0) router.back(); else setStep(step - 1) }}
              accessibilityLabel={t('common.back')} accessibilityRole="button"
            >
              <Text style={{ fontFamily: typography.family.bold, fontSize: typography.size.title, color: colors.primary }}>←</Text>
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: typography.family.extraBold, fontSize: typography.size.xl, color: colors.textPrimary }}>
                {stepTitles[step]}
              </Text>
            </View>
            <Text style={{ fontFamily: typography.family.semiBold, fontSize: typography.size.base, color: colors.textMuted }}>
              {step + 1}/{TOTAL_STEPS}
            </Text>
          </View>
          <ProgressDots step={step} />
          <Text style={{ fontFamily: typography.family.regular, fontSize: typography.size.base, color: colors.textMuted }}>
            {stepSubtitles[step]}
          </Text>
        </View>

        <ScrollView
          ref={scrollRef}
          contentContainerStyle={{ padding: spacing.base, gap: spacing.lg, paddingBottom: spacing.xl }}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── STEP 0: Stats ── */}
          {step === 0 && (
            <>
              <Field label={t('intake.ageLabel')}>
                <TextInput
                  value={intake.age}
                  onChangeText={(v) => update({ age: v })}
                  keyboardType="number-pad"
                  placeholder={t('intake.agePlaceholder')}
                  placeholderTextColor={colors.textMuted}
                  style={inputStyle}
                  accessibilityLabel={t('intake.ageLabel')}
                />
              </Field>

              <Field label={t('intake.sexLabel')}>
                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
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
                  placeholderTextColor={colors.textMuted}
                  style={inputStyle}
                  accessibilityLabel={t('intake.goalWeightLabel')}
                />
              </Field>

              <Field label={t('intake.goalPaceLabel')}>
                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                  <Chip label={t('intake.goalPaceSteady')} selected={intake.goalPace === 'steady'} onPress={() => update({ goalPace: 'steady' })} />
                  <Chip label={t('intake.goalPaceFast')} selected={intake.goalPace === 'fast'} onPress={() => update({ goalPace: 'fast' })} />
                </View>
              </Field>
            </>
          )}

          {/* ── STEP 1: Lifestyle ── */}
          {step === 1 && (
            <>
              <Field label={t('intake.jobLabel')}>
                <TextInput
                  value={intake.jobType}
                  onChangeText={(v) => update({ jobType: v })}
                  placeholder={t('intake.jobPlaceholder')}
                  placeholderTextColor={colors.textMuted}
                  style={inputStyle}
                  accessibilityLabel={t('intake.jobLabel')}
                />
              </Field>

              <Field label={t('intake.exerciseLabel')}>
                <TextInput
                  value={intake.exerciseFrequency}
                  onChangeText={(v) => update({ exerciseFrequency: v })}
                  placeholder={t('intake.exercisePlaceholder')}
                  placeholderTextColor={colors.textMuted}
                  style={inputStyle}
                  accessibilityLabel={t('intake.exerciseLabel')}
                />
              </Field>

              <Field label={t('intake.sleepLabel')}>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                  {['5', '6', '7', '8', '9+'].map((h) => (
                    <Chip key={h} label={h} selected={intake.sleepHours === h} onPress={() => update({ sleepHours: h })} />
                  ))}
                </View>
              </Field>

              <Field label={t('intake.stressLabel')}>
                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
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
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
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

          {/* ── STEP 2: Food preferences ── */}
          {step === 2 && (
            <>
              <Field label={t('intake.favFoodsLabel', { count: intake.favoriteFoods.length })}>
                <View style={{ gap: spacing.sm }}>
                  {intake.favoriteFoods.map((f, i) => (
                    <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                      <View style={{ flex: 1, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.surface2 }}>
                        <Text style={{ fontFamily: typography.family.regular, fontSize: typography.size.body, color: colors.textPrimary }}>{f}</Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => update({ favoriteFoods: intake.favoriteFoods.filter((_, j) => j !== i) })}
                        accessibilityLabel={`${t('common.remove')} ${f}`}
                        accessibilityRole="button"
                      >
                        <Text style={{ fontFamily: typography.family.bold, fontSize: typography.size.title, color: colors.textMuted }}>×</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                  {intake.favoriteFoods.length < 5 && (
                    <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                      <TextInput
                        value={foodInput}
                        onChangeText={setFoodInput}
                        placeholder={t('intake.favFoodsPlaceholder')}
                        placeholderTextColor={colors.textMuted}
                        style={{ ...inputStyle, flex: 1 }}
                        onSubmitEditing={addFood}
                        returnKeyType="done"
                        accessibilityLabel={t('intake.favFoodsLabel', { count: intake.favoriteFoods.length })}
                      />
                      <TouchableOpacity
                        onPress={addFood}
                        style={{ backgroundColor: colors.primary, borderRadius: radius.md, paddingHorizontal: spacing.md, alignItems: 'center', justifyContent: 'center' }}
                        accessibilityLabel={t('common.add')} accessibilityRole="button"
                      >
                        <Text style={{ fontFamily: typography.family.bold, fontSize: typography.size.xl, color: tokenColors.white }}>+</Text>
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
                  placeholderTextColor={colors.textMuted}
                  style={inputStyle}
                  accessibilityLabel={t('intake.hatedFoodsLabel')}
                />
              </Field>

              <Field label={t('intake.restrictionsLabel')}>
                <TextInput
                  value={intake.dietaryRestrictions}
                  onChangeText={(v) => update({ dietaryRestrictions: v })}
                  placeholder={t('intake.restrictionsPlaceholder')}
                  placeholderTextColor={colors.textMuted}
                  style={inputStyle}
                  accessibilityLabel={t('intake.restrictionsLabel')}
                />
              </Field>

              <Field label={t('intake.cookingStyleLabel')}>
                <View style={{ gap: spacing.sm }}>
                  {([
                    { key: 'scratch', label: t('intake.cookingScratch'), desc: t('intake.cookingScratchDesc') },
                    { key: 'quick',   label: t('intake.cookingQuick'),   desc: t('intake.cookingQuickDesc') },
                    { key: 'batch',   label: t('intake.cookingBatch'),   desc: t('intake.cookingBatchDesc') },
                  ] as const).map((o) => (
                    <TouchableOpacity
                      key={o.key}
                      onPress={() => update({ cookingStyle: o.key })}
                      style={{
                        flexDirection: 'row', alignItems: 'center', gap: spacing.md,
                        padding: spacing.md, borderRadius: radius.md,
                        backgroundColor: intake.cookingStyle === o.key ? `${colors.primary}18` : colors.surface,
                        borderWidth: 1,
                        borderColor: intake.cookingStyle === o.key ? colors.primary : colors.surface2,
                      }}
                      accessibilityRole="button"
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontFamily: typography.family.semiBold, fontSize: typography.size.body, color: colors.textPrimary }}>{o.label}</Text>
                        <Text style={{ fontFamily: typography.family.regular, fontSize: typography.size.base, color: colors.textMuted }}>{o.desc}</Text>
                      </View>
                      {intake.cookingStyle === o.key && (
                        <Text style={{ color: colors.primary, fontFamily: typography.family.bold }}>✓</Text>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </Field>

              <Field label={t('intake.adventureLabel', { score: intake.foodAdventure })}>
                <View style={{ flexDirection: 'row', gap: spacing.xs }}>
                  {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                    <TouchableOpacity
                      key={n}
                      onPress={() => update({ foodAdventure: n })}
                      style={{
                        flex: 1, paddingVertical: spacing.sm, borderRadius: radius.sm,
                        backgroundColor: n <= intake.foodAdventure ? colors.primary : colors.surface2,
                        alignItems: 'center',
                      }}
                      accessibilityRole="button" accessibilityLabel={`${n}`}
                    >
                      <Text style={{ fontFamily: typography.family.bold, fontSize: typography.size.xs, color: n <= intake.foodAdventure ? tokenColors.white : colors.textMuted }}>
                        {n}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontFamily: typography.family.regular, fontSize: typography.size.xs, color: colors.textMuted }}>{t('intake.adventureMin')}</Text>
                  <Text style={{ fontFamily: typography.family.regular, fontSize: typography.size.xs, color: colors.textMuted }}>{t('intake.adventureMax')}</Text>
                </View>
              </Field>
            </>
          )}

          {/* ── STEP 3: Snack habits ── */}
          {step === 3 && (
            <>
              <Field label={t('intake.currentSnacksLabel')}>
                <TextInput
                  value={intake.currentSnacks}
                  onChangeText={(v) => update({ currentSnacks: v })}
                  placeholder={t('intake.currentSnacksPlaceholder')}
                  placeholderTextColor={colors.textMuted}
                  style={inputStyle}
                  accessibilityLabel={t('intake.currentSnacksLabel')}
                />
              </Field>

              <Field label={t('intake.snackReasonLabel')}>
                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
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
                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
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
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.surface2 }}>
                  <Text style={{ fontFamily: typography.family.regular, fontSize: typography.size.body, color: colors.textPrimary }}>
                    {intake.nightSnacking ? t('intake.nightSnackYes') : t('intake.nightSnackNo')}
                  </Text>
                  <Switch
                    value={intake.nightSnacking}
                    onValueChange={(v) => update({ nightSnacking: v })}
                    trackColor={{ true: colors.primary, false: colors.surface2 }}
                    thumbColor={tokenColors.white}
                    accessibilityLabel={t('intake.nightSnackLabel')}
                  />
                </View>
              </Field>

              {/* Summary before generating */}
              <View style={{ backgroundColor: `${colors.primary}10`, borderRadius: radius.lg, padding: spacing.base, borderWidth: 1, borderColor: `${colors.primary}30`, gap: spacing.xs }}>
                <Text style={{ fontFamily: typography.family.bold, fontSize: typography.size.body, color: colors.primary }}>
                  {t('intake.readyTitle')}
                </Text>
                <Text style={{ fontFamily: typography.family.regular, fontSize: typography.size.base, color: colors.textMuted }}>
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
