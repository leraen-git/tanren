import React, { useState, useRef } from 'react'
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, router } from 'expo-router'
import { useTheme } from '@/theme/ThemeContext'
import { trpc } from '@/lib/trpc'
import { colors as tokenColors } from '@/theme/tokens'

export default function WorkoutDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { colors, typography, spacing, radius } = useTheme()

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
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.primary} size="large" />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: spacing.base, gap: spacing.md }}>
        <TouchableOpacity onPress={() => router.back()} accessibilityLabel="Go back" accessibilityRole="button">
          <Text style={{ fontFamily: typography.family.bold, fontSize: typography.size.title, color: colors.primary }}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }} />
        <TouchableOpacity
          onPress={handleDelete}
          style={{
            paddingHorizontal: spacing.sm,
            paddingVertical: spacing.xs,
            borderRadius: radius.sm,
            borderWidth: 1,
            borderColor: `${colors.danger}40`,
          }}
          accessibilityLabel="Delete workout"
          accessibilityRole="button"
        >
          <Text style={{ fontFamily: typography.family.semiBold, fontSize: typography.size.base, color: colors.danger }}>
            Delete workout
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.base, gap: spacing.lg }}>
        {/* Name with pen icon */}
        <View style={{ gap: spacing.xs }}>
          <TouchableOpacity
            onPress={startEditName}
            style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}
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
                  fontFamily: typography.family.extraBold,
                  fontSize: typography.size['2xl'],
                  color: colors.textPrimary,
                  borderBottomWidth: 2,
                  borderBottomColor: colors.primary,
                  paddingVertical: 2,
                }}
                accessibilityLabel="Workout name input"
              />
            ) : (
              <>
                <Text style={{ fontFamily: typography.family.extraBold, fontSize: typography.size['2xl'], color: colors.textPrimary, flex: 1 }}>
                  {workout.name}
                </Text>
                <Text style={{ fontSize: 18, color: colors.textMuted }}>✏️</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Meta */}
          <Text style={{ fontFamily: typography.family.regular, fontSize: typography.size.body, color: colors.textMuted }}>
            {workout.exercises.length} exercise{workout.exercises.length !== 1 ? 's' : ''} · ~{workout.estimatedDuration} min
          </Text>

          {workout.muscleGroups && workout.muscleGroups.length > 0 && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: 2 }}>
              {workout.muscleGroups.map((mg) => (
                <View key={mg} style={{
                  backgroundColor: `${colors.primary}18`,
                  borderRadius: radius.pill,
                  paddingHorizontal: spacing.sm,
                  paddingVertical: 3,
                }}>
                  <Text style={{ fontFamily: typography.family.semiBold, fontSize: typography.size.xs, color: colors.primary }}>
                    {mg}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Divider */}
        <View style={{ height: 1, backgroundColor: colors.surface2 }} />

        {/* Exercise list */}
        <View style={{ gap: spacing.md }}>
          <Text style={{ fontFamily: typography.family.bold, fontSize: typography.size.xl, color: colors.textPrimary }}>
            Exercises
          </Text>
          {workout.exercises.map((ex, i) => (
            <View key={ex.id} style={{
              backgroundColor: colors.surface,
              borderRadius: radius.lg,
              padding: spacing.base,
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.md,
            }}>
              <View style={{
                width: 32, height: 32, borderRadius: 16,
                backgroundColor: `${colors.primary}18`,
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Text style={{ fontFamily: typography.family.bold, fontSize: typography.size.base, color: colors.primary }}>
                  {i + 1}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: typography.family.semiBold, fontSize: typography.size.body, color: colors.textPrimary }}>
                  {ex.exerciseName}
                </Text>
                <Text style={{ fontFamily: typography.family.regular, fontSize: typography.size.base, color: colors.textMuted }}>
                  {ex.defaultSets} sets · {ex.defaultReps} reps{ex.defaultWeight > 0 ? ` · ${ex.defaultWeight}kg` : ''}
                </Text>
              </View>
            </View>
          ))}
          {workout.exercises.length === 0 && (
            <Text style={{ fontFamily: typography.family.regular, color: colors.textMuted }}>
              No exercises yet.
            </Text>
          )}
        </View>

        {/* Start button */}
        <TouchableOpacity
          onPress={() => router.push(`/workout/preview?templateId=${id}` as any)}
          style={{
            backgroundColor: colors.primary,
            borderRadius: radius.lg,
            paddingVertical: spacing.base,
            alignItems: 'center',
            marginTop: spacing.sm,
            marginBottom: spacing.xl,
          }}
          accessibilityLabel="Start this workout"
          accessibilityRole="button"
        >
          <Text style={{ fontFamily: typography.family.extraBold, fontSize: typography.size.xl, color: tokenColors.white }}>
            Start workout →
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}
