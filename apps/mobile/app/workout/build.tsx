import React, { useState, useMemo, useEffect } from 'react'
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Modal,
  Alert,
  Image,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useTheme } from '@/theme/ThemeContext'
import { trpc } from '@/lib/trpc'
import { usePendingWorkoutStore } from '@/stores/pendingWorkoutStore'
import { useTranslation } from 'react-i18next'
import { useExercises, translateMuscleGroup, translateDifficulty } from '@/hooks/useExercises'

const MUSCLE_GROUPS = ['Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Quadriceps', 'Hamstrings', 'Glutes', 'Calves', 'Core', 'Full Body', 'Cardio']
const DURATIONS = [30, 45, 60, 75, 90]

type ExerciseEntry = {
  exerciseId: string
  exerciseName: string
  muscleGroups: string[]
  sets: number
  reps: number
  weight: number
  restSeconds: number
}

type PickedExercise = { id: string; name: string; muscleGroups: string[] }

function ExercisePicker({
  visible,
  onClose,
  onConfirm,
  alreadyAdded,
  preselectedMuscles,
}: {
  visible: boolean
  onClose: () => void
  onConfirm: (exercises: PickedExercise[]) => void
  alreadyAdded: string[]
  preselectedMuscles: string[]
}) {
  const { tokens, fonts } = useTheme()
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  const [activeFilters, setActiveFilters] = useState<string[]>([])
  const [selected, setSelected] = useState<PickedExercise[]>([])
  const { data: allExercises } = useExercises()

  useEffect(() => {
    if (visible) {
      setSelected([])
      setSearch('')
      setActiveFilters(preselectedMuscles.length > 0 ? [...preselectedMuscles] : [])
    }
  }, [visible])

  const orderedMuscles = useMemo(() => {
    const rest = MUSCLE_GROUPS.filter((m) => !preselectedMuscles.includes(m))
    return [...preselectedMuscles, ...rest]
  }, [preselectedMuscles])

  const filtered = useMemo(() => {
    if (!allExercises) return []
    return allExercises.filter((ex) => {
      const matchSearch = ex.name.toLowerCase().includes(search.toLowerCase())
      const matchMuscle = activeFilters.length === 0 || ex.muscleGroups.some((mg) => activeFilters.includes(mg))
      return matchSearch && matchMuscle
    })
  }, [allExercises, search, activeFilters])

  const toggleFilter = (mg: string) => {
    setActiveFilters((prev) =>
      prev.includes(mg) ? prev.filter((f) => f !== mg) : [...prev, mg],
    )
  }

  const toggleSelect = (ex: PickedExercise) => {
    setSelected((prev) => {
      const exists = prev.some((e) => e.id === ex.id)
      return exists ? prev.filter((e) => e.id !== ex.id) : [...prev, ex]
    })
  }

  const isSelected = (id: string) => selected.some((e) => e.id === id)

  const handleConfirm = () => {
    onConfirm(selected)
    setSelected([])
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: tokens.bg }}>
        {/* Header */}
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          padding: 16,
          gap: 12,
          borderBottomWidth: 1,
          borderBottomColor: tokens.border,
        }}>
          <TouchableOpacity onPress={onClose} accessibilityLabel="Close" accessibilityRole="button">
            <Text style={{ fontFamily: fonts.sansB, fontSize: 10, color: tokens.accent, textTransform: 'uppercase', letterSpacing: 2 }}>CLOSE</Text>
          </TouchableOpacity>
          <Text numberOfLines={1} style={{ fontFamily: fonts.sansX, fontSize: 17, color: tokens.text, textTransform: 'uppercase', flex: 1 }}>
            {t('workout.addExercises')}
          </Text>
          {selected.length > 0 && (
            <TouchableOpacity
              onPress={handleConfirm}
              style={{
                backgroundColor: tokens.accent,
                paddingHorizontal: 12,
                paddingVertical: 6,
              }}
              accessibilityLabel={`Add ${selected.length} exercises`}
              accessibilityRole="button"
            >
              <Text style={{ fontFamily: fonts.sansB, fontSize: 10, color: '#FFFFFF', letterSpacing: 1 }}>
                ADD {selected.length}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Search + filter */}
        <View style={{ padding: 16, paddingBottom: 8, gap: 8 }}>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={t('workout.searchExercises')}
            placeholderTextColor={tokens.textGhost}
            style={{
              fontFamily: fonts.sans,
              fontSize: 14,
              color: tokens.text,
              borderBottomWidth: 1,
              borderBottomColor: tokens.border,
              paddingVertical: 8,
            }}
            accessibilityLabel="Search exercises"
            autoFocus
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', gap: 4 }}>
              <TouchableOpacity
                onPress={() => setActiveFilters([])}
                style={{
                  paddingVertical: 4,
                  paddingHorizontal: 10,
                  borderWidth: 1,
                  borderColor: activeFilters.length === 0 ? tokens.accent : tokens.border,
                  backgroundColor: activeFilters.length === 0 ? tokens.accent : 'transparent',
                }}
                accessibilityLabel="Show all muscles"
                accessibilityRole="button"
              >
                <Text style={{
                  fontFamily: fonts.sansB,
                  fontSize: 9,
                  letterSpacing: 1.4,
                  color: activeFilters.length === 0 ? '#FFFFFF' : tokens.textMute,
                  textTransform: 'uppercase',
                }}>
                  ALL
                </Text>
              </TouchableOpacity>

              {orderedMuscles.map((mg) => {
                const isActive = activeFilters.includes(mg)
                const label = translateMuscleGroup(mg, t)
                return (
                  <TouchableOpacity
                    key={mg}
                    onPress={() => toggleFilter(mg)}
                    style={{
                      paddingVertical: 4,
                      paddingHorizontal: 10,
                      borderWidth: 1,
                      borderColor: isActive ? tokens.accent : tokens.border,
                      backgroundColor: isActive ? tokens.accent : 'transparent',
                    }}
                    accessibilityLabel={label}
                    accessibilityRole="button"
                  >
                    <Text style={{
                      fontFamily: fonts.sansB,
                      fontSize: 9,
                      letterSpacing: 1.4,
                      color: isActive ? '#FFFFFF' : tokens.textMute,
                      textTransform: 'uppercase',
                    }}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          </ScrollView>
        </View>

        {/* Exercise list */}
        <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}>
          {filtered.map((ex) => {
            const alreadyIn = alreadyAdded.includes(ex.id)
            const ticked = isSelected(ex.id)
            return (
              <TouchableOpacity
                key={ex.id}
                onPress={() => {
                  if (!alreadyIn) toggleSelect({ id: ex.id, name: ex.name, muscleGroups: ex.muscleGroups })
                }}
                disabled={alreadyIn}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 10,
                  borderBottomWidth: 1,
                  borderBottomColor: tokens.border,
                  opacity: alreadyIn ? 0.4 : 1,
                  borderLeftWidth: ticked ? 3 : 0,
                  borderLeftColor: tokens.accent,
                  paddingLeft: ticked ? 10 : 0,
                }}
                accessibilityLabel={`${alreadyIn ? 'Already added' : ticked ? 'Deselect' : 'Select'} ${ex.name}`}
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
                  <Text style={{ fontFamily: fonts.sansB, fontSize: 13, color: tokens.text, textTransform: 'uppercase' }}>
                    {ex.name}
                  </Text>
                  <Text style={{ fontFamily: fonts.sans, fontSize: 11, color: tokens.textMute }}>
                    {ex.muscleGroups.map((mg) => translateMuscleGroup(mg, t)).join(' / ')} / {translateDifficulty(ex.difficulty, t)}
                  </Text>
                </View>
                <View style={{
                  width: 24,
                  height: 24,
                  borderWidth: 1,
                  borderColor: alreadyIn ? tokens.textMute : ticked ? tokens.accent : tokens.border,
                  backgroundColor: ticked ? tokens.accent : 'transparent',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  {(alreadyIn || ticked) && (
                    <Text style={{ fontFamily: fonts.sansB, fontSize: 10, color: '#FFFFFF' }}>V</Text>
                  )}
                </View>
              </TouchableOpacity>
            )
          })}
        </ScrollView>

        {/* Bottom confirm */}
        {selected.length > 0 && (
          <View style={{
            padding: 16,
            borderTopWidth: 1,
            borderTopColor: tokens.border,
            backgroundColor: tokens.bg,
          }}>
            <TouchableOpacity
              onPress={handleConfirm}
              style={{
                backgroundColor: tokens.accent,
                height: 48,
                alignItems: 'center',
                justifyContent: 'center',
              }}
              accessibilityLabel={`Add ${selected.length} exercises`}
              accessibilityRole="button"
            >
              <Text style={{ fontFamily: fonts.sansX, fontSize: 14, color: '#FFFFFF', textTransform: 'uppercase', letterSpacing: 1 }}>
                ADD {selected.length} EXERCISE{selected.length > 1 ? 'S' : ''}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  )
}

export default function WorkoutBuildScreen() {
  const { tokens, fonts } = useTheme()
  const { t } = useTranslation()
  const setPending = usePendingWorkoutStore((s) => s.setPending)
  const pendingForDay = usePendingWorkoutStore((s) => s.pendingForDay)
  const utils = trpc.useUtils()

  const [workoutName, setWorkoutName] = useState('')
  const [selectedMuscles, setSelectedMuscles] = useState<string[]>([])
  const [duration, setDuration] = useState(60)
  const [exercises, setExercises] = useState<ExerciseEntry[]>([])
  const [pickerVisible, setPickerVisible] = useState(false)

  const createWorkout = trpc.workouts.create.useMutation({
    onSuccess: (created) => {
      utils.workouts.list.invalidate()
      if (pendingForDay !== null && created) {
        setPending(pendingForDay, created.id)
      }
      router.back()
    },
    onError: (err) => Alert.alert('Error', err.message),
  })

  const toggleMuscle = (m: string) => {
    setSelectedMuscles((prev) =>
      prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m],
    )
  }

  const handleConfirmExercises = (picked: PickedExercise[]) => {
    const newEntries: ExerciseEntry[] = picked
      .filter((p) => !exercises.some((e) => e.exerciseId === p.id))
      .map((p) => ({
        exerciseId: p.id,
        exerciseName: p.name,
        muscleGroups: p.muscleGroups,
        sets: 3,
        reps: 10,
        weight: 0,
        restSeconds: 90,
      }))
    setExercises((prev) => [...prev, ...newEntries])
    setPickerVisible(false)
  }

  const updateExercise = (idx: number, field: keyof ExerciseEntry, value: number) => {
    setExercises((prev) => prev.map((ex, i) => i === idx ? { ...ex, [field]: value } : ex))
  }

  const removeExercise = (idx: number) => {
    setExercises((prev) => prev.filter((_, i) => i !== idx))
  }

  const moveExercise = (idx: number, direction: 'up' | 'down') => {
    setExercises((prev) => {
      const next = [...prev]
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1
      if (swapIdx < 0 || swapIdx >= next.length) return prev
      ;[next[idx], next[swapIdx]] = [next[swapIdx]!, next[idx]!]
      return next
    })
  }

  const handleSave = () => {
    if (!workoutName.trim()) {
      Alert.alert('Missing name', 'Please give your workout a name.')
      return
    }
    createWorkout.mutate({
      name: workoutName.trim(),
      muscleGroups: selectedMuscles,
      estimatedDuration: duration,
      exercises: exercises.map((ex, i) => ({
        exerciseId: ex.exerciseId,
        order: i,
        defaultSets: ex.sets,
        defaultReps: ex.reps,
        defaultWeight: ex.weight,
        defaultRestSeconds: ex.restSeconds,
      })),
    })
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: tokens.bg }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 }}>
        <TouchableOpacity onPress={() => router.back()} accessibilityLabel="Go back" accessibilityRole="button">
          <Text style={{ fontFamily: fonts.sansB, fontSize: 10, color: tokens.accent, textTransform: 'uppercase', letterSpacing: 2 }}>
            {'< BACK'}
          </Text>
        </TouchableOpacity>
        <Text style={{ fontFamily: fonts.sansX, fontSize: 20, color: tokens.text, textTransform: 'uppercase' }}>
          {t('workout.newWorkout')}
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 20 }}>
        {/* Workout name */}
        <View style={{ gap: 6 }}>
          <Text style={{ fontFamily: fonts.sansB, fontSize: 9, color: tokens.textMute, textTransform: 'uppercase', letterSpacing: 2 }}>
            {t('workout.workoutName').toUpperCase()}
          </Text>
          <TextInput
            value={workoutName}
            onChangeText={setWorkoutName}
            placeholder="e.g. Push Day, Upper Body A..."
            placeholderTextColor={tokens.textGhost}
            style={{
              fontFamily: fonts.sansX,
              fontSize: 20,
              color: tokens.text,
              borderBottomWidth: 1,
              borderBottomColor: tokens.border,
              paddingVertical: 6,
            }}
            accessibilityLabel="Workout name"
            autoFocus
          />
        </View>

        {/* Muscle groups */}
        <View style={{ gap: 6 }}>
          <Text style={{ fontFamily: fonts.sansB, fontSize: 9, color: tokens.textMute, textTransform: 'uppercase', letterSpacing: 2 }}>
            {t('workout.muscleGroups').toUpperCase()}
          </Text>
          <Text style={{ fontFamily: fonts.sans, fontSize: 12, color: tokens.textDim }}>
            {t('workout.muscleGroupsDesc')}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
            {MUSCLE_GROUPS.map((mg) => {
              const selected = selectedMuscles.includes(mg)
              const label = translateMuscleGroup(mg, t)
              return (
                <TouchableOpacity
                  key={mg}
                  onPress={() => toggleMuscle(mg)}
                  style={{
                    paddingVertical: 4,
                    paddingHorizontal: 10,
                    borderWidth: 1,
                    borderColor: selected ? tokens.accent : tokens.border,
                    backgroundColor: selected ? tokens.accent : 'transparent',
                  }}
                  accessibilityLabel={`${label} ${selected ? 'selected' : 'not selected'}`}
                  accessibilityRole="button"
                >
                  <Text style={{
                    fontFamily: fonts.sansB,
                    fontSize: 9,
                    letterSpacing: 1.4,
                    color: selected ? '#FFFFFF' : tokens.textMute,
                    textTransform: 'uppercase',
                  }}>
                    {label}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>
        </View>

        {/* Duration */}
        <View style={{ gap: 6 }}>
          <Text style={{ fontFamily: fonts.sansB, fontSize: 9, color: tokens.textMute, textTransform: 'uppercase', letterSpacing: 2 }}>
            {t('workout.estimatedDuration').toUpperCase()}
          </Text>
          <View style={{ flexDirection: 'row', gap: 4 }}>
            {DURATIONS.map((d) => {
              const selected = duration === d
              return (
                <TouchableOpacity
                  key={d}
                  onPress={() => setDuration(d)}
                  style={{
                    flex: 1,
                    paddingVertical: 8,
                    borderWidth: 1,
                    borderColor: selected ? tokens.accent : tokens.border,
                    backgroundColor: selected ? tokens.accent : 'transparent',
                    alignItems: 'center',
                  }}
                  accessibilityLabel={`${d} minutes`}
                  accessibilityRole="button"
                >
                  <Text style={{
                    fontFamily: fonts.monoB,
                    fontSize: 12,
                    color: selected ? '#FFFFFF' : tokens.textMute,
                  }}>
                    {d}m
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>
        </View>

        {/* Exercises */}
        <View style={{ gap: 8 }}>
          <Text style={{ fontFamily: fonts.sansB, fontSize: 9, color: tokens.textMute, textTransform: 'uppercase', letterSpacing: 2 }}>
            EXERCISES {exercises.length > 0 ? `(${exercises.length})` : ''}
          </Text>

          {exercises.map((ex, idx) => (
            <View key={ex.exerciseId} style={{
              borderWidth: 1,
              borderColor: tokens.border,
              padding: 12,
              gap: 8,
            }}>
              {/* Exercise header */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ gap: 2 }}>
                  <TouchableOpacity
                    onPress={() => moveExercise(idx, 'up')}
                    disabled={idx === 0}
                    style={{ opacity: idx === 0 ? 0.2 : 1, padding: 2 }}
                    accessibilityLabel={`Move ${ex.exerciseName} up`}
                    accessibilityRole="button"
                  >
                    <Text style={{ fontFamily: fonts.sansB, fontSize: 10, color: tokens.textMute }}>^</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => moveExercise(idx, 'down')}
                    disabled={idx === exercises.length - 1}
                    style={{ opacity: idx === exercises.length - 1 ? 0.2 : 1, padding: 2 }}
                    accessibilityLabel={`Move ${ex.exerciseName} down`}
                    accessibilityRole="button"
                  >
                    <Text style={{ fontFamily: fonts.sansB, fontSize: 10, color: tokens.textMute }}>v</Text>
                  </TouchableOpacity>
                </View>
                <View style={{
                  width: 28,
                  height: 28,
                  borderWidth: 1,
                  borderColor: tokens.accent,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Text style={{ fontFamily: fonts.sansB, fontSize: 11, color: tokens.accent }}>
                    {idx + 1}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: fonts.sansB, fontSize: 13, color: tokens.text, textTransform: 'uppercase' }}>
                    {ex.exerciseName}
                  </Text>
                  <Text style={{ fontFamily: fonts.sans, fontSize: 11, color: tokens.textMute }}>
                    {ex.muscleGroups.slice(0, 2).join(' / ')}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => removeExercise(idx)}
                  style={{ padding: 4 }}
                  accessibilityLabel={`Remove ${ex.exerciseName}`}
                  accessibilityRole="button"
                >
                  <Text style={{ fontFamily: fonts.sansB, fontSize: 17, color: tokens.accent }}>x</Text>
                </TouchableOpacity>
              </View>

              {/* Sets / Reps / Weight / Rest */}
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {(
                  [
                    { label: t('workout.sets'), field: 'sets' as const, value: ex.sets },
                    { label: t('workout.reps'), field: 'reps' as const, value: ex.reps },
                    { label: t('workout.kg'), field: 'weight' as const, value: ex.weight },
                    { label: t('workout.restSeconds'), field: 'restSeconds' as const, value: ex.restSeconds },
                  ] as const
                ).map(({ label, field, value }) => (
                  <View key={field} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
                    <Text style={{ fontFamily: fonts.sansB, fontSize: 8, color: tokens.textMute, textTransform: 'uppercase', letterSpacing: 1 }}>
                      {label}
                    </Text>
                    <TextInput
                      value={value > 0 ? String(value) : ''}
                      onChangeText={(v) => updateExercise(idx, field, parseFloat(v) || 0)}
                      keyboardType="decimal-pad"
                      placeholder={field === 'weight' ? '0' : String(value)}
                      placeholderTextColor={tokens.textGhost}
                      style={{
                        borderBottomWidth: 1,
                        borderBottomColor: tokens.border,
                        paddingVertical: 4,
                        color: tokens.text,
                        fontFamily: fonts.monoB,
                        fontSize: 14,
                        textAlign: 'center',
                        width: '100%',
                      }}
                      accessibilityLabel={`${ex.exerciseName} ${label}`}
                    />
                  </View>
                ))}
              </View>
            </View>
          ))}

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
            accessibilityLabel="Add exercises"
            accessibilityRole="button"
          >
            <Text style={{ fontFamily: fonts.sansX, fontSize: 20, color: tokens.accent }}>+</Text>
            <Text style={{ fontFamily: fonts.sansB, fontSize: 13, color: tokens.accent, textTransform: 'uppercase', letterSpacing: 1 }}>
              {exercises.length === 0 ? t('workout.addExercises') : t('workout.addMoreExercises')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Save */}
        <TouchableOpacity
          onPress={handleSave}
          disabled={createWorkout.isPending || !workoutName.trim()}
          style={{
            backgroundColor: workoutName.trim() ? tokens.accent : tokens.surface2,
            height: 48,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 40,
          }}
          accessibilityLabel="Save workout"
          accessibilityRole="button"
        >
          <Text style={{
            fontFamily: fonts.sansX,
            fontSize: 14,
            color: workoutName.trim() ? '#FFFFFF' : tokens.textMute,
            textTransform: 'uppercase',
            letterSpacing: 1,
          }}>
            {createWorkout.isPending ? t('workout.saving') : t('workout.saveWorkout')}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <ExercisePicker
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        onConfirm={handleConfirmExercises}
        alreadyAdded={exercises.map((e) => e.exerciseId)}
        preselectedMuscles={selectedMuscles}
      />
    </SafeAreaView>
  )
}
