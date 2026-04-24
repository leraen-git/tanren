import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, router } from 'expo-router'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import DraggableFlatList, { RenderItemParams } from 'react-native-draggable-flatlist'
import { useTheme } from '@/theme/ThemeContext'
import { trpc } from '@/lib/trpc'
import { useInvalidateWorkouts } from '@/lib/invalidation'
import { useTranslation } from 'react-i18next'
import { translateMuscleGroup } from '@/hooks/useExercises'
import { useWorkoutDraftStore, type ExerciseEntry } from '@/stores/workoutDraftStore'
import { usePendingWorkoutStore } from '@/stores/pendingWorkoutStore'
import { ExerciseRow } from '@/components/ExerciseRow'
import { ExercisePicker } from '@/components/ExercisePicker'

const MUSCLE_GROUPS = ['Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Quadriceps', 'Hamstrings', 'Glutes', 'Calves', 'Core', 'Full Body', 'Cardio']
const DURATIONS = [30, 45, 60, 75, 90]

export default function WorkoutBuildScreen() {
  const { tokens, fonts } = useTheme()
  const { t } = useTranslation()
  const { editId, forPlanDay } = useLocalSearchParams<{ editId?: string; forPlanDay?: string }>()
  const isEdit = !!editId

  const draft = useWorkoutDraftStore()
  const setPending = usePendingWorkoutStore((s) => s.setPending)
  const invalidateWorkouts = useInvalidateWorkouts()

  const [pickerVisible, setPickerVisible] = useState(false)
  const [showDraftToast, setShowDraftToast] = useState(false)
  const [initialized, setInitialized] = useState(false)

  const { data: existing } = trpc.workouts.byId.useQuery(
    { id: editId! },
    { enabled: isEdit },
  )

  // Edit mode: hydrate draft from existing workout
  useEffect(() => {
    if (!isEdit || !existing || initialized) return
    draft.hydrate({
      name: existing.name,
      muscleGroups: existing.muscleGroups ?? [],
      durationMin: existing.estimatedDuration ?? 60,
      exercises: (existing.exercises ?? []).map((ex: any) => ({
        exerciseId: ex.exerciseId,
        exerciseName: ex.exerciseName ?? ex.exerciseId,
        muscleGroups: ex.muscleGroups ?? [],
        sets: ex.defaultSets ?? 3,
        reps: ex.defaultReps ?? 10,
        weight: ex.defaultWeight ?? 0,
        restSeconds: ex.defaultRestSeconds ?? 90,
      })),
    })
    setInitialized(true)
  }, [existing, isEdit, initialized])

  // Create mode: check for draft recovery
  useEffect(() => {
    if (isEdit) { setInitialized(true); return }
    const hasDraft = draft.name || draft.exercises.length > 0
    if (hasDraft && !draft.isExpired()) {
      setShowDraftToast(true)
    } else if (draft.isExpired()) {
      draft.reset()
    }
    setInitialized(true)
  }, [isEdit])

  const createMutation = trpc.workouts.create.useMutation({
    onSuccess: (created) => {
      invalidateWorkouts()
      if (forPlanDay && created) {
        setPending(parseInt(forPlanDay, 10), created.id)
      }
      draft.reset()
      router.back()
    },
    onError: (err) => Alert.alert(t('common.error'), err.message),
  })

  const updateMutation = trpc.workouts.update.useMutation({
    onSuccess: () => {
      invalidateWorkouts()
      draft.reset()
      router.back()
    },
    onError: (err) => Alert.alert(t('common.error'), err.message),
  })

  const deleteMutation = trpc.workouts.delete.useMutation({
    onSuccess: () => {
      invalidateWorkouts()
      draft.reset()
      router.back()
    },
  })

  const handleSave = () => {
    if (!draft.name.trim()) {
      Alert.alert(t('workout.sessionName'), t('workout.sessionNamePlaceholder'))
      return
    }
    const payload = {
      name: draft.name.trim(),
      muscleGroups: draft.muscleGroups,
      estimatedDuration: draft.durationMin,
      exercises: draft.exercises.map((ex, i) => ({
        exerciseId: ex.exerciseId,
        order: i,
        defaultSets: ex.sets,
        defaultReps: ex.reps,
        defaultWeight: ex.weight,
        defaultRestSeconds: ex.restSeconds,
      })),
    }
    if (isEdit) {
      updateMutation.mutate({ id: editId!, ...payload })
    } else {
      createMutation.mutate(payload)
    }
  }

  const handleDelete = () => {
    Alert.alert(
      t('workout.deleteTitle'),
      t('workout.deleteMessage', { name: draft.name }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () => deleteMutation.mutate({ id: editId! }),
        },
      ],
    )
  }

  const canSave = draft.name.trim().length > 0 && draft.exercises.length > 0
  const isSaving = createMutation.isPending || updateMutation.isPending

  const renderExercise = ({ item, drag, isActive, getIndex }: RenderItemParams<ExerciseEntry>) => (
    <ExerciseRow
      index={getIndex() ?? 0}
      entry={item}
      isDragging={isActive}
      onLongPress={drag}
      onUpdate={(patch) => draft.updateExercise(getIndex() ?? 0, patch)}
      onDelete={() => draft.removeExercise(getIndex() ?? 0)}
    />
  )

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1, backgroundColor: tokens.bg }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 }}>
          <TouchableOpacity onPress={() => router.back()} accessibilityLabel={t('common.back')} accessibilityRole="button">
            <Text style={{ fontFamily: fonts.sansB, fontSize: 10, color: tokens.accent, textTransform: 'uppercase', letterSpacing: 2 }}>
              {'< ' + t('common.back').toUpperCase()}
            </Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }} />
          {isEdit && (
            <View style={{ backgroundColor: tokens.accent, paddingHorizontal: 8, paddingVertical: 2 }}>
              <Text style={{ fontFamily: fonts.sansB, fontSize: 9, letterSpacing: 2, color: '#FFFFFF', textTransform: 'uppercase' }}>
                {t('workout.editBadge')}
              </Text>
            </View>
          )}
          {isEdit && (
            <TouchableOpacity onPress={handleDelete} accessibilityLabel={t('common.delete')} accessibilityRole="button">
              <Text style={{ fontFamily: fonts.sansB, fontSize: 10, color: tokens.accent, textTransform: 'uppercase', letterSpacing: 2 }}>
                {t('common.delete').toUpperCase()}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Draft recovery toast */}
        {showDraftToast && (
          <View style={{
            marginHorizontal: 16,
            marginBottom: 12,
            padding: 12,
            borderWidth: 1,
            borderColor: tokens.accent,
            backgroundColor: tokens.surface1,
            gap: 8,
          }}>
            <Text style={{ fontFamily: fonts.sansB, fontSize: 13, color: tokens.text }}>
              {t('workout.draftRecoveryTitle')}
            </Text>
            <Text style={{ fontFamily: fonts.sans, fontSize: 12, color: tokens.textMute }}>
              {t('workout.draftRecoveryDesc')}
            </Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity
                onPress={() => { draft.reset(); setShowDraftToast(false) }}
                style={{ flex: 1, height: 36, borderWidth: 1, borderColor: tokens.border, alignItems: 'center', justifyContent: 'center' }}
                accessibilityRole="button"
              >
                <Text style={{ fontFamily: fonts.sansB, fontSize: 10, color: tokens.textMute, textTransform: 'uppercase', letterSpacing: 1 }}>
                  {t('workout.draftIgnore')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setShowDraftToast(false)}
                style={{ flex: 1, height: 36, backgroundColor: tokens.accent, alignItems: 'center', justifyContent: 'center' }}
                accessibilityRole="button"
              >
                <Text style={{ fontFamily: fonts.sansB, fontSize: 10, color: '#FFFFFF', textTransform: 'uppercase', letterSpacing: 1 }}>
                  {t('workout.draftRestore')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Title */}
        <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
          <Text style={{ fontFamily: fonts.sansX, fontSize: 20, color: tokens.text, textTransform: 'uppercase' }}>
            {isEdit ? t('workout.editWorkout') : t('workout.newWorkout')}
          </Text>
        </View>

        {draft.exercises.length === 0 ? (
          <ScrollView contentContainerStyle={{ padding: 16, gap: 20 }}>
            {/* Workout name */}
            <View style={{ gap: 6 }}>
              <Text style={{ fontFamily: fonts.sansB, fontSize: 9, color: tokens.textMute, textTransform: 'uppercase', letterSpacing: 2 }}>
                {t('workout.sessionName').toUpperCase()}
              </Text>
              <TextInput
                value={draft.name}
                onChangeText={draft.setName}
                placeholder={t('workout.sessionNamePlaceholder')}
                placeholderTextColor={tokens.textGhost}
                style={{
                  fontFamily: fonts.sansX,
                  fontSize: 20,
                  color: tokens.text,
                  borderBottomWidth: 1,
                  borderBottomColor: tokens.border,
                  paddingVertical: 6,
                }}
                accessibilityLabel={t('workout.sessionName')}
              />
            </View>

            {/* Muscle groups */}
            <View style={{ gap: 6 }}>
              <Text style={{ fontFamily: fonts.sansB, fontSize: 9, color: tokens.textMute, textTransform: 'uppercase', letterSpacing: 2 }}>
                {t('workout.muscleGroups').toUpperCase()}
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {MUSCLE_GROUPS.map((mg) => {
                    const selected = draft.muscleGroups.includes(mg)
                    const label = translateMuscleGroup(mg, t)
                    return (
                      <TouchableOpacity
                        key={mg}
                        onPress={() => draft.toggleMuscle(mg)}
                        style={{
                          paddingVertical: 4,
                          paddingHorizontal: 10,
                          borderWidth: 1,
                          borderColor: selected ? tokens.accent : tokens.border,
                          backgroundColor: selected ? tokens.accent : 'transparent',
                        }}
                        accessibilityLabel={`${label} ${selected ? 'selected' : ''}`}
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
              </ScrollView>
            </View>

            {/* Duration */}
            <View style={{ gap: 6 }}>
              <Text style={{ fontFamily: fonts.sansB, fontSize: 9, color: tokens.textMute, textTransform: 'uppercase', letterSpacing: 2 }}>
                {t('workout.estimatedDuration').toUpperCase()}
              </Text>
              <View style={{ flexDirection: 'row', gap: 4 }}>
                {DURATIONS.map((d) => {
                  const selected = draft.durationMin === d
                  return (
                    <TouchableOpacity
                      key={d}
                      onPress={() => draft.setDuration(d)}
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

            {/* Empty state */}
            <TouchableOpacity
              onPress={() => setPickerVisible(true)}
              style={{
                padding: 32,
                borderWidth: 1,
                borderStyle: 'dashed',
                borderColor: tokens.accent,
                alignItems: 'center',
                gap: 8,
              }}
              accessibilityLabel={t('workout.addExerciseCta')}
              accessibilityRole="button"
            >
              <Text style={{ fontFamily: fonts.sansX, fontSize: 28, color: tokens.accent }}>+</Text>
              <Text style={{ fontFamily: fonts.sansB, fontSize: 13, color: tokens.text, textTransform: 'uppercase' }}>
                {t('workout.noExercises')}
              </Text>
              <Text style={{ fontFamily: fonts.sans, fontSize: 12, color: tokens.textMute, textAlign: 'center' }}>
                {t('workout.noExercisesDesc')}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        ) : (
          <>
            {/* Compact form fields when exercises exist */}
            <View style={{ paddingHorizontal: 16, gap: 12, paddingBottom: 8 }}>
              <TextInput
                value={draft.name}
                onChangeText={draft.setName}
                placeholder={t('workout.sessionNamePlaceholder')}
                placeholderTextColor={tokens.textGhost}
                style={{
                  fontFamily: fonts.sansX,
                  fontSize: 20,
                  color: tokens.text,
                  borderBottomWidth: 1,
                  borderBottomColor: tokens.border,
                  paddingVertical: 6,
                }}
                accessibilityLabel={t('workout.sessionName')}
              />
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {MUSCLE_GROUPS.map((mg) => {
                    const selected = draft.muscleGroups.includes(mg)
                    const label = translateMuscleGroup(mg, t)
                    return (
                      <TouchableOpacity
                        key={mg}
                        onPress={() => draft.toggleMuscle(mg)}
                        style={{
                          paddingVertical: 4,
                          paddingHorizontal: 10,
                          borderWidth: 1,
                          borderColor: selected ? tokens.accent : tokens.border,
                          backgroundColor: selected ? tokens.accent : 'transparent',
                        }}
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
              </ScrollView>
              <View style={{ flexDirection: 'row', gap: 4 }}>
                {DURATIONS.map((d) => {
                  const selected = draft.durationMin === d
                  return (
                    <TouchableOpacity
                      key={d}
                      onPress={() => draft.setDuration(d)}
                      style={{
                        flex: 1,
                        paddingVertical: 6,
                        borderWidth: 1,
                        borderColor: selected ? tokens.accent : tokens.border,
                        backgroundColor: selected ? tokens.accent : 'transparent',
                        alignItems: 'center',
                      }}
                      accessibilityRole="button"
                    >
                      <Text style={{ fontFamily: fonts.monoB, fontSize: 11, color: selected ? '#FFFFFF' : tokens.textMute }}>
                        {d}m
                      </Text>
                    </TouchableOpacity>
                  )
                })}
              </View>
            </View>

            {/* Exercise list header */}
            <View style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
              <Text style={{ fontFamily: fonts.sansB, fontSize: 9, color: tokens.textMute, textTransform: 'uppercase', letterSpacing: 2 }}>
                {t('workout.exercises')} ({draft.exercises.length})
              </Text>
            </View>

            {/* Drag-drop exercise list */}
            <DraggableFlatList
              data={draft.exercises}
              onDragEnd={({ data }) => draft.reorderExercises(data)}
              keyExtractor={(item, i) => `${item.exerciseId}-${i}`}
              renderItem={renderExercise}
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}
              ListFooterComponent={
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
                    marginTop: 4,
                  }}
                  accessibilityLabel={t('workout.addExerciseCta')}
                  accessibilityRole="button"
                >
                  <Text style={{ fontFamily: fonts.sansX, fontSize: 20, color: tokens.accent }}>+</Text>
                  <Text style={{ fontFamily: fonts.sansB, fontSize: 13, color: tokens.accent, textTransform: 'uppercase', letterSpacing: 1 }}>
                    {t('workout.addExerciseCta')}
                  </Text>
                </TouchableOpacity>
              }
            />
          </>
        )}

        {/* Sticky save button */}
        <View style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: 16,
          backgroundColor: tokens.bg,
          borderTopWidth: 1,
          borderTopColor: tokens.border,
        }}>
          <TouchableOpacity
            onPress={handleSave}
            disabled={!canSave || isSaving}
            style={{
              backgroundColor: canSave ? tokens.accent : tokens.surface2,
              height: 48,
              alignItems: 'center',
              justifyContent: 'center',
            }}
            accessibilityLabel={isEdit ? t('workout.saveChanges') : t('workout.saveWorkout')}
            accessibilityRole="button"
          >
            <Text style={{
              fontFamily: fonts.sansX,
              fontSize: 14,
              color: canSave ? '#FFFFFF' : tokens.textMute,
              textTransform: 'uppercase',
              letterSpacing: 1,
            }}>
              {isSaving ? t('workout.saving') : isEdit ? t('workout.saveChanges') : t('workout.saveWorkout')}
            </Text>
          </TouchableOpacity>
        </View>

        <ExercisePicker
          visible={pickerVisible}
          mode="multi"
          onClose={() => setPickerVisible(false)}
          onConfirm={(picked) => {
            draft.addExercises(picked.map((p) => ({
              exerciseId: p.id,
              exerciseName: p.name,
              muscleGroups: p.muscleGroups,
              sets: 3,
              reps: 10,
              weight: 0,
              restSeconds: 90,
            })))
            setPickerVisible(false)
          }}
          excludeIds={draft.exercises.map((e) => e.exerciseId)}
          preselectedMuscles={draft.muscleGroups}
        />
      </SafeAreaView>
    </GestureHandlerRootView>
  )
}
