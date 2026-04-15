import React from 'react'
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useTheme } from '@/theme/ThemeContext'
import { Button } from '@/components/Button'
import { trpc } from '@/lib/trpc'
import { useAIPlanStore } from '@/stores/aiPlanStore'

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function PreviewPlanScreen() {
  const { colors, typography, spacing, radius } = useTheme()
  const { proposedPlan, reset } = useAIPlanStore()
  const utils = trpc.useUtils()

  const acceptPlan = trpc.plans.acceptGenerated.useMutation({
    onSuccess: async () => {
      await utils.plans.active.invalidate()
      await utils.plans.list.invalidate()
      reset()
      router.replace('/' as any)
    },
    onError: (err) => Alert.alert('Failed to save plan', err.message),
  })

  if (!proposedPlan) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontFamily: typography.family.regular, color: colors.textMuted }}>No plan to preview.</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: spacing.base }}>
          <Text style={{ fontFamily: typography.family.semiBold, color: colors.primary }}>Go back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    )
  }

  const sortedDays = [...proposedPlan.days].sort((a, b) => ((a.dayOfWeek + 6) % 7) - ((b.dayOfWeek + 6) % 7))

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: spacing.base, gap: spacing.md }}>
        <TouchableOpacity onPress={() => router.back()} accessibilityLabel="Go back" accessibilityRole="button">
          <Text style={{ fontFamily: typography.family.bold, fontSize: typography.size.title, color: colors.primary }}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: typography.family.extraBold, fontSize: typography.size.xl, color: colors.textPrimary }}>
            Your AI Plan
          </Text>
          <Text style={{ fontFamily: typography.family.regular, fontSize: typography.size.base, color: colors.textMuted }}>
            Review before activating
          </Text>
        </View>
        <Text style={{ fontSize: typography.size['2xl'] }}>✨</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.base, gap: spacing.base, paddingBottom: 120 }}>
        {/* Plan name */}
        <View style={{
          backgroundColor: colors.surface,
          borderRadius: radius.lg,
          padding: spacing.base,
          borderLeftWidth: 3,
          borderLeftColor: colors.primary,
        }}>
          <Text style={{ fontFamily: typography.family.semiBold, fontSize: typography.size.xs, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1 }}>
            Plan name
          </Text>
          <Text style={{ fontFamily: typography.family.extraBold, fontSize: typography.size['2xl'], color: colors.textPrimary, marginTop: 2 }}>
            {proposedPlan.name}
          </Text>
          <Text style={{ fontFamily: typography.family.regular, fontSize: typography.size.base, color: colors.textMuted, marginTop: 4 }}>
            {sortedDays.map((d) => DAY_NAMES[d.dayOfWeek]).join(' · ')} · {proposedPlan.days.length} sessions/week
          </Text>
        </View>

        {/* Day cards */}
        {sortedDays.map((day, idx) => (
          <View key={idx} style={{
            backgroundColor: colors.surface,
            borderRadius: radius.lg,
            overflow: 'hidden',
          }}>
            {/* Day header */}
            <View style={{ padding: spacing.base, gap: spacing.xs }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <View style={{
                  backgroundColor: colors.primary,
                  borderRadius: radius.sm,
                  paddingVertical: 2,
                  paddingHorizontal: spacing.sm,
                }}>
                  <Text style={{ fontFamily: typography.family.bold, fontSize: typography.size.xs, color: '#FFFFFF' }}>
                    {DAY_NAMES[day.dayOfWeek]}
                  </Text>
                </View>
                <Text style={{ fontFamily: typography.family.extraBold, fontSize: typography.size.xl, color: colors.textPrimary, flex: 1 }}>
                  {day.workoutName}
                </Text>
              </View>

              <Text style={{ fontFamily: typography.family.regular, fontSize: typography.size.base, color: colors.textMuted }}>
                ~{day.estimatedDuration} min
              </Text>

              {/* Muscle tags */}
              {day.muscleGroups.length > 0 && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
                  {day.muscleGroups.map((mg) => (
                    <View key={mg} style={{
                      backgroundColor: `${colors.primary}18`,
                      borderRadius: radius.pill,
                      paddingHorizontal: spacing.sm,
                      paddingVertical: 2,
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

            {/* Exercises */}
            <View style={{ padding: spacing.base, gap: spacing.sm }}>
              {day.exercises.map((ex, i) => (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                  <View style={{
                    width: 26, height: 26, borderRadius: 13,
                    backgroundColor: colors.surface2,
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Text style={{ fontFamily: typography.family.bold, fontSize: typography.size.xs, color: colors.textMuted }}>
                      {i + 1}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: typography.family.semiBold, fontSize: typography.size.body, color: colors.textPrimary }}>
                      {ex.exerciseName}
                    </Text>
                    <Text style={{ fontFamily: typography.family.regular, fontSize: typography.size.base, color: colors.textMuted }}>
                      {ex.defaultSets} sets · {ex.defaultReps} reps · {ex.defaultRestSeconds}s rest
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Bottom actions */}
      <View style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        backgroundColor: colors.background,
        padding: spacing.base,
        gap: spacing.sm,
        borderTopWidth: 1,
        borderTopColor: colors.surface2,
      }}>
        <Button
          label="Activate this plan →"
          onPress={() => acceptPlan.mutate(proposedPlan)}
          loading={acceptPlan.isPending}
        />
        <Button
          label="Ask for changes"
          variant="secondary"
          onPress={() => router.back()}
        />
      </View>
    </SafeAreaView>
  )
}
