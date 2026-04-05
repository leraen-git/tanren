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
import { Card } from '@/components/Card'
import { trpc } from '@/lib/trpc'
import { colors as tokenColors } from '@/theme/tokens'
import { usePendingWorkoutStore } from '@/stores/pendingWorkoutStore'

const DAYS = [
  { label: 'Mon', value: 1 },
  { label: 'Tue', value: 2 },
  { label: 'Wed', value: 3 },
  { label: 'Thu', value: 4 },
  { label: 'Fri', value: 5 },
  { label: 'Sat', value: 6 },
  { label: 'Sun', value: 0 },
]

type PlanDay = {
  dayOfWeek: number
  workoutTemplateId: string
}

export default function CreatePlanScreen() {
  const { colors, typography, spacing, radius } = useTheme()
  const { id } = useLocalSearchParams<{ id?: string }>()
  const isEditing = !!id

  const [name, setName] = useState('')
  const [planDays, setPlanDays] = useState<PlanDay[]>([])
  const [selectingDayFor, setSelectingDayFor] = useState<number | null>(null)

  const { data: workouts } = trpc.workouts.list.useQuery()
  const { data: plans } = trpc.plans.list.useQuery()
  const utils = trpc.useUtils()

  const pendingForDay = usePendingWorkoutStore((s) => s.pendingForDay)
  const pendingWorkoutId = usePendingWorkoutStore((s) => s.pendingWorkoutId)
  const clearPending = usePendingWorkoutStore((s) => s.clear)
  // Auto-assign when returning from workout builder (only when both day and workout are set)
  useEffect(() => {
    if (pendingForDay === null || !pendingWorkoutId) return
    setPlanDays((prev) => {
      const filtered = prev.filter((d) => d.dayOfWeek !== pendingForDay)
      return [...filtered, { dayOfWeek: pendingForDay, workoutTemplateId: pendingWorkoutId }]
    })
    setSelectingDayFor(null)
    clearPending()
  }, [pendingForDay, pendingWorkoutId])

  // Pre-populate form when editing
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
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: spacing.base, gap: spacing.md }}>
        <TouchableOpacity onPress={() => router.back()} accessibilityLabel="Go back" accessibilityRole="button">
          <Text style={{ fontFamily: typography.family.bold, fontSize: typography.size.title, color: colors.primary }}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }} />
        {isEditing && (
          <TouchableOpacity
            onPress={handleDelete}
            style={{
              paddingHorizontal: spacing.sm,
              paddingVertical: spacing.xs,
              borderRadius: radius.sm,
              borderWidth: 1,
              borderColor: `${colors.danger}40`,
            }}
            accessibilityLabel="Delete plan"
            accessibilityRole="button"
          >
            <Text style={{ fontFamily: typography.family.semiBold, fontSize: typography.size.base, color: colors.danger }}>
              Delete plan
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.base, gap: spacing.base }}>
        {/* Plan name with pen icon */}
        <TouchableOpacity
          onPress={() => {/* TextInput handles focus */}}
          style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}
          accessibilityLabel="Edit plan name"
          accessibilityRole="button"
          activeOpacity={1}
        >
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Plan name..."
            placeholderTextColor={colors.textMuted}
            style={{
              flex: 1,
              fontFamily: typography.family.extraBold,
              fontSize: typography.size['2xl'],
              color: colors.textPrimary,
              borderBottomWidth: name ? 0 : 2,
              borderBottomColor: colors.primary,
              paddingVertical: 2,
            }}
            accessibilityLabel="Plan name"
          />
          <Text style={{ fontSize: 18, color: colors.textMuted }}>✏️</Text>
        </TouchableOpacity>

        {/* Day picker */}
        <View style={{ gap: spacing.sm }}>
          <Text style={{ fontFamily: typography.family.semiBold, fontSize: typography.size.body, color: colors.textPrimary }}>
            Training days
          </Text>
          <Text style={{ fontFamily: typography.family.regular, fontSize: typography.size.base, color: colors.textMuted }}>
            Tap a day to assign a workout to it
          </Text>
          <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}>
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
                    paddingVertical: spacing.sm,
                    paddingHorizontal: spacing.md,
                    borderRadius: radius.pill,
                    backgroundColor: isSelecting
                      ? colors.warning
                      : isSelected
                      ? colors.primary
                      : colors.surface2,
                    minWidth: 52,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{
                    fontFamily: typography.family.bold,
                    fontSize: typography.size.base,
                    color: isSelected || isSelecting ? tokenColors.white : colors.textMuted,
                  }}>
                    {day.label}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>
        </View>

        {/* Workout picker (shows when a day is being assigned) */}
        {selectingDayFor !== null && (
          <View style={{ gap: spacing.sm }}>
            <Text style={{ fontFamily: typography.family.semiBold, fontSize: typography.size.body, color: colors.warning }}>
              Choose a workout for {DAYS.find((d) => d.value === selectingDayFor)?.label}
            </Text>

            {/* Create new workout inline */}
            <TouchableOpacity
              onPress={() => {
                usePendingWorkoutStore.getState().setDay(selectingDayFor)
                router.push('/workout/build' as any)
              }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: spacing.sm,
                paddingVertical: spacing.base,
                borderRadius: radius.lg,
                borderWidth: 2,
                borderStyle: 'dashed',
                borderColor: colors.primary,
              }}
              accessibilityLabel="Create new workout"
              accessibilityRole="button"
            >
              <Text style={{ fontFamily: typography.family.extraBold, fontSize: typography.size.xl, color: colors.primary }}>+</Text>
              <Text style={{ fontFamily: typography.family.bold, fontSize: typography.size.body, color: colors.primary }}>
                Create new workout
              </Text>
            </TouchableOpacity>

            {workouts && workouts.length > 0 && (
              <Text style={{ fontFamily: typography.family.semiBold, fontSize: typography.size.base, color: colors.textMuted }}>
                Or pick an existing one
              </Text>
            )}
            {workouts?.map((w) => (
              <Card key={w.id} onPress={() => assignWorkout(w.id)} accessibilityLabel={`Assign ${w.name}`}>
                <Text style={{ fontFamily: typography.family.semiBold, fontSize: typography.size.body, color: colors.textPrimary }}>
                  {w.name}
                </Text>
                <Text style={{ fontFamily: typography.family.regular, fontSize: typography.size.base, color: colors.textMuted }}>
                  {w.muscleGroups.join(' · ')}{w.muscleGroups.length > 0 ? ' · ' : ''}~{w.estimatedDuration} min
                </Text>
              </Card>
            ))}
            <Button label="Cancel" variant="ghost" onPress={() => setSelectingDayFor(null)} />
          </View>
        )}

        {/* Schedule summary */}
        {planDays.length > 0 && selectingDayFor === null && (
          <View style={{ gap: spacing.sm }}>
            <Text style={{ fontFamily: typography.family.bold, fontSize: typography.size.xl, color: colors.textPrimary }}>
              Schedule
            </Text>
            {[...planDays]
              .sort((a, b) => ((a.dayOfWeek + 6) % 7) - ((b.dayOfWeek + 6) % 7))
              .map((pd) => {
                const workout = getDayWorkout(pd.dayOfWeek)
                const dayLabel = DAYS.find((d) => d.value === pd.dayOfWeek)?.label
                return (
                  <Card key={pd.dayOfWeek} accessibilityLabel={`${dayLabel}: ${workout?.name}`}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <View>
                        <Text style={{ fontFamily: typography.family.bold, fontSize: typography.size.base, color: colors.primary }}>
                          {dayLabel}
                        </Text>
                        <Text style={{ fontFamily: typography.family.semiBold, fontSize: typography.size.body, color: colors.textPrimary }}>
                          {workout?.name}
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => setPlanDays((prev) => prev.filter((d) => d.dayOfWeek !== pd.dayOfWeek))}
                        accessibilityLabel={`Remove ${dayLabel}`}
                        accessibilityRole="button"
                      >
                        <Text style={{ fontFamily: typography.family.bold, fontSize: typography.size.title, color: colors.textMuted }}>
                          ×
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </Card>
                )
              })}
          </View>
        )}

        {/* AI card — only shown when creating (not editing) */}
        {!isEditing && selectingDayFor === null && (
          <TouchableOpacity
            onPress={() => router.push('/plans/generate' as any)}
            style={{
              backgroundColor: colors.surface,
              borderRadius: radius.lg,
              padding: spacing.base,
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.md,
              borderWidth: 1,
              borderColor: colors.surface2,
            }}
            accessibilityLabel="Generate a plan with AI"
            accessibilityRole="button"
          >
            <View style={{
              width: 44, height: 44, borderRadius: radius.md,
              backgroundColor: `${colors.primary}18`,
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Text style={{ fontSize: 22 }}>✨</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: typography.family.bold, fontSize: typography.size.body, color: colors.textPrimary }}>
                Let us help you create a plan
              </Text>
              <Text style={{ fontFamily: typography.family.regular, fontSize: typography.size.base, color: colors.textMuted }}>
                AI generates a plan based on your profile
              </Text>
            </View>
            <Text style={{ fontFamily: typography.family.bold, fontSize: typography.size.title, color: colors.primary }}>→</Text>
          </TouchableOpacity>
        )}

        {/* Save */}
        {selectingDayFor === null && (
          <Button
            label={isEditing ? 'Save changes' : 'Save & activate plan'}
            onPress={handleSave}
            loading={isPending}
            style={{ marginTop: spacing.sm }}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
