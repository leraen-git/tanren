import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, useLocalSearchParams } from 'expo-router'
import { useTheme } from '@/theme/ThemeContext'
import { Button } from '@/components/Button'
import { trpc } from '@/lib/trpc'
import { useInvalidateActivePlan } from '@/lib/invalidation'
import { usePendingWorkoutStore } from '@/stores/pendingWorkoutStore'
import { useTranslation } from 'react-i18next'
import { translateMuscleGroup } from '@/hooks/useExercises'

const DOW_KEY: Record<number, string> = { 1: 'mon', 2: 'tue', 3: 'wed', 4: 'thu', 5: 'fri', 6: 'sat', 7: 'sun' }

const DAYS = [
  { label: 'Lun', value: 1 },
  { label: 'Mar', value: 2 },
  { label: 'Mer', value: 3 },
  { label: 'Jeu', value: 4 },
  { label: 'Ven', value: 5 },
  { label: 'Sam', value: 6 },
  { label: 'Dim', value: 7 },
]

type PlanDay = {
  dayOfWeek: number
  workoutTemplateId: string
}

export default function CreatePlanScreen() {
  const { tokens, fonts } = useTheme()
  const { t } = useTranslation()
  const { id } = useLocalSearchParams<{ id?: string }>()
  const isEditing = !!id

  const [name, setName] = useState('')
  const [planDays, setPlanDays] = useState<PlanDay[]>([])
  const [selectingDayFor, setSelectingDayFor] = useState<number | null>(null)

  const { data: workouts } = trpc.workouts.list.useQuery()
  const { data: plans } = trpc.plans.list.useQuery()
  const invalidatePlans = useInvalidateActivePlan()

  const pendingForDay = usePendingWorkoutStore((s) => s.pendingForDay)
  const pendingWorkoutId = usePendingWorkoutStore((s) => s.pendingWorkoutId)
  const clearPending = usePendingWorkoutStore((s) => s.clear)

  const currentActivePlan = plans?.find((p) => p.isActive && p.id !== id)

  useEffect(() => {
    if (pendingForDay === null || !pendingWorkoutId) return
    setPlanDays((prev) => {
      const filtered = prev.filter((d) => d.dayOfWeek !== pendingForDay)
      return [...filtered, { dayOfWeek: pendingForDay, workoutTemplateId: pendingWorkoutId }]
    })
    setSelectingDayFor(null)
    clearPending()
  }, [pendingForDay, pendingWorkoutId])

  useEffect(() => {
    if (!id || !plans) return
    const existing = plans.find((p) => p.id === id)
    if (!existing) return
    setName(existing.name)
    setPlanDays(existing.days.map((d) => ({
      dayOfWeek: d.dayOfWeek,
      workoutTemplateId: d.workoutTemplateId,
    })))
  }, [id, plans])

  const createPlan = trpc.plans.create.useMutation({
    onSuccess: () => {
      invalidatePlans()
      router.back()
    },
    onError: (err) => Alert.alert(t('common.error'), err.message),
  })

  const deletePlan = trpc.plans.delete.useMutation({
    onSuccess: () => {
      invalidatePlans()
      router.back()
    },
    onError: (err) => Alert.alert(t('common.error'), err.message),
  })

  const handleDelete = () => {
    if (!id) return
    Alert.alert(
      t('planBuilder.deleteTitle'),
      t('planBuilder.deleteMessage', { name }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('common.delete'), style: 'destructive', onPress: () => deletePlan.mutate({ id }) },
      ]
    )
  }

  const updatePlan = trpc.plans.update.useMutation({
    onSuccess: () => {
      invalidatePlans()
      router.back()
    },
    onError: (err) => Alert.alert(t('common.error'), err.message),
  })

  const toggleDay = (dayValue: number) => {
    const exists = planDays.find((d) => d.dayOfWeek === dayValue)
    if (exists) {
      setPlanDays((prev) => prev.filter((d) => d.dayOfWeek !== dayValue))
    } else {
      setSelectingDayFor(dayValue)
    }
  }

  const assignWorkout = (templateId: string) => {
    if (selectingDayFor === null) return
    setPlanDays((prev) => {
      const filtered = prev.filter((d) => d.dayOfWeek !== selectingDayFor)
      return [...filtered, { dayOfWeek: selectingDayFor, workoutTemplateId: templateId }]
    })
    setSelectingDayFor(null)
  }

  const getDayWorkout = (dayValue: number) => {
    const pd = planDays.find((d) => d.dayOfWeek === dayValue)
    if (!pd) return null
    return workouts?.find((w) => w.id === pd.workoutTemplateId) ?? null
  }

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert(t('planBuilder.planName'), t('planBuilder.noDaysSelectedDesc'))
      return
    }
    if (planDays.length === 0) {
      Alert.alert(t('planBuilder.noDaysSelected'), t('planBuilder.noDaysSelectedDesc'))
      return
    }

    if (currentActivePlan && !isEditing) {
      Alert.alert(
        t('planBuilder.activationWarningTitle'),
        t('planBuilder.activationWarningDesc', { name: currentActivePlan.name }),
        [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('planBuilder.activate'), onPress: doSave },
        ]
      )
    } else {
      doSave()
    }
  }

  const doSave = () => {
    if (isEditing && id) {
      updatePlan.mutate({ id, name: name.trim(), days: planDays })
    } else {
      createPlan.mutate({ name: name.trim(), days: planDays })
    }
  }

  const isPending = createPlan.isPending || updatePlan.isPending

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: tokens.bg }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 }}>
        <TouchableOpacity onPress={() => router.back()} accessibilityLabel={t('common.back')} accessibilityRole="button">
          <Text style={{ fontFamily: fonts.sansB, fontSize: 10, color: tokens.accent, textTransform: 'uppercase', letterSpacing: 2 }}>
            {'< '}{t('common.back').toUpperCase()}
          </Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }} />
        {isEditing && (
          <View style={{ backgroundColor: tokens.accent, paddingHorizontal: 8, paddingVertical: 2 }}>
            <Text style={{ fontFamily: fonts.sansB, fontSize: 9, letterSpacing: 2, color: '#FFFFFF', textTransform: 'uppercase' }}>
              {t('planBuilder.editBadge')}
            </Text>
          </View>
        )}
        {isEditing && (
          <TouchableOpacity
            onPress={handleDelete}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderWidth: 1,
              borderColor: tokens.accent,
            }}
            accessibilityLabel={t('planBuilder.deleteTitle')}
            accessibilityRole="button"
          >
            <Text style={{ fontFamily: fonts.sansB, fontSize: 10, color: tokens.accent, textTransform: 'uppercase', letterSpacing: 1.4 }}>
              {t('common.delete').toUpperCase()}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 20 }}>
        {/* Title */}
        <Text style={{ fontFamily: fonts.sansX, fontSize: 24, color: tokens.text, textTransform: 'uppercase' }}>
          {isEditing ? t('planBuilder.editTitle') : t('planBuilder.newTitle')}
        </Text>

        {/* Plan name */}
        <View>
          <Text style={{ fontFamily: fonts.sansB, fontSize: 9, color: tokens.textMute, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 8 }}>
            {t('planBuilder.planName').toUpperCase()}
          </Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder={t('planBuilder.planNamePlaceholder')}
            placeholderTextColor={tokens.textGhost}
            style={{
              fontFamily: fonts.sansX,
              fontSize: 24,
              color: tokens.text,
              borderBottomWidth: 1,
              borderBottomColor: name ? tokens.text : tokens.border,
              paddingVertical: 4,
            }}
            accessibilityLabel={t('planBuilder.planName')}
          />
        </View>

        {/* Day picker */}
        <View style={{ gap: 8 }}>
          <Text style={{ fontFamily: fonts.sansB, fontSize: 10, color: tokens.textMute, textTransform: 'uppercase', letterSpacing: 2 }}>
            {t('planBuilder.trainingDays').toUpperCase()}
          </Text>
          <Text style={{ fontFamily: fonts.sans, fontSize: 13, color: tokens.textDim }}>
            {t('planBuilder.trainingDaysDesc')}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 4 }}>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {DAYS.map((day) => {
                const isSelected = planDays.some((d) => d.dayOfWeek === day.value)
                const isSelecting = selectingDayFor === day.value
                return (
                  <TouchableOpacity
                    key={day.value}
                    onPress={() => toggleDay(day.value)}
                    accessibilityLabel={`${day.label} ${isSelected ? 'selected' : ''}`}
                    accessibilityRole="button"
                    style={{
                      paddingVertical: 8,
                      paddingHorizontal: 14,
                      borderWidth: 1,
                      borderColor: isSelecting
                        ? tokens.amber
                        : isSelected
                        ? tokens.accent
                        : tokens.border,
                      backgroundColor: isSelecting
                        ? tokens.amber
                        : isSelected
                        ? tokens.accent
                        : 'transparent',
                      minWidth: 48,
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{
                      fontFamily: fonts.sansB,
                      fontSize: 10,
                      letterSpacing: 1.4,
                      color: isSelected || isSelecting ? '#FFFFFF' : tokens.textMute,
                    }}>
                      {day.label}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          </ScrollView>
        </View>

        {/* Workout picker for selected day */}
        {selectingDayFor !== null && (
          <View style={{ gap: 12 }}>
            <Text style={{ fontFamily: fonts.sansB, fontSize: 14, color: tokens.amber }}>
              {t('planBuilder.assignForDay', { day: DAYS.find((d) => d.value === selectingDayFor)?.label })}
            </Text>

            <TouchableOpacity
              onPress={() => {
                usePendingWorkoutStore.getState().setDay(selectingDayFor)
                router.push('/workout/build')
              }}
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
              accessibilityLabel={t('planBuilder.createNewSession')}
              accessibilityRole="button"
            >
              <Text style={{ fontFamily: fonts.sansB, fontSize: 14, color: tokens.accent, textTransform: 'uppercase', letterSpacing: 1 }}>
                {t('planBuilder.createNewSession')}
              </Text>
            </TouchableOpacity>

            {workouts && workouts.length > 0 && (
              <Text style={{ fontFamily: fonts.sansB, fontSize: 10, color: tokens.textMute, textTransform: 'uppercase', letterSpacing: 2 }}>
                {t('planBuilder.orPickExisting').toUpperCase()}
              </Text>
            )}
            {workouts?.map((w) => (
              <TouchableOpacity
                key={w.id}
                onPress={() => assignWorkout(w.id)}
                accessibilityLabel={w.name}
                accessibilityRole="button"
                style={{
                  borderBottomWidth: 1,
                  borderBottomColor: tokens.border,
                  paddingVertical: 12,
                }}
              >
                <Text style={{ fontFamily: fonts.sansB, fontSize: 14, color: tokens.text, textTransform: 'uppercase' }}>
                  {w.name}
                </Text>
                <Text style={{ fontFamily: fonts.sans, fontSize: 12, color: tokens.textMute, marginTop: 2 }}>
                  {w.muscleGroups.slice(0, 3).map((mg: string) => translateMuscleGroup(mg, t)).join(' · ')}
                  {w.muscleGroups.length > 0 ? ' · ' : ''}~{w.estimatedDuration} {t('common.min')}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              onPress={() => setSelectingDayFor(null)}
              style={{ alignSelf: 'flex-start', paddingVertical: 8 }}
              accessibilityLabel={t('planBuilder.cancelSelection')}
              accessibilityRole="button"
            >
              <Text style={{ fontFamily: fonts.sansB, fontSize: 10, color: tokens.textMute, textTransform: 'uppercase', letterSpacing: 2 }}>
                {t('planBuilder.cancelSelection').toUpperCase()}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Schedule summary */}
        {planDays.length > 0 && selectingDayFor === null && (
          <View style={{ gap: 8 }}>
            <Text style={{ fontFamily: fonts.sansB, fontSize: 10, color: tokens.textMute, textTransform: 'uppercase', letterSpacing: 2 }}>
              {t('planBuilder.schedule').toUpperCase()}
            </Text>
            <View style={{ borderWidth: 1, borderColor: tokens.border }}>
              {[...planDays]
                .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
                .map((pd, idx) => {
                  const workout = getDayWorkout(pd.dayOfWeek)
                  const dayLabel = DAYS.find((d) => d.value === pd.dayOfWeek)?.label
                  return (
                    <View
                      key={pd.dayOfWeek}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        padding: 12,
                        borderTopWidth: idx > 0 ? 1 : 0,
                        borderTopColor: tokens.border,
                      }}
                      accessibilityLabel={`${dayLabel}: ${workout?.name}`}
                    >
                      <View style={{
                        backgroundColor: tokens.accent,
                        paddingHorizontal: 6,
                        paddingVertical: 2,
                        marginRight: 10,
                      }}>
                        <Text style={{ fontFamily: fonts.sansB, fontSize: 9, letterSpacing: 1.4, color: '#FFFFFF', textTransform: 'uppercase' }}>
                          {dayLabel}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontFamily: fonts.sansB, fontSize: 14, color: tokens.text, textTransform: 'uppercase' }}>
                          {workout?.name}
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => {
                          setSelectingDayFor(pd.dayOfWeek)
                        }}
                        style={{ paddingHorizontal: 8, paddingVertical: 4 }}
                        accessibilityLabel={t('planBuilder.swap')}
                        accessibilityRole="button"
                      >
                        <Text style={{ fontFamily: fonts.sansB, fontSize: 10, color: tokens.accent, textTransform: 'uppercase', letterSpacing: 1 }}>
                          {t('planBuilder.swap')}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => setPlanDays((prev) => prev.filter((d) => d.dayOfWeek !== pd.dayOfWeek))}
                        accessibilityLabel={t('common.remove')}
                        accessibilityRole="button"
                        style={{ paddingLeft: 8, paddingVertical: 4 }}
                      >
                        <Text style={{ fontFamily: fonts.sansB, fontSize: 10, color: tokens.textMute, textTransform: 'uppercase', letterSpacing: 1 }}>
                          {t('common.remove')}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )
                })}
            </View>
          </View>
        )}

        {/* No days empty state */}
        {planDays.length === 0 && selectingDayFor === null && (
          <View style={{
            borderWidth: 1,
            borderColor: tokens.borderStrong,
            borderStyle: 'dashed',
            padding: 20,
            alignItems: 'center',
            gap: 4,
          }}>
            <Text style={{ fontFamily: fonts.sansM, fontSize: 14, color: tokens.text }}>
              {t('planBuilder.noDaysSelected')}
            </Text>
            <Text style={{ fontFamily: fonts.sans, fontSize: 12, color: tokens.textMute, textAlign: 'center' }}>
              {t('planBuilder.noDaysSelectedDesc')}
            </Text>
          </View>
        )}

        {/* Activation warning */}
        {currentActivePlan && !isEditing && planDays.length > 0 && selectingDayFor === null && (
          <View style={{
            backgroundColor: tokens.amber + '14',
            borderWidth: 1,
            borderColor: tokens.amber + '40',
            padding: 12,
          }}>
            <Text style={{ fontFamily: fonts.sans, fontSize: 12, color: tokens.amber }}>
              {t('planBuilder.activationWarningDesc', { name: currentActivePlan.name })}
            </Text>
          </View>
        )}

        {/* Save CTA */}
        {selectingDayFor === null && (
          <Button
            label={isEditing ? t('planBuilder.saveChanges') : t('planBuilder.activate')}
            onPress={handleSave}
            loading={isPending}
            style={{ marginTop: 4 }}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
