import React, { useState, useMemo } from 'react'
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, useLocalSearchParams } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { useTheme } from '@/theme/ThemeContext'
import { trpc } from '@/lib/trpc'
import { useActiveSessionStore } from '@/stores/activeSessionStore'
import { translateMuscleGroup } from '@/hooks/useExercises'
import { ExercisePicker } from '@/components/ExercisePicker'
import { TapValueCell } from '@/components/TapValueCell'
import { TapTimerCell } from '@/components/TapTimerCell'

type SetConfig = { reps: number; weight: number; restSeconds: number }

type ExtraExercise = {
  exerciseId: string
  exerciseName: string
  muscleGroups: string[]
}

const DEFAULT_SETS = 3
const DEFAULT_REPS = 10
const DEFAULT_REST = 90

function recommendedWeight(previousSets: { reps: number; weight: number }[], defaultWeight: number): number {
  if (previousSets.length > 0) {
    return previousSets.reduce((sum, s) => sum + s.weight, 0) / previousSets.length
  }
  return defaultWeight
}

export default function WorkoutPreviewScreen() {
  const { templateId } = useLocalSearchParams<{ templateId: string }>()
  const { tokens, fonts } = useTheme()
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

  const handlePickExercises = (picked: { id: string; name: string; muscleGroups: string[] }[]) => {
    for (const ex of picked) {
      if (!allExerciseIds.includes(ex.id)) {
        setExtraExercises((prev) => [...prev, { exerciseId: ex.id, exerciseName: ex.name, muscleGroups: ex.muscleGroups }])
        setSetsConfig((prev) => ({
          ...prev,
          [ex.id]: Array.from({ length: DEFAULT_SETS }, () => ({ reps: DEFAULT_REPS, weight: 0, restSeconds: DEFAULT_REST })),
        }))
      }
    }
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
      prWeight: ex.prWeight ?? undefined,
      prReps: ex.prReps ?? undefined,
      previousVolume: ex.previousSets.length > 0
        ? ex.previousSets.reduce((sum: number, s: { reps: number; weight: number }) => sum + s.reps * s.weight, 0)
        : undefined,
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
      <SafeAreaView style={{ flex: 1, backgroundColor: tokens.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={tokens.accent} size="large" />
      </SafeAreaView>
    )
  }

  const totalExercises = workout.exercises.length + extraExercises.length

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
      <View key={exerciseId} style={{ gap: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{
            width: 28,
            height: 28,
            backgroundColor: tokens.accent,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Text style={{ fontFamily: fonts.sansB, fontSize: 12, color: '#FFFFFF' }}>{exIdx + 1}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: fonts.sansB, fontSize: 32, color: tokens.text, textTransform: 'uppercase', letterSpacing: 0.3 }}>
              {exerciseName}
            </Text>
            <Text style={{ fontFamily: fonts.sans, fontSize: 12, color: tokens.textMute }}>
              {muscleGroups.map((mg) => translateMuscleGroup(mg, t)).join(' · ')}{hasPrev ? `  ·  prev: ${opts.previousSets[0]?.weight ?? 0}kg` : ''}
            </Text>
          </View>
          {opts.removable && (
            <TouchableOpacity
              onPress={() => removeExtraExercise(exerciseId)}
              style={{ padding: 4 }}
              accessibilityLabel={`Remove ${exerciseName}`}
              accessibilityRole="button"
            >
              <Text style={{ fontFamily: fonts.sansB, fontSize: 20, color: tokens.accent }}>X</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Column headers */}
        <View style={{ flexDirection: 'row', paddingHorizontal: 4, gap: 8 }}>
          <Text style={{ width: 28, fontFamily: fonts.sansB, fontSize: 9, letterSpacing: 1, color: tokens.textGhost, textAlign: 'center' }}>#</Text>
          <Text style={{ flex: 1, fontFamily: fonts.sansB, fontSize: 9, letterSpacing: 1, color: tokens.textGhost, textAlign: 'center', textTransform: 'uppercase' }}>{t('workout.columnReps')}</Text>
          <Text style={{ flex: 1, fontFamily: fonts.sansB, fontSize: 9, letterSpacing: 1, color: tokens.textGhost, textAlign: 'center', textTransform: 'uppercase' }}>
            {t('workout.columnKg')}{hasPrev ? ` (prev ${recWeight})` : recWeight > 0 ? ` (rec ${recWeight})` : ''}
          </Text>
          <Text style={{ width: 56, fontFamily: fonts.sansB, fontSize: 9, letterSpacing: 1, color: tokens.textGhost, textAlign: 'center', textTransform: 'uppercase' }}>{t('workout.columnRest')}</Text>
        </View>

        {/* Set rows */}
        {sets.map((s, idx) => (
          <View key={idx} style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            borderWidth: 1,
            borderColor: tokens.border,
            padding: 8,
            paddingHorizontal: 4,
          }}>
            <Text style={{ width: 28, fontFamily: fonts.sansB, fontSize: 12, color: tokens.textMute, textAlign: 'center' }}>{idx + 1}</Text>
            <TextInput
              value={s.reps > 0 ? String(s.reps) : ''}
              onChangeText={(v) => updateSet(exerciseId, idx, 'reps', parseInt(v) || 0)}
              keyboardType="number-pad"
              placeholder={String(opts.defaultReps)}
              placeholderTextColor={tokens.textGhost}
              style={{
                flex: 1,
                borderBottomWidth: 1,
                borderBottomColor: tokens.border,
                paddingVertical: 4,
                color: tokens.text,
                fontFamily: fonts.monoB,
                fontSize: 14,
                textAlign: 'center',
              }}
              accessibilityLabel={`Exercise ${exIdx + 1} set ${idx + 1} reps`}
            />
            <TextInput
              value={s.weight > 0 ? String(s.weight) : ''}
              onChangeText={(v) => updateSet(exerciseId, idx, 'weight', parseFloat(v) || 0)}
              keyboardType="decimal-pad"
              placeholder={recWeight > 0 ? String(recWeight) : '0'}
              placeholderTextColor={tokens.textGhost}
              style={{
                flex: 1,
                borderBottomWidth: 1,
                borderBottomColor: tokens.border,
                paddingVertical: 4,
                color: tokens.text,
                fontFamily: fonts.monoB,
                fontSize: 14,
                textAlign: 'center',
              }}
              accessibilityLabel={`Exercise ${exIdx + 1} set ${idx + 1} weight`}
            />
            <View style={{ width: 56, flexDirection: 'row', alignItems: 'center', gap: 2 }}>
              <TextInput
                value={String(s.restSeconds)}
                onChangeText={(v) => updateSet(exerciseId, idx, 'restSeconds', parseInt(v) || 60)}
                keyboardType="number-pad"
                style={{
                  flex: 1,
                  borderBottomWidth: 1,
                  borderBottomColor: tokens.border,
                  paddingVertical: 4,
                  color: tokens.text,
                  fontFamily: fonts.mono,
                  fontSize: 10,
                  textAlign: 'center',
                }}
                accessibilityLabel={`Exercise ${exIdx + 1} set ${idx + 1} rest seconds`}
              />
              <Text style={{ fontFamily: fonts.sans, fontSize: 10, color: tokens.textGhost }}>s</Text>
            </View>
          </View>
        ))}

        {/* Add / remove set */}
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity
            onPress={() => addSet(exerciseId, sets[sets.length - 1] ?? { reps: opts.defaultReps, weight: recWeight, restSeconds: opts.defaultRestSeconds })}
            style={{
              flex: 1,
              alignItems: 'center',
              paddingVertical: 4,
              borderWidth: 1,
              borderColor: tokens.accent,
            }}
            accessibilityLabel={t('workout.addSet')}
            accessibilityRole="button"
          >
            <Text style={{ fontFamily: fonts.sansB, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: tokens.accent }}>{t('workout.addSet')}</Text>
          </TouchableOpacity>
          {sets.length > 1 && (
            <TouchableOpacity
              onPress={() => removeSet(exerciseId)}
              style={{
                paddingHorizontal: 12,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: tokens.borderStrong,
              }}
              accessibilityLabel={t('workout.removeSet')}
              accessibilityRole="button"
            >
              <Text style={{ fontFamily: fonts.sansB, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: tokens.textMute }}>{t('workout.removeSet')}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    )
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: tokens.bg }}>
      {/* Header */}
      <View style={{ padding: 16, paddingBottom: 0, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <TouchableOpacity onPress={() => router.back()} accessibilityLabel={t('common.back')} accessibilityRole="button">
          <Text style={{ fontFamily: fonts.sansM, fontSize: 12, color: tokens.textMute, textTransform: 'uppercase', letterSpacing: 1 }}>
            {'< '}{t('common.back').toUpperCase()}
          </Text>
        </TouchableOpacity>
      </View>
      <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
        <Text style={{
          fontFamily: fonts.sansX,
          fontSize: 24,
          color: tokens.text,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        }}>
          {workout.name}
        </Text>
        <Text style={{ fontFamily: fonts.sans, fontSize: 12, color: tokens.textMute, marginTop: 2 }}>
          {totalExercises} {t('common.exercises')} · ~{workout.estimatedDuration} {t('common.min')}
        </Text>
      </View>

      {/* START button */}
      <View style={{ padding: 16, paddingTop: 12 }}>
        <TouchableOpacity
          onPress={handleStart}
          style={{
            backgroundColor: tokens.accent,
            paddingVertical: 16,
            alignItems: 'center',
          }}
          accessibilityLabel={t('workout.start')}
          accessibilityRole="button"
        >
          <Text style={{
            fontFamily: fonts.sansX,
            fontSize: 24,
            color: '#FFFFFF',
            letterSpacing: 2,
            textTransform: 'uppercase',
          }}>
            {t('workout.start')}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 20 }}>
        {workout.exercises.map((ex, idx) =>
          renderExerciseBlock(ex.exerciseId, ex.exerciseName, ex.muscleGroups, idx, {
            defaultReps: ex.defaultReps,
            defaultWeight: ex.defaultWeight,
            defaultRestSeconds: ex.defaultRestSeconds,
            previousSets: ex.previousSets,
            removable: false,
          }),
        )}

        {extraExercises.map((ex, idx) =>
          renderExerciseBlock(ex.exerciseId, ex.exerciseName, ex.muscleGroups, workout.exercises.length + idx, {
            defaultReps: DEFAULT_REPS,
            defaultWeight: 0,
            defaultRestSeconds: DEFAULT_REST,
            previousSets: [],
            removable: true,
          }),
        )}

        {/* Add exercise */}
        <TouchableOpacity
          onPress={() => setPickerVisible(true)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            paddingVertical: 16,
            borderWidth: 1,
            borderStyle: 'dashed',
            borderColor: tokens.accent,
          }}
          accessibilityLabel={t('workout.addExercise')}
          accessibilityRole="button"
        >
          <Text style={{ fontFamily: fonts.sansX, fontSize: 20, color: tokens.accent }}>+</Text>
          <Text style={{ fontFamily: fonts.sansB, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', color: tokens.accent }}>{t('workout.addExercise')}</Text>
        </TouchableOpacity>

        <View style={{ height: 20 }} />
      </ScrollView>

      <ExercisePicker
        visible={pickerVisible}
        mode="single"
        onClose={() => setPickerVisible(false)}
        onConfirm={handlePickExercises}
        excludeIds={allExerciseIds}
      />
    </SafeAreaView>
  )
}
