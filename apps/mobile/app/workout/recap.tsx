import React, { useEffect, useRef, useState, useMemo } from 'react'
import { View, Text, ScrollView, ActivityIndicator, Alert, Modal, TouchableOpacity, TextInput } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useTheme } from '@/theme/ThemeContext'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { useActiveSessionStore } from '@/stores/activeSessionStore'
import { calcSessionVolume } from '@fittrack/shared'
import { trpc } from '@/lib/trpc'
import { colors as tokenColors } from '@/theme/tokens'

const MUSCLE_GROUPS = ['All', 'Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Quadriceps', 'Hamstrings', 'Glutes', 'Calves', 'Core', 'Full Body']

export default function RecapScreen() {
  const { colors, typography, spacing, radius } = useTheme()
  const { exercises, currentWorkout, isQuickSession, startedAt, finishSession, addExercise } = useActiveSessionStore()
  const savedRef = useRef(false)
  const [pickerVisible, setPickerVisible] = useState(false)
  const [search, setSearch] = useState('')
  const [muscle, setMuscle] = useState('All')

  const { data: allExercises } = trpc.exercises.list.useQuery()

  const alreadyAdded = exercises.map((e) => e.exerciseId)

  const filteredExercises = useMemo(() => {
    if (!allExercises) return []
    return allExercises.filter((ex) => {
      const matchSearch = ex.name.toLowerCase().includes(search.toLowerCase())
      const matchMuscle = muscle === 'All' || ex.muscleGroups.includes(muscle)
      return matchSearch && matchMuscle
    })
  }, [allExercises, search, muscle])

  const totalVolume = calcSessionVolume(
    exercises.map((ex) => ({
      sets: ex.sets.map((s) => ({ reps: s.reps, weight: s.weight, isCompleted: s.isCompleted })),
    })),
  )

  const allSets = exercises.flatMap((ex) => ex.sets)
  const completedSets = allSets.filter((s) => s.isCompleted).length
  const durationSeconds = startedAt ? Math.floor((Date.now() - startedAt.getTime()) / 1000) : 0
  const durationMins = Math.floor(durationSeconds / 60)

  const [savedPRCount, setSavedPRCount] = useState(0)
  const saveSession = trpc.sessions.save.useMutation()
  const saveQuick = trpc.sessions.saveQuick.useMutation()
  const utils = trpc.useUtils()

  useEffect(() => {
    if (savedRef.current || !currentWorkout || !startedAt) return
    savedRef.current = true

    const onError = (err: { message: string }) => Alert.alert('Save failed', err.message)
    const invalidate = () => {
      utils.sessions.history.invalidate()
      utils.plans.active.invalidate()
    }

    if (isQuickSession && exercises[0]) {
      const ex = exercises[0]
      saveQuick.mutate(
        {
          exerciseId: ex.exerciseId,
          exerciseName: ex.exerciseName,
          muscleGroups: [],
          startedAt: startedAt.toISOString(),
          durationSeconds,
          sets: ex.sets.map((s, i) => ({
            setNumber: i + 1,
            reps: s.reps,
            weight: s.weight,
            restSeconds: s.restSeconds,
            isCompleted: s.isCompleted,
          })),
        },
        { onSuccess: invalidate, onError },
      )
    } else {
      saveSession.mutate(
        {
          workoutTemplateId: currentWorkout.id,
          startedAt: startedAt.toISOString(),
          durationSeconds,
          exercises: exercises.map((ex, order) => ({
            exerciseId: ex.exerciseId,
            order,
            sets: ex.sets.map((s, i) => ({
              setNumber: i + 1,
              reps: s.reps,
              weight: s.weight,
              restSeconds: s.restSeconds,
              isCompleted: s.isCompleted,
            })),
          })),
        },
        {
          onSuccess: (data) => { setSavedPRCount(data.newPRCount ?? 0); invalidate() },
          onError,
        },
      )
    }
  }, [])

  const handlePickExercise = (ex: { id: string; name: string }) => {
    addExercise({
      exerciseId: ex.id,
      exerciseName: ex.name,
      defaultSets: 3,
      defaultReps: 10,
      defaultWeight: 0,
      defaultRestSeconds: 90,
    })
    setPickerVisible(false)
    router.back() // back to active screen
  }

  const handleDone = async () => {
    // Wait for session save before navigating so home screen refetch sees updated data
    if (saveSession.isPending) {
      await new Promise<void>((resolve) => {
        const check = setInterval(() => {
          if (!saveSession.isPending) { clearInterval(check); resolve() }
        }, 50)
      })
    }
    await utils.plans.active.invalidate()
    finishSession()
    router.replace('/' as any)
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ padding: spacing.base, gap: spacing.base }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ fontFamily: typography.family.extraBold, fontSize: typography.size['2xl'], color: colors.textPrimary }}>
            Session recap 🎉
          </Text>
          {saveSession.isPending && <ActivityIndicator color={colors.primary} />}
          {saveSession.isSuccess && (
            <Text style={{ fontFamily: typography.family.semiBold, fontSize: typography.size.base, color: colors.success }}>
              ✓ Saved
            </Text>
          )}
        </View>

        {/* Summary cards */}
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <Card style={{ flex: 1 }} accessibilityLabel="Total volume">
            <Text style={{ fontFamily: typography.family.regular, fontSize: typography.size.xs, color: colors.textMuted }}>VOLUME</Text>
            <Text style={{ fontFamily: typography.family.extraBold, fontSize: typography.size['2xl'], color: colors.primary }}>
              {totalVolume.toLocaleString()}
            </Text>
            <Text style={{ fontFamily: typography.family.regular, fontSize: typography.size.xs, color: colors.textMuted }}>kg</Text>
          </Card>
          <Card style={{ flex: 1 }} accessibilityLabel="Sets completed">
            <Text style={{ fontFamily: typography.family.regular, fontSize: typography.size.xs, color: colors.textMuted }}>SETS</Text>
            <Text style={{ fontFamily: typography.family.extraBold, fontSize: typography.size['2xl'], color: colors.textPrimary }}>
              {completedSets}
            </Text>
            <Text style={{ fontFamily: typography.family.regular, fontSize: typography.size.xs, color: colors.textMuted }}>completed</Text>
          </Card>
          <Card style={{ flex: 1 }} accessibilityLabel="Duration">
            <Text style={{ fontFamily: typography.family.regular, fontSize: typography.size.xs, color: colors.textMuted }}>TIME</Text>
            <Text style={{ fontFamily: typography.family.extraBold, fontSize: typography.size['2xl'], color: colors.textPrimary }}>
              {durationMins}
            </Text>
            <Text style={{ fontFamily: typography.family.regular, fontSize: typography.size.xs, color: colors.textMuted }}>min</Text>
          </Card>
        </View>

        {/* Per-exercise breakdown */}
        {exercises.map((ex) => {
          const exCompleted = ex.sets.filter((s) => s.isCompleted)
          const exVolume = exCompleted.reduce((sum, s) => sum + s.reps * s.weight, 0)
          return (
            <Card key={ex.exerciseId} accessibilityLabel={`${ex.exerciseName} summary`}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontFamily: typography.family.bold, fontSize: typography.size.body, color: colors.textPrimary, flex: 1 }}>
                  {ex.exerciseName}
                </Text>
                <Text style={{ fontFamily: typography.family.semiBold, fontSize: typography.size.base, color: colors.textMuted }}>
                  {exCompleted.length}/{ex.sets.length} sets
                </Text>
              </View>
              {exCompleted.length > 0 && (
                <Text style={{ fontFamily: typography.family.regular, fontSize: typography.size.base, color: colors.textMuted, marginTop: 4 }}>
                  {exCompleted.map((s) => `${s.reps}×${s.weight}kg`).join('  ·  ')}
                </Text>
              )}
              {exVolume > 0 && (
                <Text style={{ fontFamily: typography.family.semiBold, fontSize: typography.size.base, color: colors.primary, marginTop: 4 }}>
                  {exVolume.toLocaleString()} kg total
                </Text>
              )}
            </Card>
          )
        })}

        <Button label="Done" onPress={handleDone} />
        <Button
          label="📲 Share session"
          variant="secondary"
          onPress={() => router.push({
            pathname: '/workout/share' as any,
            params: {
              workoutName: currentWorkout?.name ?? '',
              durationMins: String(durationMins),
              totalVolume: String(totalVolume),
              completedSets: String(completedSets),
              prCount: String(savedPRCount),
            },
          })}
        />
        <Button label="+ Keep training" variant="secondary" onPress={() => setPickerVisible(true)} />
      </ScrollView>

      {/* Exercise picker modal */}
      <Modal visible={pickerVisible} animationType="slide" onRequestClose={() => setPickerVisible(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', padding: spacing.base, gap: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.surface2 }}>
            <TouchableOpacity onPress={() => setPickerVisible(false)} accessibilityLabel="Close" accessibilityRole="button">
              <Text style={{ fontFamily: typography.family.bold, fontSize: typography.size.title, color: colors.primary }}>✕</Text>
            </TouchableOpacity>
            <Text style={{ fontFamily: typography.family.extraBold, fontSize: typography.size.xl, color: colors.textPrimary, flex: 1 }}>
              Add exercise
            </Text>
          </View>

          {/* Search */}
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

            {/* Muscle filter */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                {MUSCLE_GROUPS.map((mg) => (
                  <TouchableOpacity
                    key={mg}
                    onPress={() => setMuscle(mg)}
                    style={{
                      paddingVertical: spacing.xs,
                      paddingHorizontal: spacing.md,
                      borderRadius: radius.pill,
                      backgroundColor: muscle === mg ? colors.primary : colors.surface2,
                    }}
                    accessibilityLabel={`Filter by ${mg}`}
                    accessibilityRole="button"
                  >
                    <Text style={{
                      fontFamily: muscle === mg ? typography.family.semiBold : typography.family.regular,
                      fontSize: typography.size.base,
                      color: muscle === mg ? tokenColors.white : colors.textMuted,
                    }}>
                      {mg}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Results */}
          <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.base, gap: spacing.sm, paddingBottom: spacing.xl }}>
            {filteredExercises.map((ex) => {
              const added = alreadyAdded.includes(ex.id)
              return (
                <TouchableOpacity
                  key={ex.id}
                  onPress={() => { if (!added) handlePickExercise(ex) }}
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
                      {ex.muscleGroups.join(' · ')} · {ex.difficulty}
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
    </SafeAreaView>
  )
}
