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
import { usePendingWorkoutStore } from '@/stores/pendingWorkoutStore'
import { useTranslation } from 'react-i18next'

const DAYS = [
  { label: 'MON', value: 1 },
  { label: 'TUE', value: 2 },
  { label: 'WED', value: 3 },
  { label: 'THU', value: 4 },
  { label: 'FRI', value: 5 },
  { label: 'SAT', value: 6 },
  { label: 'SUN', value: 0 },
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
  const { data: user } = trpc.users.me.useQuery()
  const isGuest = user?.authProvider === 'guest'

  const [name, setName] = useState('')
  const [planDays, setPlanDays] = useState<PlanDay[]>([])
  const [selectingDayFor, setSelectingDayFor] = useState<number | null>(null)

  const { data: workouts } = trpc.workouts.list.useQuery()
  const { data: plans } = trpc.plans.list.useQuery()
  const utils = trpc.useUtils()

  const pendingForDay = usePendingWorkoutStore((s) => s.pendingForDay)
  const pendingWorkoutId = usePendingWorkoutStore((s) => s.pendingWorkoutId)
  const clearPending = usePendingWorkoutStore((s) => s.clear)

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
      utils.plans.list.invalidate()
      utils.plans.active.invalidate()
      router.back()
    },
    onError: (err) => Alert.alert('Error', err.message),
  })

  const deletePlan = trpc.plans.delete.useMutation({
    onSuccess: () => {
      utils.plans.list.invalidate()
      utils.plans.active.invalidate()
      router.back()
    },
    onError: (err) => Alert.alert('Error', err.message),
  })

  const handleDelete = () => {
    if (!id) return
    Alert.alert('Delete plan', `Delete "${name}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deletePlan.mutate({ id }) },
    ])
  }

  const updatePlan = trpc.plans.update.useMutation({
    onSuccess: () => {
      utils.plans.list.invalidate()
      utils.plans.active.invalidate()
      router.back()
    },
    onError: (err) => Alert.alert('Error', err.message),
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
      Alert.alert('Missing name', 'Please give your plan a name.')
      return
    }
    if (planDays.length === 0) {
      Alert.alert('No days selected', 'Select at least one training day.')
      return
    }
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
        <TouchableOpacity onPress={() => router.back()} accessibilityLabel="Go back" accessibilityRole="button">
          <Text style={{ fontFamily: fonts.sansB, fontSize: 10, color: tokens.accent, textTransform: 'uppercase', letterSpacing: 2 }}>
            {'< BACK'}
          </Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }} />
        {isEditing && (
          <TouchableOpacity
            onPress={handleDelete}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderWidth: 1,
              borderColor: tokens.accent,
            }}
            accessibilityLabel="Delete plan"
            accessibilityRole="button"
          >
            <Text style={{ fontFamily: fonts.sansB, fontSize: 10, color: tokens.accent, textTransform: 'uppercase', letterSpacing: 1.4 }}>
              DELETE
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 20 }}>
        {/* Plan name — underline input */}
        <View>
          <Text style={{ fontFamily: fonts.sansB, fontSize: 9, color: tokens.textMute, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 8 }}>
            PLAN NAME
          </Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Plan name..."
            placeholderTextColor={tokens.textGhost}
            style={{
              fontFamily: fonts.sansX,
              fontSize: 24,
              color: tokens.text,
              borderBottomWidth: 1,
              borderBottomColor: tokens.border,
              paddingVertical: 4,
            }}
            accessibilityLabel="Plan name"
          />
        </View>

        {/* Day picker */}
        <View style={{ gap: 8 }}>
          <Text style={{ fontFamily: fonts.sansB, fontSize: 10, color: tokens.textMute, textTransform: 'uppercase', letterSpacing: 2 }}>
            TRAINING DAYS
          </Text>
          <Text style={{ fontFamily: fonts.sans, fontSize: 13, color: tokens.textDim }}>
            Tap a day to assign a workout
          </Text>
          <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
            {DAYS.map((day) => {
              const isSelected = planDays.some((d) => d.dayOfWeek === day.value)
              const isSelecting = selectingDayFor === day.value
              return (
                <TouchableOpacity
                  key={day.value}
                  onPress={() => toggleDay(day.value)}
                  accessibilityLabel={`${day.label} ${isSelected ? 'selected' : 'not selected'}`}
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
        </View>

        {/* Workout picker */}
        {selectingDayFor !== null && (
          <View style={{ gap: 12 }}>
            <Text style={{ fontFamily: fonts.sansB, fontSize: 14, color: tokens.amber }}>
              Choose a workout for {DAYS.find((d) => d.value === selectingDayFor)?.label}
            </Text>

            {/* Create new workout */}
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
              accessibilityLabel="Create new workout"
              accessibilityRole="button"
            >
              <Text style={{ fontFamily: fonts.sansX, fontSize: 20, color: tokens.accent }}>+</Text>
              <Text style={{ fontFamily: fonts.sansB, fontSize: 14, color: tokens.accent, textTransform: 'uppercase', letterSpacing: 1 }}>
                Create new workout
              </Text>
            </TouchableOpacity>

            {workouts && workouts.length > 0 && (
              <Text style={{ fontFamily: fonts.sansB, fontSize: 10, color: tokens.textMute, textTransform: 'uppercase', letterSpacing: 2 }}>
                OR PICK EXISTING
              </Text>
            )}
            {workouts?.map((w) => (
              <TouchableOpacity
                key={w.id}
                onPress={() => assignWorkout(w.id)}
                accessibilityLabel={`Assign ${w.name}`}
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
                  {w.muscleGroups.join(' / ')}{w.muscleGroups.length > 0 ? ' / ' : ''}~{w.estimatedDuration} min
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              onPress={() => setSelectingDayFor(null)}
              style={{ alignSelf: 'flex-start', paddingVertical: 8 }}
              accessibilityLabel="Cancel"
              accessibilityRole="button"
            >
              <Text style={{ fontFamily: fonts.sansB, fontSize: 10, color: tokens.textMute, textTransform: 'uppercase', letterSpacing: 2 }}>
                CANCEL
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Schedule summary */}
        {planDays.length > 0 && selectingDayFor === null && (
          <View style={{ gap: 8 }}>
            <Text style={{ fontFamily: fonts.sansB, fontSize: 10, color: tokens.textMute, textTransform: 'uppercase', letterSpacing: 2 }}>
              SCHEDULE
            </Text>
            <View style={{ borderWidth: 1, borderColor: tokens.border }}>
              {[...planDays]
                .sort((a, b) => ((a.dayOfWeek + 6) % 7) - ((b.dayOfWeek + 6) % 7))
                .map((pd, idx) => {
                  const workout = getDayWorkout(pd.dayOfWeek)
                  const dayLabel = DAYS.find((d) => d.value === pd.dayOfWeek)?.label
                  return (
                    <View
                      key={pd.dayOfWeek}
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: 12,
                        borderTopWidth: idx > 0 ? 1 : 0,
                        borderTopColor: tokens.border,
                      }}
                      accessibilityLabel={`${dayLabel}: ${workout?.name}`}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontFamily: fonts.sansB, fontSize: 10, color: tokens.accent, textTransform: 'uppercase', letterSpacing: 1.4 }}>
                          {dayLabel}
                        </Text>
                        <Text style={{ fontFamily: fonts.sansB, fontSize: 14, color: tokens.text, textTransform: 'uppercase', marginTop: 2 }}>
                          {workout?.name}
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => setPlanDays((prev) => prev.filter((d) => d.dayOfWeek !== pd.dayOfWeek))}
                        accessibilityLabel={`Remove ${dayLabel}`}
                        accessibilityRole="button"
                        style={{ padding: 4 }}
                      >
                        <Text style={{ fontFamily: fonts.sansB, fontSize: 20, color: tokens.textMute }}>
                          x
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )
                })}
            </View>
          </View>
        )}

        {/* AI card */}
        {!isEditing && selectingDayFor === null && (
          <TouchableOpacity
            onPress={isGuest ? undefined : () => router.push('/plans/generate')}
            disabled={isGuest}
            style={{
              backgroundColor: tokens.surface1,
              padding: 16,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              borderWidth: 1,
              borderColor: tokens.border,
              opacity: isGuest ? 0.4 : 1,
            }}
            accessibilityLabel={isGuest ? t('guest.aiLocked') : t('home.generatePlan')}
            accessibilityRole="button"
          >
            <View style={{
              width: 40, height: 40,
              borderWidth: 1,
              borderColor: isGuest ? tokens.border : tokens.accent,
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Text style={{ fontFamily: fonts.sansB, fontSize: 10, color: isGuest ? tokens.textMute : tokens.accent, letterSpacing: 1 }}>AI</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: fonts.sansB, fontSize: 14, color: isGuest ? tokens.textMute : tokens.text, textTransform: 'uppercase' }}>
                {isGuest ? t('guest.aiLocked') : t('home.generatePlan')}
              </Text>
              <Text style={{ fontFamily: fonts.sans, fontSize: 12, color: tokens.textMute }}>
                {isGuest ? t('guest.aiLockedDesc') : t('home.generatePlanDesc')}
              </Text>
            </View>
            <Text style={{ fontFamily: fonts.sansB, fontSize: 17, color: isGuest ? tokens.textMute : tokens.accent }}>-{'>'}</Text>
          </TouchableOpacity>
        )}

        {/* Save */}
        {selectingDayFor === null && (
          <Button
            label={isEditing ? 'Save changes' : 'Save & activate plan'}
            onPress={handleSave}
            loading={isPending}
            style={{ marginTop: 4 }}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
