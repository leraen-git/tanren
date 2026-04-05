import React, { useEffect, useRef, useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useTheme } from '@/theme/ThemeContext'
import { TimerRing } from '@/components/TimerRing'
import { useActiveSessionStore } from '@/stores/activeSessionStore'
import { useTimerStore } from '@/stores/timerStore'
import { scheduleRestEndNotification, cancelRestNotification, requestNotificationPermissions } from '@/services/timerService'
import { colors as tokenColors } from '@/theme/tokens'

export default function ActiveWorkoutScreen() {
  const { colors, typography, spacing, radius } = useTheme()
  const {
    currentWorkout,
    exercises,
    currentExerciseIndex,
    currentSetIndex,
    startedAt,
    completeSet,
    updateSet,
    nextExercise,
    prevExercise,
  } = useActiveSessionStore()

  const { isRunning, secondsRemaining, totalSeconds, start, skip, addSeconds } = useTimerStore()
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [notifPermission, setNotifPermission] = useState(false)

  const currentExercise = exercises[currentExerciseIndex]

  // Request notification permissions once
  useEffect(() => {
    requestNotificationPermissions().then(setNotifPermission)
  }, [])

  // Timer tick
  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        useTimerStore.getState().tick()
      }, 1000)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [isRunning])

  if (!currentWorkout || !currentExercise) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', gap: spacing.base }}>
        <Text style={{ color: colors.textMuted, fontFamily: typography.family.regular }}>No active workout</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: colors.primary, fontFamily: typography.family.semiBold }}>Go back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    )
  }

  const sets = currentExercise.sets
  const completedSets = sets.filter((s) => s.isCompleted).length
  const allSetsCompleted = completedSets === sets.length
  const currentSet = sets[currentSetIndex]
  const isCurrentSetDone = currentSet?.isCompleted ?? false

  const totalSets = exercises.reduce((sum, ex) => sum + ex.sets.length, 0)
  const completedTotal = exercises.reduce((sum, ex) => sum + ex.sets.filter((s) => s.isCompleted).length, 0)

  const handleSetFinish = async () => {
    if (isCurrentSetDone) return
    completeSet(currentExerciseIndex, currentSetIndex)

    const restSecs = currentSet?.restSeconds ?? 90
    start(restSecs, currentExercise.exerciseName)
    if (notifPermission) {
      await scheduleRestEndNotification(restSecs, currentExercise.exerciseName)
    }
  }

  const handleSkipRest = async () => {
    skip()
    await cancelRestNotification()
  }

  const handleFinish = () => {
    Alert.alert('Finish workout?', 'This will end your current session.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Finish',
        style: 'destructive',
        onPress: () => {
          useTimerStore.getState().reset()
          router.push('/workout/recap')
        },
      },
    ])
  }

  const progress = totalSeconds > 0 ? secondsRemaining / totalSeconds : 0

  // Elapsed time
  const elapsed = startedAt ? Math.floor((Date.now() - startedAt.getTime()) / 1000) : 0
  const elapsedMins = Math.floor(elapsed / 60)
  const elapsedSecs = elapsed % 60

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header bar */}
      <View style={{
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: spacing.base, paddingVertical: spacing.sm,
        borderBottomWidth: 1, borderBottomColor: colors.surface2,
      }}>
        <TouchableOpacity onPress={() => router.back()} accessibilityLabel="Back" accessibilityRole="button">
          <Text style={{ color: colors.primary, fontFamily: typography.family.semiBold, fontSize: typography.size.body }}>← Back</Text>
        </TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ fontFamily: typography.family.bold, fontSize: typography.size.base, color: colors.textPrimary }}>
            {currentWorkout.name}
          </Text>
          <Text style={{ fontFamily: typography.family.regular, fontSize: typography.size.xs, color: colors.textMuted }}>
            {String(elapsedMins).padStart(2, '0')}:{String(elapsedSecs).padStart(2, '0')} · {completedTotal}/{totalSets} sets
          </Text>
        </View>
        <TouchableOpacity onPress={handleFinish} accessibilityLabel="Finish workout" accessibilityRole="button">
          <Text style={{ color: colors.danger, fontFamily: typography.family.semiBold, fontSize: typography.size.body }}>Finish</Text>
        </TouchableOpacity>
      </View>

      {/* Rest timer — full screen overlay */}
      {isRunning && (
        <View style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: colors.background,
          alignItems: 'center',
          justifyContent: 'center',
          gap: spacing.xl,
          zIndex: 10,
          paddingHorizontal: spacing.xl,
        }}>
          <Text style={{ fontFamily: typography.family.regular, fontSize: typography.size.body, color: colors.textMuted, letterSpacing: 2 }}>
            REST
          </Text>
          <Text style={{ fontFamily: typography.family.bold, fontSize: typography.size.title, color: colors.textMuted, textAlign: 'center' }}>
            Next: {currentExercise.exerciseName}
          </Text>

          <TimerRing progress={progress} secondsRemaining={secondsRemaining} size={260} />

          {/* ±15s adjust */}
          <View style={{ flexDirection: 'row', gap: spacing.base }}>
            <TouchableOpacity
              onPress={() => addSeconds(-15)}
              style={{ flex: 1, paddingVertical: spacing.md, borderRadius: radius.lg, backgroundColor: colors.surface2, alignItems: 'center' }}
              accessibilityLabel="Subtract 15 seconds" accessibilityRole="button"
            >
              <Text style={{ fontFamily: typography.family.bold, fontSize: typography.size.title, color: colors.textPrimary }}>−15s</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => addSeconds(15)}
              style={{ flex: 1, paddingVertical: spacing.md, borderRadius: radius.lg, backgroundColor: colors.surface2, alignItems: 'center' }}
              accessibilityLabel="Add 15 seconds" accessibilityRole="button"
            >
              <Text style={{ fontFamily: typography.family.bold, fontSize: typography.size.title, color: colors.textPrimary }}>+15s</Text>
            </TouchableOpacity>
          </View>

          {/* Big skip button */}
          <TouchableOpacity
            onPress={handleSkipRest}
            style={{ width: '100%', paddingVertical: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.primary, alignItems: 'center' }}
            accessibilityLabel="Skip rest" accessibilityRole="button"
          >
            <Text style={{ fontFamily: typography.family.extraBold, fontSize: typography.size['2xl'], color: tokenColors.white }}>
              Skip rest
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {!isRunning && (
        <ScrollView contentContainerStyle={{ padding: spacing.base, gap: spacing.base }}>
          {/* Exercise navigation */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <TouchableOpacity
              onPress={prevExercise}
              disabled={currentExerciseIndex === 0}
              style={{ padding: spacing.sm }}
              accessibilityLabel="Previous exercise" accessibilityRole="button"
            >
              <Text style={{ fontFamily: typography.family.bold, fontSize: typography.size.xl, color: currentExerciseIndex === 0 ? colors.surface2 : colors.primary }}>‹</Text>
            </TouchableOpacity>

            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={{ fontFamily: typography.family.extraBold, fontSize: typography.size['2xl'], color: colors.textPrimary, textAlign: 'center' }}>
                {currentExercise.exerciseName}
              </Text>
              <Text style={{ fontFamily: typography.family.regular, fontSize: typography.size.base, color: colors.textMuted }}>
                Exercise {currentExerciseIndex + 1} of {exercises.length}
              </Text>
            </View>

            <TouchableOpacity
              onPress={nextExercise}
              disabled={currentExerciseIndex === exercises.length - 1}
              style={{ padding: spacing.sm }}
              accessibilityLabel="Next exercise" accessibilityRole="button"
            >
              <Text style={{ fontFamily: typography.family.bold, fontSize: typography.size.xl, color: currentExerciseIndex === exercises.length - 1 ? colors.surface2 : colors.primary }}>›</Text>
            </TouchableOpacity>
          </View>

          {/* Progress dots */}
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: spacing.xs }}>
            {exercises.map((_, i) => (
              <View
                key={i}
                style={{
                  width: i === currentExerciseIndex ? 20 : 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: i === currentExerciseIndex ? colors.primary : colors.surface2,
                }}
              />
            ))}
          </View>

          {/* Sets */}
          <Text style={{ fontFamily: typography.family.bold, fontSize: typography.size.title, color: colors.textPrimary }}>
            Sets · {completedSets}/{sets.length} done
          </Text>

          {sets.map((s, idx) => {
            const isActive = idx === currentSetIndex && !s.isCompleted
            return (
              <TouchableOpacity
                key={idx}
                onPress={() => useActiveSessionStore.setState({ currentSetIndex: idx })}
                activeOpacity={0.8}
                accessibilityLabel={`Set ${idx + 1}`}
                accessibilityRole="button"
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.sm,
                  backgroundColor: s.isCompleted ? colors.surface2 : isActive ? colors.surface : colors.surface,
                  borderRadius: radius.md,
                  padding: spacing.md,
                  borderLeftWidth: 4,
                  borderLeftColor: s.isCompleted ? colors.success : isActive ? colors.primary : colors.surface2,
                }}
              >
                {/* Set number */}
                <Text style={{ width: 24, fontFamily: typography.family.bold, fontSize: typography.size.base, color: s.isCompleted ? colors.success : isActive ? colors.primary : colors.textMuted, textAlign: 'center' }}>
                  {idx + 1}
                </Text>

                {/* Reps */}
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ fontFamily: typography.family.regular, fontSize: typography.size.xs, color: colors.textMuted }}>REPS</Text>
                  <TextInput
                    value={s.reps > 0 ? String(s.reps) : ''}
                    onChangeText={(v) => updateSet(currentExerciseIndex, idx, { reps: parseInt(v) || 0 })}
                    keyboardType="number-pad"
                    placeholder={String(currentExercise.defaultReps)}
                    placeholderTextColor={colors.textMuted}
                    editable={!s.isCompleted}
                    style={{
                      backgroundColor: colors.background,
                      borderRadius: radius.sm,
                      paddingVertical: spacing.xs,
                      paddingHorizontal: spacing.sm,
                      color: colors.textPrimary,
                      fontFamily: typography.family.bold,
                      fontSize: typography.size.title,
                      textAlign: 'center',
                    }}
                    accessibilityLabel={`Set ${idx + 1} reps`}
                  />
                </View>

                {/* Weight */}
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ fontFamily: typography.family.regular, fontSize: typography.size.xs, color: colors.textMuted }}>KG</Text>
                  <TextInput
                    value={s.weight > 0 ? String(s.weight) : ''}
                    onChangeText={(v) => updateSet(currentExerciseIndex, idx, { weight: parseFloat(v) || 0 })}
                    keyboardType="decimal-pad"
                    placeholder={String(currentExercise.defaultWeight || '0')}
                    placeholderTextColor={colors.textMuted}
                    editable={!s.isCompleted}
                    style={{
                      backgroundColor: colors.background,
                      borderRadius: radius.sm,
                      paddingVertical: spacing.xs,
                      paddingHorizontal: spacing.sm,
                      color: colors.textPrimary,
                      fontFamily: typography.family.bold,
                      fontSize: typography.size.title,
                      textAlign: 'center',
                    }}
                    accessibilityLabel={`Set ${idx + 1} weight`}
                  />
                </View>

                {/* Rest */}
                <View style={{ width: 52, gap: 2 }}>
                  <Text style={{ fontFamily: typography.family.regular, fontSize: typography.size.xs, color: colors.textMuted }}>REST</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <TextInput
                      value={String(s.restSeconds)}
                      onChangeText={(v) => updateSet(currentExerciseIndex, idx, { restSeconds: parseInt(v) || 60 })}
                      keyboardType="number-pad"
                      editable={!s.isCompleted}
                      style={{
                        flex: 1,
                        backgroundColor: colors.background,
                        borderRadius: radius.sm,
                        paddingVertical: spacing.xs,
                        color: colors.textPrimary,
                        fontFamily: typography.family.semiBold,
                        fontSize: typography.size.xs,
                        textAlign: 'center',
                      }}
                      accessibilityLabel={`Set ${idx + 1} rest seconds`}
                    />
                    <Text style={{ fontFamily: typography.family.regular, fontSize: typography.size.xs, color: colors.textMuted }}>s</Text>
                  </View>
                </View>

                {/* Status indicator */}
                <View style={{
                  width: 32, height: 32, borderRadius: 16,
                  backgroundColor: s.isCompleted ? colors.success : colors.surface2,
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Text style={{ color: s.isCompleted ? tokenColors.white : colors.textMuted, fontSize: 16 }}>
                    {s.isCompleted ? '✓' : '○'}
                  </Text>
                </View>
              </TouchableOpacity>
            )
          })}

          {/* SET FINISH button */}
          {!allSetsCompleted && (
            <TouchableOpacity
              onPress={handleSetFinish}
              disabled={isCurrentSetDone}
              style={{
                backgroundColor: isCurrentSetDone ? colors.surface2 : colors.primary,
                borderRadius: radius.lg,
                paddingVertical: spacing.lg,
                alignItems: 'center',
                marginTop: spacing.sm,
                opacity: isCurrentSetDone ? 0.5 : 1,
              }}
              accessibilityLabel={`Complete set ${currentSetIndex + 1}`}
              accessibilityRole="button"
            >
              <Text style={{ fontFamily: typography.family.extraBold, fontSize: typography.size.xl, color: tokenColors.white }}>
                Set {currentSetIndex + 1} — Done ✓
              </Text>
              <Text style={{ fontFamily: typography.family.regular, fontSize: typography.size.base, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>
                Starts rest timer
              </Text>
            </TouchableOpacity>
          )}

          {allSetsCompleted && currentExerciseIndex < exercises.length - 1 && (
            <TouchableOpacity
              onPress={nextExercise}
              style={{ backgroundColor: colors.primary, borderRadius: radius.lg, paddingVertical: spacing.lg, alignItems: 'center', marginTop: spacing.sm }}
              accessibilityLabel="Next exercise" accessibilityRole="button"
            >
              <Text style={{ fontFamily: typography.family.extraBold, fontSize: typography.size.xl, color: tokenColors.white }}>
                Next exercise →
              </Text>
            </TouchableOpacity>
          )}

          {allSetsCompleted && currentExerciseIndex === exercises.length - 1 && (
            <TouchableOpacity
              onPress={handleFinish}
              style={{ backgroundColor: colors.success, borderRadius: radius.lg, paddingVertical: spacing.lg, alignItems: 'center', marginTop: spacing.sm }}
              accessibilityLabel="Finish workout" accessibilityRole="button"
            >
              <Text style={{ fontFamily: typography.family.extraBold, fontSize: typography.size.xl, color: tokenColors.white }}>
                Finish workout 🎉
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  )
}
