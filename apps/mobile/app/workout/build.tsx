import React, { useState, useMemo, useEffect } from 'react'
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Modal,
  Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useTheme } from '@/theme/ThemeContext'
import { trpc } from '@/lib/trpc'
import { usePendingWorkoutStore } from '@/stores/pendingWorkoutStore'
import { colors as tokenColors } from '@/theme/tokens'

const MUSCLE_GROUPS = ['Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Quadriceps', 'Hamstrings', 'Glutes', 'Calves', 'Core', 'Full Body', 'Cardio']
const DURATIONS = [30, 45, 60, 75, 90]
const ALL_MUSCLES = ['All', ...MUSCLE_GROUPS]

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
  const { colors, typography, spacing, radius } = useTheme()
  const [search, setSearch] = useState('')
  // activeFilters: empty = show all; otherwise show exercises matching any active filter
  const [activeFilters, setActiveFilters] = useState<string[]>([])
  const [selected, setSelected] = useState<PickedExercise[]>([])
  const { data: allExercises } = trpc.exercises.list.useQuery()

  // On open: activate all preselected muscles (if any), reset selection
  useEffect(() => {
    if (visible) {
      setSelected([])
      setSearch('')
      setActiveFilters(preselectedMuscles.length > 0 ? [...preselectedMuscles] : [])
    }
  }, [visible])

  // Chip order: preselected muscles first, then the rest (excluding duplicates)
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
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        {/* Header */}
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          padding: spacing.base,
          gap: spacing.md,
          borderBottomWidth: 1,
          borderBottomColor: colors.surface2,
        }}>
          <TouchableOpacity onPress={onClose} accessibilityLabel="Close" accessibilityRole="button">
            <Text style={{ fontFamily: typography.family.bold, fontSize: typography.size.title, color: colors.primary }}>✕</Text>
          </TouchableOpacity>
          <Text style={{ fontFamily: typography.family.extraBold, fontSize: typography.size.xl, color: colors.textPrimary, flex: 1 }}>
            Add exercises
          </Text>
          {selected.length > 0 && (
            <TouchableOpacity
              onPress={handleConfirm}
              style={{
                backgroundColor: colors.primary,
                borderRadius: radius.pill,
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.xs,
              }}
              accessibilityLabel={`Add ${selected.length} exercises`}
              accessibilityRole="button"
            >
              <Text style={{ fontFamily: typography.family.bold, fontSize: typography.size.body, color: tokenColors.white }}>
                Add {selected.length}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Search + muscle filter */}
        <View style={{ padding: spacing.base, paddingBottom: spacing.sm, gap: spacing.sm }}>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search exercises..."
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
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              {/* "All" chip — clears all filters */}
              <TouchableOpacity
                onPress={() => setActiveFilters([])}
                style={{
                  paddingVertical: spacing.xs,
                  paddingHorizontal: spacing.md,
                  borderRadius: radius.pill,
                  backgroundColor: activeFilters.length === 0 ? colors.primary : colors.surface2,
                }}
                accessibilityLabel="Show all muscles"
                accessibilityRole="button"
              >
                <Text style={{
                  fontFamily: activeFilters.length === 0 ? typography.family.semiBold : typography.family.regular,
                  fontSize: typography.size.base,
                  color: activeFilters.length === 0 ? tokenColors.white : colors.textMuted,
                }}>
                  All
                </Text>
              </TouchableOpacity>

              {/* Muscle chips: preselected first, rest after */}
              {orderedMuscles.map((mg) => {
                const isActive = activeFilters.includes(mg)
                return (
                  <TouchableOpacity
                    key={mg}
                    onPress={() => toggleFilter(mg)}
                    style={{
                      paddingVertical: spacing.xs,
                      paddingHorizontal: spacing.md,
                      borderRadius: radius.pill,
                      backgroundColor: isActive ? colors.primary : colors.surface2,
                    }}
                    accessibilityLabel={`${isActive ? 'Remove' : 'Add'} ${mg} filter`}
                    accessibilityRole="button"
                  >
                    <Text style={{
                      fontFamily: isActive ? typography.family.semiBold : typography.family.regular,
                      fontSize: typography.size.base,
                      color: isActive ? tokenColors.white : colors.textMuted,
                    }}>
                      {mg}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          </ScrollView>
        </View>

        {/* Exercise list */}
        <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.base, gap: spacing.sm, paddingBottom: spacing.xl }}>
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
                  backgroundColor: ticked ? `${colors.primary}18` : colors.surface,
                  borderRadius: radius.md,
                  padding: spacing.base,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  opacity: alreadyIn ? 0.4 : 1,
                  borderWidth: ticked ? 1.5 : 0,
                  borderColor: colors.primary,
                }}
                accessibilityLabel={`${alreadyIn ? 'Already added' : ticked ? 'Deselect' : 'Select'} ${ex.name}`}
                accessibilityRole="button"
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: typography.family.semiBold, fontSize: typography.size.body, color: colors.textPrimary }}>
                    {ex.name}
                  </Text>
                  <Text style={{ fontFamily: typography.family.regular, fontSize: typography.size.base, color: colors.textMuted }}>
                    {ex.muscleGroups.join(' · ')} · {ex.difficulty}
                  </Text>
                </View>
                <View style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  borderWidth: 2,
                  borderColor: alreadyIn ? colors.textMuted : ticked ? colors.primary : colors.surface2,
                  backgroundColor: ticked ? colors.primary : 'transparent',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  {(alreadyIn || ticked) && (
                    <Text style={{ fontFamily: typography.family.bold, fontSize: typography.size.base, color: tokenColors.white }}>✓</Text>
                  )}
                </View>
              </TouchableOpacity>
            )
          })}
        </ScrollView>

        {/* Bottom confirm bar */}
        {selected.length > 0 && (
          <View style={{
            padding: spacing.base,
            borderTopWidth: 1,
            borderTopColor: colors.surface2,
            backgroundColor: colors.background,
          }}>
            <TouchableOpacity
              onPress={handleConfirm}
              style={{
                backgroundColor: colors.primary,
                borderRadius: radius.lg,
                paddingVertical: spacing.base,
                alignItems: 'center',
              }}
              accessibilityLabel={`Add ${selected.length} exercises`}
              accessibilityRole="button"
            >
              <Text style={{ fontFamily: typography.family.extraBold, fontSize: typography.size.xl, color: tokenColors.white }}>
                Add {selected.length} exercise{selected.length > 1 ? 's' : ''} →
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  )
}

export default function WorkoutBuildScreen() {
  const { colors, typography, spacing, radius } = useTheme()
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

  const inputStyle = {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.base,
    borderWidth: 1,
    borderColor: colors.surface2,
    color: colors.textPrimary,
    fontFamily: typography.family.regular,
    fontSize: typography.size.body,
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: spacing.base, gap: spacing.md }}>
        <TouchableOpacity onPress={() => router.back()} accessibilityLabel="Go back" accessibilityRole="button">
          <Text style={{ fontFamily: typography.family.bold, fontSize: typography.size.title, color: colors.primary }}>←</Text>
        </TouchableOpacity>
        <Text style={{ fontFamily: typography.family.extraBold, fontSize: typography.size['2xl'], color: colors.textPrimary }}>
          New Workout
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.base, gap: spacing.lg }}>
        {/* Workout name */}
        <View style={{ gap: spacing.sm }}>
          <Text style={{ fontFamily: typography.family.semiBold, fontSize: typography.size.body, color: colors.textPrimary }}>
            Workout name
          </Text>
          <TextInput
            value={workoutName}
            onChangeText={setWorkoutName}
            placeholder="e.g. Push Day, Upper Body A..."
            placeholderTextColor={colors.textMuted}
            style={inputStyle}
            accessibilityLabel="Workout name"
            autoFocus
          />
        </View>

        {/* Muscle groups */}
        <View style={{ gap: spacing.sm }}>
          <Text style={{ fontFamily: typography.family.semiBold, fontSize: typography.size.body, color: colors.textPrimary }}>
            Muscle groups
          </Text>
          <Text style={{ fontFamily: typography.family.regular, fontSize: typography.size.base, color: colors.textMuted }}>
            Selected muscles will pre-filter the exercise picker
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {MUSCLE_GROUPS.map((mg) => {
              const selected = selectedMuscles.includes(mg)
              return (
                <TouchableOpacity
                  key={mg}
                  onPress={() => toggleMuscle(mg)}
                  style={{
                    paddingVertical: spacing.xs,
                    paddingHorizontal: spacing.md,
                    borderRadius: radius.pill,
                    borderWidth: 1.5,
                    borderColor: selected ? colors.primary : colors.surface2,
                    backgroundColor: selected ? `${colors.primary}18` : colors.surface,
                  }}
                  accessibilityLabel={`${mg} ${selected ? 'selected' : 'not selected'}`}
                  accessibilityRole="button"
                >
                  <Text style={{
                    fontFamily: selected ? typography.family.semiBold : typography.family.regular,
                    fontSize: typography.size.base,
                    color: selected ? colors.primary : colors.textMuted,
                  }}>
                    {mg}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>
        </View>

        {/* Duration */}
        <View style={{ gap: spacing.sm }}>
          <Text style={{ fontFamily: typography.family.semiBold, fontSize: typography.size.body, color: colors.textPrimary }}>
            Estimated duration
          </Text>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            {DURATIONS.map((d) => {
              const selected = duration === d
              return (
                <TouchableOpacity
                  key={d}
                  onPress={() => setDuration(d)}
                  style={{
                    flex: 1,
                    paddingVertical: spacing.sm,
                    borderRadius: radius.md,
                    borderWidth: 1.5,
                    borderColor: selected ? colors.primary : colors.surface2,
                    backgroundColor: selected ? colors.primary : colors.surface,
                    alignItems: 'center',
                  }}
                  accessibilityLabel={`${d} minutes`}
                  accessibilityRole="button"
                >
                  <Text style={{
                    fontFamily: typography.family.bold,
                    fontSize: typography.size.base,
                    color: selected ? tokenColors.white : colors.textMuted,
                  }}>
                    {d}m
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>
        </View>

        {/* Exercises */}
        <View style={{ gap: spacing.sm }}>
          <Text style={{ fontFamily: typography.family.semiBold, fontSize: typography.size.body, color: colors.textPrimary }}>
            Exercises {exercises.length > 0 ? `(${exercises.length})` : ''}
          </Text>

          {exercises.map((ex, idx) => (
            <View key={ex.exerciseId} style={{
              backgroundColor: colors.surface,
              borderRadius: radius.lg,
              padding: spacing.base,
              gap: spacing.sm,
              borderWidth: 1,
              borderColor: colors.surface2,
            }}>
              {/* Exercise header */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <View style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  backgroundColor: colors.primary,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Text style={{ fontFamily: typography.family.bold, fontSize: typography.size.base, color: tokenColors.white }}>
                    {idx + 1}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: typography.family.bold, fontSize: typography.size.body, color: colors.textPrimary }}>
                    {ex.exerciseName}
                  </Text>
                  <Text style={{ fontFamily: typography.family.regular, fontSize: typography.size.base, color: colors.textMuted }}>
                    {ex.muscleGroups.slice(0, 2).join(' · ')}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => removeExercise(idx)}
                  style={{ padding: spacing.xs }}
                  accessibilityLabel={`Remove ${ex.exerciseName}`}
                  accessibilityRole="button"
                >
                  <Text style={{ fontFamily: typography.family.bold, fontSize: typography.size.xl, color: colors.danger }}>×</Text>
                </TouchableOpacity>
              </View>

              {/* Sets / Reps / Weight / Rest */}
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                {(
                  [
                    { label: 'Sets', field: 'sets' as const, value: ex.sets },
                    { label: 'Reps', field: 'reps' as const, value: ex.reps },
                    { label: 'kg', field: 'weight' as const, value: ex.weight },
                    { label: 'Rest s', field: 'restSeconds' as const, value: ex.restSeconds },
                  ] as const
                ).map(({ label, field, value }) => (
                  <View key={field} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
                    <Text style={{ fontFamily: typography.family.semiBold, fontSize: typography.size.xs, color: colors.textMuted }}>
                      {label}
                    </Text>
                    <TextInput
                      value={value > 0 ? String(value) : ''}
                      onChangeText={(v) => updateExercise(idx, field, parseFloat(v) || 0)}
                      keyboardType="decimal-pad"
                      placeholder={field === 'weight' ? '0' : String(value)}
                      placeholderTextColor={colors.textMuted}
                      style={{
                        backgroundColor: colors.background,
                        borderRadius: radius.sm,
                        padding: spacing.xs,
                        color: colors.textPrimary,
                        fontFamily: typography.family.semiBold,
                        fontSize: typography.size.body,
                        textAlign: 'center',
                        width: '100%',
                        borderWidth: 1,
                        borderColor: colors.surface2,
                      }}
                      accessibilityLabel={`${ex.exerciseName} ${label}`}
                    />
                  </View>
                ))}
              </View>
            </View>
          ))}

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
            accessibilityLabel="Add exercises"
            accessibilityRole="button"
          >
            <Text style={{ fontFamily: typography.family.extraBold, fontSize: typography.size.xl, color: colors.primary }}>+</Text>
            <Text style={{ fontFamily: typography.family.bold, fontSize: typography.size.body, color: colors.primary }}>
              {exercises.length === 0 ? 'Add exercises' : 'Add more exercises'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Save button */}
        <TouchableOpacity
          onPress={handleSave}
          disabled={createWorkout.isPending || !workoutName.trim()}
          style={{
            backgroundColor: workoutName.trim() ? colors.primary : colors.surface2,
            borderRadius: radius.lg,
            paddingVertical: spacing.base,
            alignItems: 'center',
            marginBottom: spacing.xl,
          }}
          accessibilityLabel="Save workout"
          accessibilityRole="button"
        >
          <Text style={{
            fontFamily: typography.family.extraBold,
            fontSize: typography.size.xl,
            color: workoutName.trim() ? tokenColors.white : colors.textMuted,
          }}>
            {createWorkout.isPending ? 'Saving...' : 'Save workout'}
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
