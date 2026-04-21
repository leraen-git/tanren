import React, { useState, useMemo } from 'react'
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Image,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, useLocalSearchParams } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { useTheme } from '@/theme/ThemeContext'
import { trpc } from '@/lib/trpc'
import { useActiveSessionStore } from '@/stores/activeSessionStore'
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
  const { tokens, fonts } = useTheme()
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
      <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: tokens.bg }}>
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          padding: 16,
          gap: 12,
          borderBottomWidth: 1,
          borderBottomColor: tokens.border,
        }}>
          <TouchableOpacity onPress={onClose} accessibilityLabel={t('common.close')} accessibilityRole="button">
            <Text style={{ fontFamily: fonts.sansB, fontSize: 32, color: tokens.accent }}>X</Text>
          </TouchableOpacity>
          <Text numberOfLines={1} style={{
            fontFamily: fonts.sansX,
            fontSize: 32,
            color: tokens.text,
            flex: 1,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
          }}>
            {t('workout.addExercise')}
          </Text>
        </View>

        <View style={{ padding: 16, paddingBottom: 8, gap: 8 }}>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={t('workout.searchExercises')}
            placeholderTextColor={tokens.textGhost}
            style={{
              borderBottomWidth: 1,
              borderBottomColor: tokens.border,
              paddingVertical: 12,
              color: tokens.text,
              fontFamily: fonts.sans,
              fontSize: 14,
            }}
            accessibilityLabel={t('workout.searchExercises')}
            autoFocus
          />

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {MUSCLE_GROUPS.map((mg) => {
                const label = translateMuscleGroup(mg, t)
                const active = muscle === mg
                return (
                  <TouchableOpacity
                    key={mg}
                    onPress={() => setMuscle(mg)}
                    style={{
                      paddingVertical: 4,
                      paddingHorizontal: 12,
                      backgroundColor: active ? tokens.accent : 'transparent',
                      borderWidth: 1,
                      borderColor: active ? tokens.accent : tokens.borderStrong,
                    }}
                    accessibilityLabel={label}
                    accessibilityRole="button"
                  >
                    <Text style={{
                      fontFamily: fonts.sansB,
                      fontSize: 10,
                      letterSpacing: 1.4,
                      textTransform: 'uppercase',
                      color: active ? '#FFFFFF' : tokens.textMute,
                    }}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          </ScrollView>
        </View>

        <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}>
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
                  paddingVertical: 12,
                  borderBottomWidth: 1,
                  borderBottomColor: tokens.border,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  opacity: added ? 0.4 : 1,
                }}
                accessibilityLabel={`${added ? 'Already added' : 'Add'} ${ex.name}`}
                accessibilityRole="button"
              >
                {ex.imageUrl && (
                  <Image
                    source={{ uri: ex.imageUrl }}
                    style={{ width: 48, height: 48, marginRight: 12 }}
                    resizeMode="cover"
                  />
                )}
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: fonts.sansM, fontSize: 14, color: tokens.text }}>
                    {ex.name}
                  </Text>
                  <Text style={{ fontFamily: fonts.sans, fontSize: 12, color: tokens.textMute }}>
                    {ex.muscleGroups.map((mg) => translateMuscleGroup(mg, t)).join(' · ')} · {translateDifficulty(ex.difficulty, t)}
                  </Text>
                </View>
                <Text style={{ fontFamily: fonts.sansB, fontSize: 20, color: added ? tokens.textMute : tokens.accent }}>
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
            {'‹ '}{t('common.back')}
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
          {totalExercises} {t('common.exercises')} · ~{workout.estimatedDuration} min
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
        onClose={() => setPickerVisible(false)}
        onPick={handlePickExercise}
        alreadyAdded={allExerciseIds}
      />
    </SafeAreaView>
  )
}
