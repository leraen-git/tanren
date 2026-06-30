import React, { useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, Alert, Modal, Pressable } from 'react-native'
import { Image } from 'expo-image'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { useTheme } from '@/theme/ThemeContext'
import { Button } from '@/components/Button'
import { trpc } from '@/lib/trpc'
import { useInvalidateActivePlan, useInvalidateWorkouts } from '@/lib/invalidation'
import { useAIPlanStore } from '@/stores/aiPlanStore'
import { translateMuscleGroup } from '@/hooks/useExercises'
import { useExercises } from '@/hooks/useExercises'
import { ExercisePicker, type PickedExercise } from '@/components/ExercisePicker'

function useDayNames(): Record<number, string> {
  const { t } = useTranslation()
  return { 1: t('common.dayShort1'), 2: t('common.dayShort2'), 3: t('common.dayShort3'), 4: t('common.dayShort4'), 5: t('common.dayShort5'), 6: t('common.dayShort6'), 7: t('common.dayShort7') }
}

export default function PreviewPlanScreen() {
  const { tokens, fonts, label } = useTheme()
  const { t } = useTranslation()
  const DAY_NAMES = useDayNames()
  const { proposedPlan, updateProposedPlan, reset } = useAIPlanStore()
  const { data: plans } = trpc.plans.list.useQuery()
  const currentActivePlan = plans?.find((p) => p.isActive)
  const invalidatePlans = useInvalidateActivePlan()
  const invalidateWorkouts = useInvalidateWorkouts()
  const { data: allExercises } = useExercises()

  const [previewImage, setPreviewImage] = useState<{ name: string; url: string } | null>(null)
  const [replacingExercise, setReplacingExercise] = useState<{ dayIdx: number; exIdx: number; muscleGroups: string[] } | null>(null)

  const acceptPlan = trpc.plans.acceptGenerated.useMutation({
    onSuccess: async () => {
      invalidatePlans()
      invalidateWorkouts()
      reset()
      router.replace('/')
    },
    onError: (err) => Alert.alert(t('common.error'), err.message),
  })

  const handleActivate = () => {
    if (!proposedPlan) return

    const warningParts: string[] = []
    const sessionCount = proposedPlan.days.length
    warningParts.push(t('ai.previewActivateWarning', {
      count: sessionCount,
      name: currentActivePlan?.name ?? '',
    }))

    Alert.alert(
      t('planBuilder.activationWarningTitle'),
      warningParts.join(''),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('ai.previewActivate'), onPress: () => acceptPlan.mutate(proposedPlan) },
      ]
    )
  }

  const findExerciseImage = (exerciseId: string): string | null => {
    return allExercises?.find((e) => e.id === exerciseId)?.imageUrl ?? null
  }

  const handleDeleteExercise = (dayIdx: number, exIdx: number) => {
    if (!proposedPlan) return
    const day = proposedPlan.days[dayIdx]
    if (!day || day.exercises.length <= 1) {
      Alert.alert(t('ai.cannotDeleteLast'))
      return
    }
    const newExercises = day.exercises.filter((_, i) => i !== exIdx)
    const newDays = proposedPlan.days.map((d, i) =>
      i === dayIdx ? { dayOfWeek: d.dayOfWeek, workoutName: d.workoutName, muscleGroups: d.muscleGroups, estimatedDuration: d.estimatedDuration, exercises: newExercises } : d
    )
    updateProposedPlan({ name: proposedPlan.name, days: newDays })
  }

  const handleReplaceExercise = (dayIdx: number, exIdx: number) => {
    if (!proposedPlan) return
    const day = proposedPlan.days[dayIdx]
    if (!day) return
    setReplacingExercise({ dayIdx, exIdx, muscleGroups: day.muscleGroups })
  }

  const handlePickerConfirm = (picked: PickedExercise[]) => {
    if (!proposedPlan || !replacingExercise || picked.length === 0) {
      setReplacingExercise(null)
      return
    }
    const { dayIdx, exIdx } = replacingExercise
    const day = proposedPlan.days[dayIdx]
    if (!day) { setReplacingExercise(null); return }
    const old = day.exercises[exIdx]
    const pick = picked[0]
    if (!old || !pick) { setReplacingExercise(null); return }
    const newExercise: typeof old = {
      exerciseId: pick.id,
      exerciseName: pick.name,
      defaultSets: old.defaultSets,
      defaultReps: old.defaultReps,
      defaultWeight: old.defaultWeight,
      defaultRestSeconds: old.defaultRestSeconds,
    }
    const newExercises = day.exercises.map((e, i) => i === exIdx ? newExercise : e)
    const newDays = proposedPlan.days.map((d, i) =>
      i === dayIdx ? { dayOfWeek: d.dayOfWeek, workoutName: d.workoutName, muscleGroups: d.muscleGroups, estimatedDuration: d.estimatedDuration, exercises: newExercises } : d
    )
    updateProposedPlan({ name: proposedPlan.name, days: newDays })
    setReplacingExercise(null)
  }

  const handleLongPress = (exerciseId: string, exerciseName: string) => {
    const url = findExerciseImage(exerciseId)
    if (url) {
      setPreviewImage({ name: exerciseName, url })
    }
  }

  if (!proposedPlan) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: tokens.bg, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontFamily: fonts.sans, color: tokens.textMute }}>{t('plans.noPlans')}</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }} accessibilityLabel={t('common.back')} accessibilityRole="button">
          <Text style={{ ...label.md, color: tokens.accent }}>{t('common.back')}</Text>
        </TouchableOpacity>
      </SafeAreaView>
    )
  }

  const sortedDays = [...proposedPlan.days].sort((a, b) => a.dayOfWeek - b.dayOfWeek)

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: tokens.bg }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 }}>
        <TouchableOpacity onPress={() => router.back()} accessibilityLabel={t('common.back')} accessibilityRole="button">
          <Text style={{ ...label.md, color: tokens.accent }}>
            {'< '}{t('common.back').toUpperCase()}
          </Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }} />
        <View style={{
          backgroundColor: tokens.accent,
          paddingHorizontal: 8,
          paddingVertical: 3,
        }}>
          <Text style={{ fontFamily: fonts.sansB, fontSize: 9, color: '#FFFFFF', letterSpacing: 1.4, textTransform: 'uppercase' }}>
            {t('ai.previewBadge')}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 20, paddingBottom: 140 }}>
        {/* Plan name block */}
        <View style={{
          backgroundColor: tokens.surface1,
          padding: 16,
          borderWidth: 1,
          borderColor: tokens.border,
          borderLeftWidth: 3,
          borderLeftColor: tokens.accent,
        }}>
          <Text style={{ ...label.sm, color: tokens.textMute }}>
            {t('ai.previewTitle').toUpperCase()}
          </Text>
          <Text style={{ fontFamily: fonts.sansX, fontSize: 24, color: tokens.text, textTransform: 'uppercase', marginTop: 4 }}>
            {proposedPlan.name}
          </Text>
          <Text style={{ fontFamily: fonts.sans, fontSize: 12, color: tokens.textMute, marginTop: 4 }}>
            {sortedDays.map((d) => DAY_NAMES[d.dayOfWeek]).join(' · ')} · {proposedPlan.days.length} {t('ai.exos')}/{t('ai.perWeek').replace('/ ', '')}
          </Text>
        </View>

        {/* Schedule header */}
        <Text style={{ ...label.md, color: tokens.textMute }}>
          {t('ai.previewSchedule').toUpperCase()}
        </Text>

        {/* Day cards */}
        {sortedDays.map((day, dayIdx) => (
          <View key={dayIdx} style={{
            borderWidth: 1,
            borderColor: tokens.border,
          }}>
            {/* Day header */}
            <View style={{ padding: 12, gap: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{
                  backgroundColor: tokens.accent,
                  paddingVertical: 2,
                  paddingHorizontal: 8,
                }}>
                  <Text style={{ fontFamily: fonts.sansB, fontSize: 9, color: '#FFFFFF', letterSpacing: 1.4, textTransform: 'uppercase' }}>
                    {DAY_NAMES[day.dayOfWeek]}
                  </Text>
                </View>
                <Text style={{ fontFamily: fonts.sansX, fontSize: 17, color: tokens.text, textTransform: 'uppercase', flex: 1 }}>
                  {day.workoutName}
                </Text>
              </View>

              <Text style={{ fontFamily: fonts.mono, fontSize: 11, color: tokens.textMute }}>
                ~{day.estimatedDuration} {t('common.min')}
              </Text>

              {day.muscleGroups.length > 0 && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
                  {day.muscleGroups.map((mg) => (
                    <View key={mg} style={{
                      borderWidth: 1,
                      borderColor: tokens.border,
                      paddingHorizontal: 6,
                      paddingVertical: 2,
                    }}>
                      <Text style={{ fontFamily: fonts.sansB, fontSize: 8, color: tokens.textMute, textTransform: 'uppercase', letterSpacing: 1 }}>
                        {translateMuscleGroup(mg, t)}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Exercises */}
            {day.exercises.map((ex, exIdx) => (
              <Pressable
                key={exIdx}
                onLongPress={() => handleLongPress(ex.exerciseId, ex.exerciseName)}
                delayLongPress={400}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                  borderTopWidth: 1,
                  borderTopColor: tokens.border,
                }}
              >
                <View style={{
                  width: 24, height: 24,
                  borderWidth: 1,
                  borderColor: tokens.accent,
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Text style={{ fontFamily: fonts.sansB, fontSize: 10, color: tokens.accent }}>
                    {exIdx + 1}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: fonts.sansB, fontSize: 13, color: tokens.text, textTransform: 'uppercase' }}>
                    {ex.exerciseName}
                  </Text>
                  <Text style={{ fontFamily: fonts.mono, fontSize: 11, color: tokens.textMute }}>
                    {ex.defaultSets} {t('common.sets')} x {ex.defaultReps} {t('common.reps')} · {ex.defaultRestSeconds}s repos
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => handleReplaceExercise(dayIdx, exIdx)}
                  hitSlop={8}
                  accessibilityLabel={t('ai.swapExercise')}
                  accessibilityRole="button"
                  style={{ paddingHorizontal: 6, paddingVertical: 4 }}
                >
                  <Text style={{ fontFamily: fonts.sansB, fontSize: 9, color: tokens.accent, letterSpacing: 1, textTransform: 'uppercase' }}>
                    {t('planBuilder.swap')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleDeleteExercise(dayIdx, exIdx)}
                  hitSlop={8}
                  accessibilityLabel={t('common.delete')}
                  accessibilityRole="button"
                  style={{ paddingLeft: 4, paddingVertical: 4 }}
                >
                  <Text style={{ fontFamily: fonts.sansB, fontSize: 14, color: tokens.textMute }}>×</Text>
                </TouchableOpacity>
              </Pressable>
            ))}
          </View>
        ))}

        <Text style={{ fontFamily: fonts.sans, fontSize: 11, color: tokens.textGhost, textAlign: 'center' }}>
          {t('ai.previewHint')}
        </Text>
      </ScrollView>

      {/* Bottom actions */}
      <View style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        backgroundColor: tokens.bg,
        padding: 16,
        gap: 8,
        borderTopWidth: 1,
        borderTopColor: tokens.border,
      }}>
        <Button
          label={t('ai.previewActivate')}
          onPress={handleActivate}
          loading={acceptPlan.isPending}
        />
        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            height: 44,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: tokens.border,
          }}
          accessibilityLabel={t('ai.previewEdit')}
          accessibilityRole="button"
        >
          <Text style={{ fontFamily: fonts.sansB, fontSize: 13, color: tokens.textDim, textTransform: 'uppercase', letterSpacing: 1 }}>
            {t('ai.previewEdit')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Image preview modal */}
      <Modal visible={!!previewImage} transparent animationType="fade" onRequestClose={() => setPreviewImage(null)}>
        <Pressable
          onPress={() => setPreviewImage(null)}
          style={{
            flex: 1,
            backgroundColor: tokens.overlay,
            justifyContent: 'center',
            alignItems: 'center',
            padding: 24,
          }}
        >
          <View style={{ width: '100%', maxWidth: 340, backgroundColor: tokens.bg, borderWidth: 1, borderColor: tokens.border }}>
            <View style={{ padding: 12 }}>
              <Text style={{ fontFamily: fonts.sansB, fontSize: 14, color: tokens.text, textTransform: 'uppercase' }}>
                {previewImage?.name}
              </Text>
            </View>
            {previewImage?.url && (
              <Image
                source={{ uri: previewImage.url }}
                style={{ width: '100%', height: 220 }}
                contentFit="cover"
              />
            )}
            <TouchableOpacity
              onPress={() => setPreviewImage(null)}
              style={{ padding: 12, alignItems: 'center' }}
              accessibilityLabel={t('common.close')}
              accessibilityRole="button"
            >
              <Text style={{ ...label.sm, color: tokens.accent }}>{t('common.close')}</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* Exercise picker for replacement */}
      <ExercisePicker
        visible={!!replacingExercise}
        mode="single"
        preselectedMuscles={replacingExercise?.muscleGroups}
        onClose={() => setReplacingExercise(null)}
        onConfirm={handlePickerConfirm}
      />
    </SafeAreaView>
  )
}
