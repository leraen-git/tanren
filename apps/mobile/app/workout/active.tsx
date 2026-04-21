import React, { useEffect } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  AppState,
  type AppStateStatus,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake'
import * as FileSystem from 'expo-file-system'
import { useTheme } from '@/theme/ThemeContext'
import { TimerRing } from '@/components/TimerRing'
import { useActiveSessionStore } from '@/stores/activeSessionStore'
import { useTimerStore, timerStore } from '@/stores/timerStore'
import { scheduleRestEndNotification, cancelRestNotification } from '@/services/timerService'
import { MusicControlBar } from '@/components/MusicControlBar'
import { useWorkletTimer } from '@/hooks/useWorkletTimer'
import { useTranslation } from 'react-i18next'

const WAKE_LOCK_TAG = 'active-workout'
const HEARTBEAT_FILE = FileSystem.documentDirectory + 'session-heartbeat.json'
const HEARTBEAT_INTERVAL_MS = 30_000
const DEFAULT_REST_SECONDS = 90

export default function ActiveWorkoutScreen() {
  const { tokens, fonts } = useTheme()
  const { t } = useTranslation()
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

  const isRunning = useTimerStore((s) => s.isRunning)
  const secondsRemaining = useTimerStore((s) => s.secondsRemaining)
  const totalSeconds = useTimerStore((s) => s.totalSeconds)
  const start = useTimerStore((s) => s.start)
  const skip = useTimerStore((s) => s.skip)
  const pauseTimer = useTimerStore((s) => s.pause)
  const addSeconds = useTimerStore((s) => s.addSeconds)
  useWorkletTimer()

  const currentExercise = exercises[currentExerciseIndex]

  useEffect(() => {
    let appStateSubscription: ReturnType<typeof AppState.addEventListener>
    const activate = () => activateKeepAwakeAsync(WAKE_LOCK_TAG)
    const deactivate = () => deactivateKeepAwake(WAKE_LOCK_TAG)
    activate()
    appStateSubscription = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') activate()
      else deactivate()
    })
    return () => {
      deactivate()
      appStateSubscription.remove()
    }
  }, [])

  useEffect(() => {
    if (!currentWorkout || !startedAt) return
    const write = () => {
      FileSystem.writeAsStringAsync(
        HEARTBEAT_FILE,
        JSON.stringify({
          workoutId: currentWorkout.id,
          workoutName: currentWorkout.name,
          startedAt: startedAt.toISOString(),
          lastPulse: new Date().toISOString(),
        }),
        { encoding: FileSystem.EncodingType.UTF8 },
      ).catch(() => null)
    }
    write()
    const interval = setInterval(write, HEARTBEAT_INTERVAL_MS)
    return () => {
      clearInterval(interval)
      FileSystem.deleteAsync(HEARTBEAT_FILE, { idempotent: true }).catch(() => null)
    }
  }, [currentWorkout, startedAt])

  if (!currentWorkout || !currentExercise) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: tokens.bg, alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <Text style={{ color: tokens.textMute, fontFamily: fonts.sans }}>{t('workout.noActiveWorkout')}</Text>
        <TouchableOpacity onPress={() => router.back()} accessibilityLabel={t('common.back')} accessibilityRole="button">
          <Text style={{ color: tokens.accent, fontFamily: fonts.sansM }}>{t('common.back')}</Text>
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
    const restSecs = currentSet?.restSeconds ?? DEFAULT_REST_SECONDS
    start(restSecs, currentExercise.exerciseName)
    await scheduleRestEndNotification(restSecs, currentExercise.exerciseName)
  }

  const handleSkipRest = async () => {
    skip()
    await cancelRestNotification()
  }

  const handleFinish = () => {
    Alert.alert(t('workout.finishTitle'), t('workout.finishMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.finish'),
        style: 'destructive',
        onPress: () => {
          timerStore.getState().reset()
          FileSystem.deleteAsync(HEARTBEAT_FILE, { idempotent: true }).catch(() => null)
          router.push('/workout/recap')
        },
      },
    ])
  }

  const progress = totalSeconds > 0 ? secondsRemaining / totalSeconds : 0

  const elapsed = startedAt ? Math.floor((Date.now() - startedAt.getTime()) / 1000) : 0
  const elapsedMins = Math.floor(elapsed / 60)
  const elapsedSecs = elapsed % 60

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: tokens.bg }}>
      {/* Header bar */}
      <View style={{
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingVertical: 8,
        borderBottomWidth: 1, borderBottomColor: tokens.border,
      }}>
        <TouchableOpacity onPress={() => router.back()} accessibilityLabel={t('common.back')} accessibilityRole="button">
          <Text style={{
            fontFamily: fonts.sansM,
            fontSize: 12,
            color: tokens.textMute,
            textTransform: 'uppercase',
            letterSpacing: 1,
          }}>
            {'‹ '}{t('common.back')}
          </Text>
        </TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ fontFamily: fonts.sansB, fontSize: 12, color: tokens.text, textTransform: 'uppercase', letterSpacing: 0.3 }}>
            {currentWorkout.name}
          </Text>
          <Text style={{ fontFamily: fonts.mono, fontSize: 10, color: tokens.textMute }}>
            {String(elapsedMins).padStart(2, '0')}:{String(elapsedSecs).padStart(2, '0')} · {completedTotal}/{totalSets}
          </Text>
        </View>
        <TouchableOpacity onPress={handleFinish} accessibilityLabel={t('workout.finishTitle')} accessibilityRole="button">
          <Text style={{
            fontFamily: fonts.sansB,
            fontSize: 12,
            color: tokens.accent,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
          }}>
            {t('common.finish')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Rest timer overlay */}
      {isRunning && (
        <View style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: tokens.bg,
          alignItems: 'center',
          justifyContent: 'center',
          gap: 20,
          zIndex: 10,
          paddingHorizontal: 20,
        }}>
          <Text style={{
            fontFamily: fonts.sansM,
            fontSize: 10,
            letterSpacing: 1.6,
            textTransform: 'uppercase',
            color: tokens.textMute,
          }}>
            {currentExercise.exerciseName}
          </Text>

          <TimerRing progress={progress} secondsRemaining={secondsRemaining} totalSeconds={totalSeconds} size={240} />

          <View style={{ flexDirection: 'row', gap: 8, width: '100%' }}>
            <TouchableOpacity
              onPress={() => addSeconds(-15)}
              style={{ flex: 1, height: 52, borderWidth: 1, borderColor: tokens.border, alignItems: 'center', justifyContent: 'center' }}
              accessibilityLabel={t('workout.subtract15')} accessibilityRole="button"
            >
              <Text style={{ fontFamily: fonts.sansB, fontSize: 16, color: tokens.text }}>-15s</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => addSeconds(15)}
              style={{ flex: 1, height: 52, borderWidth: 1, borderColor: tokens.border, alignItems: 'center', justifyContent: 'center' }}
              accessibilityLabel={t('workout.add15')} accessibilityRole="button"
            >
              <Text style={{ fontFamily: fonts.sansB, fontSize: 16, color: tokens.text }}>+15s</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={pauseTimer}
              style={{ width: 48, height: 52, borderWidth: 1, borderColor: tokens.border, alignItems: 'center', justifyContent: 'center' }}
              accessibilityLabel={t('workout.pause')} accessibilityRole="button"
            >
              <Text style={{ fontFamily: fonts.sans, fontSize: 13, color: tokens.textMute }}>II</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={handleSkipRest}
            style={{ width: '100%', height: 52, backgroundColor: tokens.accent, alignItems: 'center', justifyContent: 'center' }}
            accessibilityLabel={t('workout.skip')} accessibilityRole="button"
          >
            <Text style={{ fontFamily: fonts.sansB, fontSize: 15, letterSpacing: 0.6, textTransform: 'uppercase', color: '#FFFFFF' }}>
              {t('workout.skip')}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <MusicControlBar />

      {!isRunning && (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
          {/* Exercise navigation */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TouchableOpacity
              onPress={prevExercise}
              disabled={currentExerciseIndex === 0}
              style={{ padding: 8 }}
              accessibilityLabel={t('workout.prevExercise')} accessibilityRole="button"
            >
              <Text style={{
                fontFamily: fonts.sansB,
                fontSize: 20,
                color: currentExerciseIndex === 0 ? tokens.border : tokens.accent,
              }}>‹</Text>
            </TouchableOpacity>

            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={{
                fontFamily: fonts.sansX,
                fontSize: 24,
                color: tokens.text,
                textAlign: 'center',
                textTransform: 'uppercase',
                letterSpacing: 0.5,
              }}>
                {currentExercise.exerciseName}
              </Text>
              <Text style={{ fontFamily: fonts.sans, fontSize: 12, color: tokens.textMute }}>
                {currentExerciseIndex + 1} / {exercises.length}
              </Text>
            </View>

            <TouchableOpacity
              onPress={nextExercise}
              disabled={currentExerciseIndex === exercises.length - 1}
              style={{ padding: 8 }}
              accessibilityLabel={t('workout.nextExercise')} accessibilityRole="button"
            >
              <Text style={{
                fontFamily: fonts.sansB,
                fontSize: 20,
                color: currentExerciseIndex === exercises.length - 1 ? tokens.border : tokens.accent,
              }}>›</Text>
            </TouchableOpacity>
          </View>

          {/* Progress dots */}
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 4 }}>
            {exercises.map((_, i) => (
              <View
                key={i}
                style={{
                  width: i === currentExerciseIndex ? 20 : 8,
                  height: 3,
                  backgroundColor: i === currentExerciseIndex ? tokens.accent : tokens.border,
                }}
              />
            ))}
          </View>

          {/* Sets header */}
          <Text style={{
            fontFamily: fonts.sansB,
            fontSize: 10,
            letterSpacing: 3,
            color: tokens.textMute,
            textTransform: 'uppercase',
          }}>
            {t('common.sets')} · {completedSets}/{sets.length}
          </Text>

          {/* Set rows */}
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
                  gap: 8,
                  padding: 12,
                  borderWidth: 1,
                  borderColor: s.isCompleted ? tokens.green : isActive ? tokens.accent : tokens.border,
                  borderLeftWidth: 3,
                  borderLeftColor: s.isCompleted ? tokens.green : isActive ? tokens.accent : tokens.border,
                }}
              >
                <Text style={{
                  width: 24,
                  fontFamily: fonts.sansB,
                  fontSize: 12,
                  color: s.isCompleted ? tokens.green : isActive ? tokens.accent : tokens.textMute,
                  textAlign: 'center',
                }}>
                  {idx + 1}
                </Text>

                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ fontFamily: fonts.sansB, fontSize: 9, letterSpacing: 1, color: tokens.textGhost, textTransform: 'uppercase' }}>REPS</Text>
                  <TextInput
                    value={s.reps > 0 ? String(s.reps) : ''}
                    onChangeText={(v) => updateSet(currentExerciseIndex, idx, { reps: parseInt(v) || 0 })}
                    keyboardType="number-pad"
                    placeholder={String(currentExercise.lastReps ?? currentExercise.defaultReps)}
                    placeholderTextColor={tokens.textGhost}
                    editable={!s.isCompleted}
                    style={{
                      borderBottomWidth: 1,
                      borderBottomColor: tokens.border,
                      paddingVertical: 4,
                      color: tokens.text,
                      fontFamily: fonts.monoB,
                      fontSize: 32,
                      textAlign: 'center',
                    }}
                    accessibilityLabel={`Set ${idx + 1} reps`}
                  />
                </View>

                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ fontFamily: fonts.sansB, fontSize: 9, letterSpacing: 1, color: tokens.textGhost, textTransform: 'uppercase' }}>KG</Text>
                  <TextInput
                    value={s.weight > 0 ? String(s.weight) : ''}
                    onChangeText={(v) => updateSet(currentExerciseIndex, idx, { weight: parseFloat(v) || 0 })}
                    keyboardType="decimal-pad"
                    placeholder={String((currentExercise.lastWeight ?? currentExercise.defaultWeight) || '0')}
                    placeholderTextColor={tokens.textGhost}
                    editable={!s.isCompleted}
                    style={{
                      borderBottomWidth: 1,
                      borderBottomColor: tokens.border,
                      paddingVertical: 4,
                      color: tokens.text,
                      fontFamily: fonts.monoB,
                      fontSize: 32,
                      textAlign: 'center',
                    }}
                    accessibilityLabel={`Set ${idx + 1} weight`}
                  />
                </View>

                <View style={{ width: 52, gap: 2 }}>
                  <Text style={{ fontFamily: fonts.sansB, fontSize: 9, letterSpacing: 1, color: tokens.textGhost, textTransform: 'uppercase' }}>REST</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <TextInput
                      value={String(s.restSeconds)}
                      onChangeText={(v) => updateSet(currentExerciseIndex, idx, { restSeconds: parseInt(v) || 60 })}
                      keyboardType="number-pad"
                      editable={!s.isCompleted}
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
                      accessibilityLabel={`Set ${idx + 1} rest seconds`}
                    />
                    <Text style={{ fontFamily: fonts.sans, fontSize: 10, color: tokens.textGhost }}>s</Text>
                  </View>
                </View>

                <View style={{
                  width: 28, height: 28,
                  backgroundColor: s.isCompleted ? tokens.green : tokens.surface2,
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Text style={{
                    fontFamily: fonts.sansB,
                    color: s.isCompleted ? '#FFFFFF' : tokens.textMute,
                    fontSize: 12,
                  }}>
                    {s.isCompleted ? '✓' : ''}
                  </Text>
                </View>
              </TouchableOpacity>
            )
          })}

          {/* Validate set button */}
          {!allSetsCompleted && (
            <TouchableOpacity
              onPress={handleSetFinish}
              disabled={isCurrentSetDone}
              style={{
                backgroundColor: isCurrentSetDone ? tokens.surface2 : tokens.accent,
                paddingVertical: 16,
                alignItems: 'center',
                marginTop: 8,
                opacity: isCurrentSetDone ? 0.5 : 1,
              }}
              accessibilityLabel={`${t('workout.validateSet')} ${currentSetIndex + 1}`}
              accessibilityRole="button"
            >
              <Text style={{ fontFamily: fonts.sansX, fontSize: 20, color: '#FFFFFF', textTransform: 'uppercase', letterSpacing: 1 }}>
                {t('workout.validateSet')} {currentSetIndex + 1}
              </Text>
            </TouchableOpacity>
          )}

          {allSetsCompleted && currentExerciseIndex < exercises.length - 1 && (
            <TouchableOpacity
              onPress={nextExercise}
              style={{ backgroundColor: tokens.accent, paddingVertical: 16, alignItems: 'center', marginTop: 8 }}
              accessibilityLabel={t('workout.nextExercise')} accessibilityRole="button"
            >
              <Text style={{ fontFamily: fonts.sansX, fontSize: 20, color: '#FFFFFF', textTransform: 'uppercase', letterSpacing: 1 }}>
                {t('workout.nextExercise')} →
              </Text>
            </TouchableOpacity>
          )}

          {allSetsCompleted && currentExerciseIndex === exercises.length - 1 && (
            <TouchableOpacity
              onPress={handleFinish}
              style={{ backgroundColor: tokens.green, paddingVertical: 16, alignItems: 'center', marginTop: 8 }}
              accessibilityLabel={t('workout.finishTitle')} accessibilityRole="button"
            >
              <Text style={{ fontFamily: fonts.sansX, fontSize: 20, color: '#FFFFFF', textTransform: 'uppercase', letterSpacing: 1 }}>
                {t('workout.finishTitle')}
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  )
}
