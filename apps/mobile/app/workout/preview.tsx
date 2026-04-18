import React, { useState, useMemo } from 'react'
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, useLocalSearchParams } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { useTheme } from '@/theme/ThemeContext'
import { trpc } from '@/lib/trpc'
import { useActiveSessionStore } from '@/stores/activeSessionStore'
import { colors as tokenColors } from '@/theme/tokens'
import { useExercises, translateMuscleGroup, translateDifficulty } from '@/hooks/useExercises'

type SetConfig = { reps: number; weight: number; restSeconds: number }

type ExtraExercise = {
  exerciseId: string
  exerciseName: string
  muscleGroups: string[]
}

const MUSCLE_GROUPS = ['All', 'Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Quadriceps', 'Hamstrings', 'Glutes', 'Calves', 'Core', 'Full Body']
const DEFAULT_SETS = 3
const DEFAULT_REPS = 10
const DEFAULT_REST = 90

function recommendedWeight(previousSets: { reps: number; weight: number }[], defaultWeight: number): number {
  if (previousSets.length > 0) {
    return previousSets.reduce((sum, s) => sum + s.weight, 0) / previousSets.length
  }
  return defaultWeight
}

function ExercisePicker({
  visible,
  onClose,
  onPick,
  alreadyAdded,
}: {
  visible: boolean
  onClose: () => void
  onPick: (ex: { id: string; name: string; muscleGroups: string[] }) => void
  alreadyAdded: string[]
}) {
  const { colors, typography, spacing, radius } = useTheme()
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  const [muscle, setMuscle] = useState('All')
  const { data: allExercises } = useExercises()

  const filtered = useMemo(() => {
    if (!allExercises) return []
    return allExercises.filter((ex) => {
      const matchSearch = ex.name.toLowerCase().includes(search.toLowerCase())
      const matchMuscle = muscle === 'All' || ex.muscleGroups.includes(muscle)
      return matchSearch && matchMuscle
    })
  }, [allExercises, search, muscle])

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: colors.background }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', padding: spacing.base, gap: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.surface2 }}>
          <TouchableOpacity onPress={onClose} accessibilityLabel="Close" accessibilityRole="button">
            <Text style={{ fontFamily: typography.family.bold, fontSize: typography.size.title, color: colors.primary }}>✕</Text>
          </TouchableOpacity>
          <Text style={{ fontFamily: typography.family.extraBold, fontSize: typography.size.xl, color: colors.textPrimary, flex: 1 }}>
            {t('workout.addExercise')}
          </Text>
        </View>

        {/* Search */}
        <View style={{ padding: spacing.base, paddingBottom: spacing.sm, gap: spacing.sm }}>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={t('workout.searchExercises')}
            placeholderTextColor={colors.textMuted}
            style={{
              backgroundColor: colors.surface,
              borderRadius: radius.md,
              padding: spacing.md,
              color: colors.textPrimary,
              fontFamily: typography.family.regular,
              fontSize: typography.size.body,
            }}
            accessibilityLabel="Search exercises"
            autoFocus
          />

          {/* Muscle filter */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              {MUSCLE_GROUPS.map((mg) => {
                const label = translateMuscleGroup(mg, t)
                return (
                  <TouchableOpacity
                    key={mg}
                    onPress={() => setMuscle(mg)}
                    style={{
                      paddingVertical: spacing.xs,
                      paddingHorizontal: spacing.md,
                      borderRadius: radius.pill,
                      backgroundColor: muscle === mg ? colors.primary : colors.surface2,
                    }}
                    accessibilityLabel={label}
                    accessibilityRole="button"
                  >
                    <Text style={{
                      fontFamily: muscle === mg ? typography.family.semiBold : typography.family.regular,
                      fontSize: typography.size.base,
                      color: muscle === mg ? tokenColors.white : colors.textMuted,
                    }}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          </ScrollView>
        </View>

        {/* Results */}
        <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.base, gap: spacing.sm, paddingBottom: spacing.xl }}>
          {filtered.map((ex) => {
            const added = alreadyAdded.includes(ex.id)
            return (
              <TouchableOpacity
                key={ex.id}
                onPress={() => {
                  if (!added) onPick({ id: ex.id, name: ex.name, muscleGroups: ex.muscleGroups })
                }}
                disabled={added}
                style={{
                  backgroundColor: colors.surface,
                  borderRadius: radius.md,
                  padding: spacing.base,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  opacity: added ? 0.4 : 1,
                }}
                accessibilityLabel={`${added ? 'Already added' : 'Add'} ${ex.name}`}
                accessibilityRole="button"
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: typography.family.semiBold, fontSize: typography.size.body, color: colors.textPrimary }}>
                    {ex.name}
                  </Text>
                  <Text style={{ fontFamily: typography.family.regular, fontSize: typography.size.base, color: colors.textMuted }}>
                    {ex.muscleGroups.map((mg) => translateMuscleGroup(mg, t)).join(' · ')} · {translateDifficulty(ex.difficulty, t)}
                  </Text>
                </View>
                <Text style={{ fontFamily: typography.family.bold, fontSize: typography.size.xl, color: added ? colors.textMuted : colors.primary }}>
                  {added ? '✓' : '+'}
                </Text>
              </TouchableOpacity>
            )
          })}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  )
}

export default function WorkoutPreviewScreen() {
  const { templateId } = useLocalSearchParams<{ templateId: string }>()
  const { colors, typography, spacing, radius } = useTheme()
  const { t } = useTranslation()
  const { data: workout, isLoading } = trpc.workouts.detail.useQuery(
    { id: templateId ?? '' },
    { enabled: !!templateId },
  )

  const [setsConfig, setSetsConfig] = useState<Record<string, SetConfig[]>>({})
  const [extraExercises, setExtraExercises] = useState<ExtraExercise[]>([])
  const [pickerVisible, setPickerVisible] = useState(false)

  React.useEffect(() => {
    if (!workout) return
    const init: Record<string, SetConfig[]> = {}
    for (const ex of workout.exercises) {
      if (!setsConfig[ex.exerciseId]) {
        init[ex.exerciseId] = Array.from({ length: ex.defaultSets }, (_, i) => ({
          reps: ex.previousSets[i]?.reps ?? ex.defaultReps,
          weight: ex.previousSets[i]?.weight ?? ex.defaultWeight,
          restSeconds: ex.defaultRestSeconds,
        }))
      }
    }
    if (Object.keys(init).length > 0) setSetsConfig((prev) => ({ ...prev, ...init }))
  }, [workout?.id])

  const startSession = useActiveSessionStore((s) => s.startSession)

  const allExerciseIds = useMemo(() => {
    const fromTemplate = workout?.exercises.map((e) => e.exerciseId) ?? []
    const fromExtra = extraExercises.map((e) => e.exerciseId)
    return [...fromTemplate, ...fromExtra]
  }, [workout, extraExercises])

  const handlePickExercise = (ex: { id: string; name: string; muscleGroups: string[] }) => {
    setExtraExercises((prev) => [...prev, { exerciseId: ex.id, exerciseName: ex.name, muscleGroups: ex.muscleGroups }])
    setSetsConfig((prev) => ({
      ...prev,
      [ex.id]: Array.from({ length: DEFAULT_SETS }, () => ({ reps: DEFAULT_REPS, weight: 0, restSeconds: DEFAULT_REST })),
    }))
    setPickerVisible(false)
  }

  const removeExtraExercise = (exerciseId: string) => {
    setExtraExercises((prev) => prev.filter((e) => e.exerciseId !== exerciseId))
    setSetsConfig((prev) => {
      const next = { ...prev }
      delete next[exerciseId]
      return next
    })
  }

  const handleStart = () => {
    if (!workout) return
    const withCompleted = (sets: SetConfig[]) => sets.map((s) => ({ ...s, isCompleted: false }))
    const templateExercises = workout.exercises.map((ex) => ({
      exerciseId: ex.exerciseId,
      exerciseName: ex.exerciseName,
      defaultSets: ex.defaultSets,
      defaultReps: ex.defaultReps,
      defaultWeight: ex.defaultWeight,
      defaultRestSeconds: ex.defaultRestSeconds,
      lastWeight: ex.previousSets[0]?.weight,
      lastReps: ex.previousSets[0]?.reps,
      sets: withCompleted(setsConfig[ex.exerciseId] ?? []),
    }))
    const additionalExercises = extraExercises.map((ex) => ({
      exerciseId: ex.exerciseId,
      exerciseName: ex.exerciseName,
      defaultSets: DEFAULT_SETS,
      defaultReps: DEFAULT_REPS,
      defaultWeight: 0,
      defaultRestSeconds: DEFAULT_REST,
      sets: withCompleted(setsConfig[ex.exerciseId] ?? []),
    }))
    startSession({ id: workout.id, name: workout.name }, [...templateExercises, ...additionalExercises])
    router.push('/workout/active')
  }

  const updateSet = (exerciseId: string, setIdx: number, field: keyof SetConfig, value: number) => {
    setSetsConfig((prev) => {
      const exerciseSets = [...(prev[exerciseId] ?? [])]
      exerciseSets[setIdx] = { ...exerciseSets[setIdx]!, [field]: value }
      return { ...prev, [exerciseId]: exerciseSets }
    })
  }

  const addSet = (exerciseId: string, defaultSet: SetConfig) => {
    setSetsConfig((prev) => {
      const s = [...(prev[exerciseId] ?? [])]
      s.push({ ...defaultSet })
      return { ...prev, [exerciseId]: s }
    })
  }

  const removeSet = (exerciseId: string) => {
    setSetsConfig((prev) => {
      const s = [...(prev[exerciseId] ?? [])]
      if (s.length <= 1) return prev
      s.pop()
      return { ...prev, [exerciseId]: s }
    })
  }

  if (isLoading || !workout) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.primary} size="large" />
      </SafeAreaView>
    )
  }

  const totalExercises = workout.exercises.length + extraExercises.length

  // Unified render for an exercise block
  const renderExerciseBlock = (
    exerciseId: string,
    exerciseName: string,
    muscleGroups: string[],
    exIdx: number,
    opts: {
      defaultReps: number
      defaultWeight: number
      defaultRestSeconds: number
      previousSets: { reps: number; weight: number }[]
      removable: boolean
    },
  ) => {
    const sets = setsConfig[exerciseId] ?? []
    const recWeight = recommendedWeight(opts.previousSets, opts.defaultWeight)
    const hasPrev = opts.previousSets.length > 0

    return (
      <View key={exerciseId} style={{ gap: spacing.sm }}>
        {/* Exercise header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontFamily: typography.family.bold, fontSize: typography.size.base, color: tokenColors.white }}>{exIdx + 1}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: typography.family.bold, fontSize: typography.size.title, color: colors.textPrimary }}>
              {exerciseName}
            </Text>
            <Text style={{ fontFamily: typography.family.regular, fontSize: typography.size.base, color: colors.textMuted }}>
              {muscleGroups.join(' · ')}{hasPrev ? `  ·  prev: ${opts.previousSets[0]?.weight ?? 0}kg` : ''}
            </Text>
          </View>
          {opts.removable && (
            <TouchableOpacity
              onPress={() => removeExtraExercise(exerciseId)}
              style={{ padding: spacing.xs }}
              accessibilityLabel={`Remove ${exerciseName}`}
              accessibilityRole="button"
            >
              <Text style={{ fontFamily: typography.family.bold, fontSize: typography.size.xl, color: colors.danger }}>×</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Column headers */}
        <View style={{ flexDirection: 'row', paddingHorizontal: spacing.xs, gap: spacing.sm }}>
          <Text style={{ width: 28, fontFamily: typography.family.semiBold, fontSize: typography.size.xs, color: colors.textMuted, textAlign: 'center' }}>#</Text>
          <Text style={{ flex: 1, fontFamily: typography.family.semiBold, fontSize: typography.size.xs, color: colors.textMuted, textAlign: 'center' }}>{t('workout.columnReps')}</Text>
          <Text style={{ flex: 1, fontFamily: typography.family.semiBold, fontSize: typography.size.xs, color: colors.textMuted, textAlign: 'center' }}>
            {t('workout.columnKg')}{hasPrev ? ` (${t('workout.prevLabel')} ${recWeight}kg)` : recWeight > 0 ? ` (${t('workout.recLabel')} ${recWeight}kg)` : ''}
          </Text>
          <Text style={{ width: 56, fontFamily: typography.family.semiBold, fontSize: typography.size.xs, color: colors.textMuted, textAlign: 'center' }}>{t('workout.columnRest')}</Text>
        </View>

        {/* Set rows */}
        {sets.map((s, idx) => (
          <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.sm, paddingHorizontal: spacing.xs }}>
            <Text style={{ width: 28, fontFamily: typography.family.bold, fontSize: typography.size.base, color: colors.textMuted, textAlign: 'center' }}>{idx + 1}</Text>
            <TextInput
              value={s.reps > 0 ? String(s.reps) : ''}
              onChangeText={(v) => updateSet(exerciseId, idx, 'reps', parseInt(v) || 0)}
              keyboardType="number-pad"
              placeholder={String(opts.defaultReps)}
              placeholderTextColor={colors.textMuted}
              style={{ flex: 1, backgroundColor: colors.background, borderRadius: radius.sm, padding: spacing.xs, color: colors.textPrimary, fontFamily: typography.family.semiBold, fontSize: typography.size.body, textAlign: 'center' }}
              accessibilityLabel={`Exercise ${exIdx + 1} set ${idx + 1} reps`}
            />
            <TextInput
              value={s.weight > 0 ? String(s.weight) : ''}
              onChangeText={(v) => updateSet(exerciseId, idx, 'weight', parseFloat(v) || 0)}
              keyboardType="decimal-pad"
              placeholder={recWeight > 0 ? String(recWeight) : '0'}
              placeholderTextColor={colors.textMuted}
              style={{ flex: 1, backgroundColor: colors.background, borderRadius: radius.sm, padding: spacing.xs, color: colors.textPrimary, fontFamily: typography.family.semiBold, fontSize: typography.size.body, textAlign: 'center' }}
              accessibilityLabel={`Exercise ${exIdx + 1} set ${idx + 1} weight`}
            />
            <View style={{ width: 56, flexDirection: 'row', alignItems: 'center', gap: 2 }}>
              <TextInput
                value={String(s.restSeconds)}
                onChangeText={(v) => updateSet(exerciseId, idx, 'restSeconds', parseInt(v) || 60)}
                keyboardType="number-pad"
                style={{ flex: 1, backgroundColor: colors.background, borderRadius: radius.sm, padding: spacing.xs, color: colors.textPrimary, fontFamily: typography.family.semiBold, fontSize: typography.size.xs, textAlign: 'center' }}
                accessibilityLabel={`Exercise ${exIdx + 1} set ${idx + 1} rest seconds`}
              />
              <Text style={{ fontFamily: typography.family.regular, fontSize: typography.size.xs, color: colors.textMuted }}>s</Text>
            </View>
          </View>
        ))}

        {/* Add / remove set */}
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <TouchableOpacity
            onPress={() => addSet(exerciseId, sets[sets.length - 1] ?? { reps: opts.defaultReps, weight: recWeight, restSeconds: opts.defaultRestSeconds })}
            style={{ flex: 1, alignItems: 'center', paddingVertical: spacing.xs, borderRadius: radius.md, borderWidth: 1, borderColor: colors.primary }}
            accessibilityLabel="Add set" accessibilityRole="button"
          >
            <Text style={{ fontFamily: typography.family.semiBold, fontSize: typography.size.base, color: colors.primary }}>{t('workout.addSet')}</Text>
          </TouchableOpacity>
          {sets.length > 1 && (
            <TouchableOpacity
              onPress={() => removeSet(exerciseId)}
              style={{ paddingHorizontal: spacing.md, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, borderWidth: 1, borderColor: colors.surface2 }}
              accessibilityLabel="Remove last set" accessibilityRole="button"
            >
              <Text style={{ fontFamily: typography.family.semiBold, fontSize: typography.size.base, color: colors.textMuted }}>{t('workout.removeSet')}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    )
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={{ padding: spacing.base, paddingBottom: 0, flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <TouchableOpacity onPress={() => router.back()} accessibilityLabel="Go back" accessibilityRole="button">
          <Text style={{ fontFamily: typography.family.bold, fontSize: typography.size.title, color: colors.primary }}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: typography.family.extraBold, fontSize: typography.size['2xl'], color: colors.textPrimary }}>
            {workout.name}
          </Text>
          <Text style={{ fontFamily: typography.family.regular, fontSize: typography.size.base, color: colors.textMuted }}>
            {totalExercises} exercises · ~{workout.estimatedDuration} min
          </Text>
        </View>
      </View>

      {/* Big START button */}
      <View style={{ padding: spacing.base, paddingTop: spacing.md }}>
        <TouchableOpacity
          onPress={handleStart}
          style={{ backgroundColor: colors.primary, borderRadius: radius.lg, paddingVertical: spacing.lg, alignItems: 'center' }}
          accessibilityLabel="Start workout" accessibilityRole="button"
        >
          <Text style={{ fontFamily: typography.family.extraBold, fontSize: typography.size['2xl'], color: tokenColors.white, letterSpacing: 2 }}>
            {t('workout.start')}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.base, gap: spacing.xl }}>
        {/* Template exercises */}
        {workout.exercises.map((ex, idx) =>
          renderExerciseBlock(ex.exerciseId, ex.exerciseName, ex.muscleGroups, idx, {
            defaultReps: ex.defaultReps,
            defaultWeight: ex.defaultWeight,
            defaultRestSeconds: ex.defaultRestSeconds,
            previousSets: ex.previousSets,
            removable: false,
          }),
        )}

        {/* Extra exercises added by user */}
        {extraExercises.map((ex, idx) =>
          renderExerciseBlock(ex.exerciseId, ex.exerciseName, ex.muscleGroups, workout.exercises.length + idx, {
            defaultReps: DEFAULT_REPS,
            defaultWeight: 0,
            defaultRestSeconds: DEFAULT_REST,
            previousSets: [],
            removable: true,
          }),
        )}

        {/* Add exercise button */}
        <TouchableOpacity
          onPress={() => setPickerVisible(true)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: spacing.sm,
            paddingVertical: spacing.base,
            borderRadius: radius.lg,
            borderWidth: 2,
            borderStyle: 'dashed',
            borderColor: colors.primary,
          }}
          accessibilityLabel={t('workout.addExercise')} accessibilityRole="button"
        >
          <Text style={{ fontFamily: typography.family.extraBold, fontSize: typography.size.xl, color: colors.primary }}>+</Text>
          <Text style={{ fontFamily: typography.family.bold, fontSize: typography.size.body, color: colors.primary }}>{t('workout.addExercise')}</Text>
        </TouchableOpacity>

        <View style={{ height: spacing.xl }} />
      </ScrollView>

      <ExercisePicker
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        onPick={handlePickExercise}
        alreadyAdded={allExerciseIds}
      />
    </SafeAreaView>
  )
}
