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
  const [step, setStep] = useState(0)
  const { intake, update } = useDietIntakeStore()
  const { data: user } = trpc.users.me.useQuery()
  const scrollRef = useRef<ScrollView>(null)

  // Pre-fill from user profile on mount
  React.useEffect(() => {
    if (user) {
      if (user.gender && !intake.sex) update({ sex: user.gender })
    }
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
      if (!intake.age || isNaN(Number(intake.age))) return 'Please enter your age.'
      if (!intake.sex) return 'Please select your sex.'
    }
    if (step === 1) {
      if (!intake.jobType.trim()) return 'Please describe your job type.'
      if (!intake.exerciseFrequency.trim()) return 'Please describe your exercise habits.'
    }
    if (step === 2) {
      if (intake.favoriteFoods.length === 0) return 'Add at least one favourite meal.'
    }
    return null
  }

  const handleNext = () => {
    const err = validateStep()
    if (err) { Alert.alert('Missing info', err); return }
    if (step < TOTAL_STEPS - 1) {
      setStep(step + 1)
      scrollRef.current?.scrollTo({ y: 0, animated: false })
    } else {
      handleGenerate()
    }
  }

  const handleGenerate = () => {
    router.push('/diet/generating' as any)
  }

  const stepTitles = [
    'Your stats',
    'Your lifestyle',
    'Your food preferences',
    'Your snack habits',
  ]

  const stepSubtitles = [
    "Tell me about yourself — I'll use this to nail your calories exactly.",
    "Your daily activity shapes your calorie target more than anything else.",
    "The secret to a plan you'll actually stick to is food you already love.",
    "Let's fix your snacks — they're often the hidden calories no one talks about.",
  ]

  // Favourite foods input helper
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
              accessibilityLabel="Go back" accessibilityRole="button"
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
              <Field label="Age">
                <TextInput
                  value={intake.age}
                  onChangeText={(v) => update({ age: v })}
                  keyboardType="number-pad"
                  placeholder="e.g. 28"
                  placeholderTextColor={colors.textMuted}
                  style={inputStyle}
                  accessibilityLabel="Age"
                />
              </Field>

              <Field label="Biological sex">
                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                  <Chip label="Male" selected={intake.sex === 'male'} onPress={() => update({ sex: 'male' })} />
                  <Chip label="Female" selected={intake.sex === 'female'} onPress={() => update({ sex: 'female' })} />
                </View>
              </Field>

              <Field label="Goal weight (kg) — optional">
                <TextInput
                  value={intake.goalWeight}
                  onChangeText={(v) => update({ goalWeight: v })}
                  keyboardType="decimal-pad"
                  placeholder="e.g. 75"
                  placeholderTextColor={colors.textMuted}
                  style={inputStyle}
                  accessibilityLabel="Goal weight"
                />
              </Field>

              <Field label="How quickly do you want to get there?">
                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                  <Chip label="Steady & sustainable" selected={intake.goalPace === 'steady'} onPress={() => update({ goalPace: 'steady' })} />
                  <Chip label="As fast as possible" selected={intake.goalPace === 'fast'} onPress={() => update({ goalPace: 'fast' })} />
                </View>
              </Field>
            </>
          )}

          {/* ── STEP 1: Lifestyle ── */}
          {step === 1 && (
            <>
              <Field label="What's your job like?">
                <TextInput
                  value={intake.jobType}
                  onChangeText={(v) => update({ jobType: v })}
                  placeholder="e.g. desk job, on my feet all day, manual labour..."
                  placeholderTextColor={colors.textMuted}
                  style={inputStyle}
                  accessibilityLabel="Job type"
                />
              </Field>

              <Field label="How often do you exercise, and what type?">
                <TextInput
                  value={intake.exerciseFrequency}
                  onChangeText={(v) => update({ exerciseFrequency: v })}
                  placeholder="e.g. 4x/week weight training + 1 run"
                  placeholderTextColor={colors.textMuted}
                  style={inputStyle}
                  accessibilityLabel="Exercise frequency"
                />
              </Field>

              <Field label="Hours of sleep per night">
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                  {['5', '6', '7', '8', '9+'].map((h) => (
                    <Chip key={h} label={h} selected={intake.sleepHours === h} onPress={() => update({ sleepHours: h })} />
                  ))}
                </View>
              </Field>

              <Field label="Current stress level">
                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                  {(['low', 'moderate', 'high'] as const).map((s) => (
                    <Chip key={s} label={s.charAt(0).toUpperCase() + s.slice(1)} selected={intake.stressLevel === s} onPress={() => update({ stressLevel: s })} />
                  ))}
                </View>
              </Field>

              <Field label="Alcohol per week">
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                  {['None', '1-2 drinks', '3-5 drinks', '6-10 drinks', '10+ drinks'].map((a) => (
                    <Chip key={a} label={a} selected={intake.alcoholPerWeek === a.toLowerCase()} onPress={() => update({ alcoholPerWeek: a.toLowerCase() })} />
                  ))}
                </View>
              </Field>
            </>
          )}

          {/* ── STEP 2: Food preferences ── */}
          {step === 2 && (
            <>
              <Field label={`Favourite meals or dishes (${intake.favoriteFoods.length}/5)`}>
                <View style={{ gap: spacing.sm }}>
                  {intake.favoriteFoods.map((f, i) => (
                    <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                      <View style={{ flex: 1, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.surface2 }}>
                        <Text style={{ fontFamily: typography.family.regular, fontSize: typography.size.body, color: colors.textPrimary }}>{f}</Text>
                      </View>
                      <TouchableOpacity onPress={() => update({ favoriteFoods: intake.favoriteFoods.filter((_, j) => j !== i) })} accessibilityLabel={`Remove ${f}`} accessibilityRole="button">
                        <Text style={{ fontFamily: typography.family.bold, fontSize: typography.size.title, color: colors.textMuted }}>×</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                  {intake.favoriteFoods.length < 5 && (
                    <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                      <TextInput
                        value={foodInput}
                        onChangeText={setFoodInput}
                        placeholder="e.g. Pasta carbonara, sushi..."
                        placeholderTextColor={colors.textMuted}
                        style={{ ...inputStyle, flex: 1 }}
                        onSubmitEditing={addFood}
                        returnKeyType="done"
                        accessibilityLabel="Add favourite food"
                      />
                      <TouchableOpacity
                        onPress={addFood}
                        style={{ backgroundColor: colors.primary, borderRadius: radius.md, paddingHorizontal: spacing.md, alignItems: 'center', justifyContent: 'center' }}
                        accessibilityLabel="Add food" accessibilityRole="button"
                      >
                        <Text style={{ fontFamily: typography.family.bold, fontSize: typography.size.xl, color: tokenColors.white }}>+</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </Field>

              <Field label="Foods you hate (optional)">
                <TextInput
                  value={intake.hatedFoods}
                  onChangeText={(v) => update({ hatedFoods: v })}
                  placeholder="e.g. Mushrooms, liver, blue cheese..."
                  placeholderTextColor={colors.textMuted}
                  style={inputStyle}
                  accessibilityLabel="Hated foods"
                />
              </Field>

              <Field label="Dietary restrictions or allergies (optional)">
                <TextInput
                  value={intake.dietaryRestrictions}
                  onChangeText={(v) => update({ dietaryRestrictions: v })}
                  placeholder="e.g. Vegetarian, lactose intolerant, nut allergy..."
                  placeholderTextColor={colors.textMuted}
                  style={inputStyle}
                  accessibilityLabel="Dietary restrictions"
                />
              </Field>

              <Field label="Cooking style">
                <View style={{ gap: spacing.sm }}>
                  {([
                    { key: 'scratch', label: 'From scratch', desc: 'I enjoy cooking proper meals' },
                    { key: 'quick', label: 'Quick & easy', desc: 'Under 30 minutes please' },
                    { key: 'batch', label: 'Batch prep', desc: 'Cook once, eat all week' },
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

              <Field label={`How adventurous with food? ${intake.foodAdventure}/10`}>
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
                      accessibilityRole="button" accessibilityLabel={`Food adventure ${n}`}
                    >
                      <Text style={{ fontFamily: typography.family.bold, fontSize: 9, color: n <= intake.foodAdventure ? tokenColors.white : colors.textMuted }}>
                        {n}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontFamily: typography.family.regular, fontSize: typography.size.xs, color: colors.textMuted }}>Stick to what I know</Text>
                  <Text style={{ fontFamily: typography.family.regular, fontSize: typography.size.xs, color: colors.textMuted }}>Try anything</Text>
                </View>
              </Field>
            </>
          )}

          {/* ── STEP 3: Snack habits ── */}
          {step === 3 && (
            <>
              <Field label="What do you typically snack on?">
                <TextInput
                  value={intake.currentSnacks}
                  onChangeText={(v) => update({ currentSnacks: v })}
                  placeholder="e.g. crisps, chocolate, biscuits, fruit..."
                  placeholderTextColor={colors.textMuted}
                  style={inputStyle}
                  accessibilityLabel="Current snacks"
                />
              </Field>

              <Field label="Why do you usually snack?">
                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                  {(['hunger', 'boredom', 'habit'] as const).map((r) => (
                    <Chip key={r} label={r.charAt(0).toUpperCase() + r.slice(1)} selected={intake.snackReason === r} onPress={() => update({ snackReason: r })} />
                  ))}
                </View>
              </Field>

              <Field label="Snack preference">
                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                  {(['sweet', 'savoury', 'both'] as const).map((p) => (
                    <Chip key={p} label={p.charAt(0).toUpperCase() + p.slice(1)} selected={intake.snackPreference === p} onPress={() => update({ snackPreference: p })} />
                  ))}
                </View>
              </Field>

              <Field label="Do you snack late at night?">
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.surface2 }}>
                  <Text style={{ fontFamily: typography.family.regular, fontSize: typography.size.body, color: colors.textPrimary }}>
                    {intake.nightSnacking ? 'Yes, sometimes' : 'No, I stop after dinner'}
                  </Text>
                  <Switch
                    value={intake.nightSnacking}
                    onValueChange={(v) => update({ nightSnacking: v })}
                    trackColor={{ true: colors.primary, false: colors.surface2 }}
                    thumbColor={tokenColors.white}
                    accessibilityLabel="Night snacking"
                  />
                </View>
              </Field>

              {/* Summary before generating */}
              <View style={{ backgroundColor: `${colors.primary}10`, borderRadius: radius.lg, padding: spacing.base, borderWidth: 1, borderColor: `${colors.primary}30`, gap: spacing.xs }}>
                <Text style={{ fontFamily: typography.family.bold, fontSize: typography.size.body, color: colors.primary }}>
                  ✨ Ready to generate your plan
                </Text>
                <Text style={{ fontFamily: typography.family.regular, fontSize: typography.size.base, color: colors.textMuted }}>
                  Claude will calculate your exact calories, build a 7-day meal plan around your favourite foods, and give you personalised rules to live by. This takes about 30–60 seconds.
                </Text>
              </View>
            </>
          )}

          <Button
            label={step < TOTAL_STEPS - 1 ? 'Continue →' : '✨ Generate my diet plan'}
            onPress={handleNext}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
