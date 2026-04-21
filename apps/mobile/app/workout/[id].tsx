import React, { useState, useRef } from 'react'
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, router } from 'expo-router'
import { useTheme } from '@/theme/ThemeContext'
import { trpc } from '@/lib/trpc'

export default function WorkoutDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { tokens, fonts } = useTheme()

  const utils = trpc.useUtils()
  const { data: workout, isLoading } = trpc.workouts.detail.useQuery(
    { id: id ?? '' },
    { enabled: !!id },
  )

  const [editingName, setEditingName] = useState(false)
  const [nameValue, setNameValue] = useState('')
  const nameRef = useRef<TextInput>(null)

  const updateWorkout = trpc.workouts.update.useMutation({
    onSuccess: () => utils.workouts.detail.invalidate({ id: id ?? '' }),
  })
  const reorderExercises = trpc.workouts.reorderExercises.useMutation({
    onSuccess: () => utils.workouts.detail.invalidate({ id: id ?? '' }),
  })

  type WorkoutExercise = NonNullable<typeof workout>['exercises'][number]
  const moveExercise = (exercises: WorkoutExercise[], idx: number, direction: 'up' | 'down') => {
    const next = [...exercises]
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= next.length) return
    ;[next[idx], next[swapIdx]] = [next[swapIdx]!, next[idx]!]
    reorderExercises.mutate({
      workoutTemplateId: id ?? '',
      orderedIds: next.map((e) => e.id),
    })
  }
  const deleteWorkout = trpc.workouts.delete.useMutation({
    onSuccess: () => {
      utils.workouts.list.invalidate()
      router.back()
    },
    onError: (err) => Alert.alert('Error', err.message),
  })

  const startEditName = () => {
    setNameValue(workout?.name ?? '')
    setEditingName(true)
    setTimeout(() => nameRef.current?.focus(), 50)
  }

  const saveName = () => {
    setEditingName(false)
    if (!nameValue.trim() || nameValue.trim() === workout?.name) return
    updateWorkout.mutate({ id: id ?? '', name: nameValue.trim() })
  }

  const handleDelete = () => {
    Alert.alert(
      'Delete workout',
      `Delete "${workout?.name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteWorkout.mutate({ id: id ?? '' }) },
      ],
    )
  }

  if (isLoading || !workout) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: tokens.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={tokens.accent} size="large" />
      </SafeAreaView>
    )
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
        <View style={{ flex: 1 }} />
        <TouchableOpacity
          onPress={handleDelete}
          style={{
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderWidth: 1,
            borderColor: tokens.accent,
          }}
          accessibilityLabel="Delete workout"
          accessibilityRole="button"
        >
          <Text style={{ fontFamily: fonts.sansB, fontSize: 10, color: tokens.accent, textTransform: 'uppercase', letterSpacing: 1.4 }}>
            DELETE
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 20 }}>
        {/* Name */}
        <View style={{ gap: 4 }}>
          <TouchableOpacity
            onPress={startEditName}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
            accessibilityLabel="Edit workout name"
            accessibilityRole="button"
          >
            {editingName ? (
              <TextInput
                ref={nameRef}
                value={nameValue}
                onChangeText={setNameValue}
                onBlur={saveName}
                onSubmitEditing={saveName}
                style={{
                  flex: 1,
                  fontFamily: fonts.sansX,
                  fontSize: 24,
                  color: tokens.text,
                  borderBottomWidth: 1,
                  borderBottomColor: tokens.accent,
                  paddingVertical: 2,
                  textTransform: 'uppercase',
                }}
                accessibilityLabel="Workout name input"
              />
            ) : (
              <Text style={{ fontFamily: fonts.sansX, fontSize: 24, color: tokens.text, textTransform: 'uppercase', flex: 1 }}>
                {workout.name}
              </Text>
            )}
          </TouchableOpacity>

          <Text style={{ fontFamily: fonts.mono, fontSize: 12, color: tokens.textMute }}>
            {workout.exercises.length} exercise{workout.exercises.length !== 1 ? 's' : ''} / ~{workout.estimatedDuration} min
          </Text>

          {workout.muscleGroups && workout.muscleGroups.length > 0 && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
              {workout.muscleGroups.map((mg) => (
                <View key={mg} style={{
                  borderWidth: 1,
                  borderColor: tokens.border,
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                }}>
                  <Text style={{ fontFamily: fonts.sansB, fontSize: 8, color: tokens.textMute, textTransform: 'uppercase', letterSpacing: 1 }}>
                    {mg}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Divider */}
        <View style={{ height: 1, backgroundColor: tokens.border }} />

        {/* Exercises */}
        <View style={{ gap: 0 }}>
          <Text style={{ fontFamily: fonts.sansB, fontSize: 10, color: tokens.textMute, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 12 }}>
            EXERCISES
          </Text>
          {workout.exercises.map((ex, i) => (
            <View key={ex.id} style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              paddingVertical: 10,
              borderTopWidth: i > 0 ? 1 : 0,
              borderTopColor: tokens.border,
            }}>
              <View style={{ gap: 2 }}>
                <TouchableOpacity
                  onPress={() => moveExercise(workout.exercises, i, 'up')}
                  disabled={i === 0}
                  style={{ opacity: i === 0 ? 0.2 : 1, padding: 2 }}
                  accessibilityLabel={`Move ${ex.exerciseName} up`}
                  accessibilityRole="button"
                >
                  <Text style={{ fontFamily: fonts.sansB, fontSize: 10, color: tokens.textMute }}>^</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => moveExercise(workout.exercises, i, 'down')}
                  disabled={i === workout.exercises.length - 1}
                  style={{ opacity: i === workout.exercises.length - 1 ? 0.2 : 1, padding: 2 }}
                  accessibilityLabel={`Move ${ex.exerciseName} down`}
                  accessibilityRole="button"
                >
                  <Text style={{ fontFamily: fonts.sansB, fontSize: 10, color: tokens.textMute }}>v</Text>
                </TouchableOpacity>
              </View>
              <View style={{
                width: 28, height: 28,
                borderWidth: 1,
                borderColor: tokens.accent,
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Text style={{ fontFamily: fonts.sansB, fontSize: 11, color: tokens.accent }}>
                  {i + 1}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: fonts.sansB, fontSize: 13, color: tokens.text, textTransform: 'uppercase' }}>
                  {ex.exerciseName}
                </Text>
                <Text style={{ fontFamily: fonts.mono, fontSize: 11, color: tokens.textMute }}>
                  {ex.defaultSets}s x {ex.defaultReps}r{ex.defaultWeight > 0 ? ` / ${ex.defaultWeight}kg` : ''}
                </Text>
              </View>
            </View>
          ))}
          {workout.exercises.length === 0 && (
            <Text style={{ fontFamily: fonts.sans, fontSize: 13, color: tokens.textMute }}>
              No exercises yet.
            </Text>
          )}
        </View>

        {/* Start button */}
        <TouchableOpacity
          onPress={() => router.push(`/workout/preview?templateId=${id}`)}
          style={{
            backgroundColor: tokens.accent,
            height: 48,
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: 4,
            marginBottom: 40,
          }}
          accessibilityLabel="Start this workout"
          accessibilityRole="button"
        >
          <Text style={{ fontFamily: fonts.sansX, fontSize: 14, color: '#FFFFFF', textTransform: 'uppercase', letterSpacing: 1 }}>
            START WORKOUT
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}
