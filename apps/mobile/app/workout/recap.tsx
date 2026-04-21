import React, { useEffect, useRef, useState, useMemo } from 'react'
import { View, Text, ScrollView, ActivityIndicator, Alert, Modal, TouchableOpacity, TextInput } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useTheme } from '@/theme/ThemeContext'
import { Button } from '@/components/Button'
import { useActiveSessionStore } from '@/stores/activeSessionStore'
import { calcSessionVolume } from '@tanren/shared'
import { trpc } from '@/lib/trpc'
import { useTranslation } from 'react-i18next'
import { useExercises, translateMuscleGroup, translateDifficulty } from '@/hooks/useExercises'

const MUSCLE_GROUPS = ['All', 'Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Quadriceps', 'Hamstrings', 'Glutes', 'Calves', 'Core', 'Full Body']

export default function RecapScreen() {
  const { tokens, fonts } = useTheme()
  const { exercises, currentWorkout, isQuickSession, startedAt, finishSession, addExercise } = useActiveSessionStore()
  const savedRef = useRef(false)
  const [pickerVisible, setPickerVisible] = useState(false)
  const [search, setSearch] = useState('')
  const [muscle, setMuscle] = useState('All')

  const { t } = useTranslation()
  const { data: allExercises } = useExercises()

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
  const durationH = Math.floor(durationMins / 60)
  const durationM = durationMins % 60

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
    router.back()
  }

  const handleDone = async () => {
    if (saveSession.isPending) {
      await new Promise<void>((resolve) => {
        const check = setInterval(() => {
          if (!saveSession.isPending) { clearInterval(check); resolve() }
        }, 50)
      })
    }
    await utils.plans.active.invalidate()
    finishSession()
    router.replace('/')
  }

  const dateDisplay = new Date().toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })
  const durationLabel = durationH > 0 ? `${durationH}h${String(durationM).padStart(2, '0')}` : `${durationMins}min`

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: tokens.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        {/* Header: kanji stamp + title + date */}
        <View style={{ alignItems: 'center', paddingTop: 24, paddingBottom: 32 }}>
          <Text style={{
            fontFamily: fonts.jpX,
            fontSize: 20,
            color: tokens.accent,
            letterSpacing: 4,
            marginBottom: 8,
          }}>
            鍛 錬
          </Text>
          <Text style={{
            fontFamily: fonts.sansX,
            fontSize: 24,
            letterSpacing: 1,
            textTransform: 'uppercase',
            textAlign: 'center',
            lineHeight: 26,
            color: tokens.text,
          }}>
            {t('recap.title')}
          </Text>
          <Text style={{
            fontFamily: fonts.sansM,
            fontSize: 11,
            letterSpacing: 1.6,
            color: tokens.textMute,
            textTransform: 'uppercase',
            marginTop: 6,
          }}>
            {dateDisplay} · {currentWorkout?.name ?? ''} · {durationLabel}
          </Text>
          {saveSession.isPending && <ActivityIndicator color={tokens.accent} style={{ marginTop: 8 }} />}
        </View>

        {/* 2x2 stat grid */}
        <View style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          marginHorizontal: 16,
          marginBottom: 24,
          borderWidth: 1,
          borderColor: tokens.border,
        }}>
          {[
            { label: t('share.volume'), value: totalVolume.toLocaleString('fr-FR'), unit: 'kg' },
            { label: t('recap.duration'), value: durationH > 0 ? `${durationH}:${String(durationM).padStart(2, '0')}` : String(durationMins), unit: durationH > 0 ? 'h' : 'min' },
            { label: t('share.sets'), value: String(completedSets) },
            { label: t('share.records'), value: String(savedPRCount), isPR: true },
          ].map((stat, i) => (
            <View
              key={stat.label}
              style={{
                width: '50%',
                padding: 18,
                backgroundColor: tokens.bg,
                borderTopWidth: i >= 2 ? 1 : 0,
                borderLeftWidth: i % 2 === 1 ? 1 : 0,
                borderColor: tokens.border,
              }}
            >
              <Text style={{
                fontFamily: fonts.sansB,
                fontSize: 9,
                letterSpacing: 3,
                color: tokens.textMute,
                textTransform: 'uppercase',
                marginBottom: 6,
              }}>
                {stat.label}
              </Text>
              <Text style={{
                fontFamily: fonts.sansX,
                fontSize: 28,
                lineHeight: 28,
                color: stat.isPR ? tokens.accent : tokens.text,
              }}>
                {stat.value}
                {stat.unit && (
                  <Text style={{
                    fontFamily: fonts.sansM,
                    fontSize: 13,
                    color: tokens.textMute,
                  }}>
                    {' '}{stat.unit}
                  </Text>
                )}
              </Text>
            </View>
          ))}
        </View>

        {/* PR highlight (if any) */}
        {savedPRCount > 0 && (
          <View style={{
            marginHorizontal: 16,
            marginBottom: 20,
            padding: 14,
            borderWidth: 1,
            borderColor: tokens.accent,
            backgroundColor: 'rgba(255,45,63,0.06)',
            position: 'relative',
          }}>
            <View style={{
              position: 'absolute',
              top: -9,
              left: 14,
              backgroundColor: tokens.accent,
              paddingVertical: 2,
              paddingHorizontal: 8,
            }}>
              <Text style={{
                fontFamily: fonts.sansB,
                fontSize: 9,
                letterSpacing: 3,
                color: '#FFFFFF',
              }}>
                NEW PR
              </Text>
            </View>
            <Text style={{
              fontFamily: fonts.sansB,
              fontSize: 13,
              letterSpacing: 0.5,
              textTransform: 'uppercase',
              color: tokens.text,
              marginTop: 4,
            }}>
              {savedPRCount} {savedPRCount > 1 ? t('share.newPRs', { count: savedPRCount }) : t('share.newPR', { count: savedPRCount })}
            </Text>
          </View>
        )}

        {/* Per-exercise comparison */}
        <View style={{ marginHorizontal: 16, marginBottom: 20 }}>
          <Text style={{
            fontFamily: fonts.sansB,
            fontSize: 10,
            letterSpacing: 3,
            color: tokens.textMute,
            textTransform: 'uppercase',
            marginBottom: 12,
          }}>
            {t('recap.exerciseComparison')}
          </Text>
          {exercises.map((ex) => {
            const exCompleted = ex.sets.filter((s) => s.isCompleted)
            const exVolume = exCompleted.reduce((sum, s) => sum + s.reps * s.weight, 0)
            return (
              <View
                key={ex.exerciseId}
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingVertical: 12,
                  borderTopWidth: 1,
                  borderTopColor: tokens.border,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{
                    fontFamily: fonts.sansM,
                    fontSize: 13,
                    letterSpacing: 0.3,
                    color: tokens.text,
                  }}>
                    {ex.exerciseName}
                  </Text>
                  <Text style={{
                    fontFamily: fonts.sans,
                    fontSize: 11,
                    color: tokens.textMute,
                    marginTop: 2,
                  }}>
                    {exCompleted.length}/{ex.sets.length} {t('common.sets')} · {exVolume.toLocaleString('fr-FR')} kg
                  </Text>
                </View>
                {exCompleted.length > 0 && (
                  <Text style={{
                    fontFamily: fonts.mono,
                    fontSize: 11,
                    color: tokens.textDim,
                  }}>
                    {exCompleted.map((s) => `${s.reps}x${s.weight}`).join(' · ')}
                  </Text>
                )}
              </View>
            )
          })}
          {exercises.length > 0 && (
            <View style={{ borderTopWidth: 1, borderTopColor: tokens.border }} />
          )}
        </View>

        {/* Action buttons */}
        <View style={{ paddingHorizontal: 16, gap: 6 }}>
          <Button
            label={t('recap.saveAndShare')}
            onPress={() => router.push({
              pathname: '/workout/share',
              params: {
                workoutName: currentWorkout?.name ?? '',
                durationMins: String(durationMins),
                totalVolume: String(totalVolume),
                completedSets: String(completedSets),
                prCount: String(savedPRCount),
              },
            })}
          />
          <Button
            label={t('recap.addExercises')}
            variant="ghost"
            onPress={() => setPickerVisible(true)}
          />
        </View>
      </ScrollView>

      {/* Exercise picker modal */}
      <Modal visible={pickerVisible} animationType="slide" onRequestClose={() => setPickerVisible(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: tokens.bg }}>
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            padding: 16,
            gap: 12,
            borderBottomWidth: 1,
            borderBottomColor: tokens.border,
          }}>
            <TouchableOpacity onPress={() => setPickerVisible(false)} accessibilityLabel={t('common.close')} accessibilityRole="button">
              <Text style={{ fontFamily: fonts.sansB, fontSize: 32, color: tokens.accent }}>X</Text>
            </TouchableOpacity>
            <Text style={{
              fontFamily: fonts.sansX,
              fontSize: 20,
              color: tokens.text,
              flex: 1,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
            }}>
              {t('recap.addExercises')}
            </Text>
          </View>

          <View style={{ padding: 16, paddingBottom: 8, gap: 8 }}>
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder={t('exercise.searchPlaceholder')}
              placeholderTextColor={tokens.textGhost}
              style={{
                borderBottomWidth: 1,
                borderBottomColor: tokens.border,
                paddingVertical: 12,
                color: tokens.text,
                fontFamily: fonts.sans,
                fontSize: 14,
              }}
              accessibilityLabel={t('exercise.searchPlaceholder')}
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
            {filteredExercises.map((ex) => {
              const added = alreadyAdded.includes(ex.id)
              return (
                <TouchableOpacity
                  key={ex.id}
                  onPress={() => { if (!added) handlePickExercise(ex) }}
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
    </SafeAreaView>
  )
}
