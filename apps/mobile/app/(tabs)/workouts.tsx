import { SafeAreaView } from 'react-native-safe-area-context'
import React from 'react'
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native'
import { router } from 'expo-router'
import { useTheme } from '@/theme/ThemeContext'
import { SkeletonCard } from '@/components/SkeletonCard'
import { trpc } from '@/lib/trpc'
import { colors as tokenColors } from '@/theme/tokens'
import { useTranslation } from 'react-i18next'

// dayOfWeek 0=Sun,1=Mon,...6=Sat → translation key
const DOW_KEY = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const

function SectionHeader({ title, onAdd, addLabel }: { title: string; onAdd: () => void; addLabel: string }) {
  const { colors, typography, spacing } = useTheme()
  const { t } = useTranslation()
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
      <Text style={{ fontFamily: typography.family.extraBold, fontSize: typography.size['2xl'], color: colors.textPrimary }}>
        {title}
      </Text>
      <TouchableOpacity onPress={onAdd} accessibilityLabel={addLabel} accessibilityRole="button">
        <Text style={{ fontFamily: typography.family.bold, fontSize: typography.size.body, color: colors.primary }}>
          {t('workout.addNew')}
        </Text>
      </TouchableOpacity>
    </View>
  )
}

export default function WorkoutsScreen() {
  const { colors, typography, spacing, radius } = useTheme()
  const { t } = useTranslation()

  const utils = trpc.useUtils()
  const { data: plans, isLoading: plansLoading, refetch: refetchPlans, isRefetching } = trpc.plans.list.useQuery()
  const { data: workouts, isLoading: workoutsLoading, refetch: refetchWorkouts } = trpc.workouts.list.useQuery()

  const activatePlan = trpc.plans.activate.useMutation({
    onSuccess: () => { utils.plans.list.invalidate(); utils.plans.active.invalidate() },
  })

  const activePlan = plans?.find((p) => p.isActive)
  const inactivePlans = plans?.filter((p) => !p.isActive) ?? []

  const refetch = () => { refetchPlans(); refetchWorkouts() }

  type PlanDay = { id: string; dayOfWeek: number; workoutName: string; workoutTemplateId: string; muscleGroups?: string[] }
  const sortedDays = (days: PlanDay[]) =>
    [...days].sort((a, b) => ((a.dayOfWeek + 6) % 7) - ((b.dayOfWeek + 6) % 7))

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={{ padding: spacing.base, gap: spacing.xl }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
      >
        {/* ─── Plans ──────────────────────────────────────────────── */}
        <View>
          <SectionHeader
            title={t('workout.myPlan')}
            onAdd={() => router.push('/plans/create' as any)}
            addLabel={t('workout.addNew')}
          />

          {plansLoading && <SkeletonCard height={120} />}

          {/* Active plan */}
          {activePlan && (
            <TouchableOpacity
              onPress={() => router.push(`/plans/create?id=${activePlan.id}` as any)}
              style={{
                backgroundColor: colors.surface,
                borderRadius: radius.lg,
                overflow: 'hidden',
                borderWidth: 1,
                borderColor: `${colors.primary}40`,
              }}
              accessibilityLabel={`${t('workout.myPlan')}: ${activePlan.name}`}
              accessibilityRole="button"
            >
              <View style={{ padding: spacing.base, gap: 4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                    <View style={{
                      backgroundColor: colors.primary,
                      borderRadius: radius.pill,
                      paddingHorizontal: spacing.sm,
                      paddingVertical: 2,
                    }}>
                      <Text style={{ fontFamily: typography.family.bold, fontSize: typography.size.xs, color: tokenColors.white }}>
                        {t('workout.activeBadge')}
                      </Text>
                    </View>
                  </View>
                  <Text style={{ fontFamily: typography.family.regular, fontSize: typography.size.xl, color: colors.textMuted }}>›</Text>
                </View>
                <Text style={{ fontFamily: typography.family.extraBold, fontSize: typography.size.xl, color: colors.textPrimary }}>
                  {activePlan.name}
                </Text>
                <Text style={{ fontFamily: typography.family.regular, fontSize: typography.size.base, color: colors.textMuted }}>
                  {t('workout.daysPerWeek', { count: activePlan.days.length })}
                </Text>
              </View>

              <View style={{ height: 1, backgroundColor: colors.surface2 }} />

              <View style={{ padding: spacing.base, gap: spacing.sm }}>
                {sortedDays(activePlan.days).map((d) => (
                  <View key={d.id} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                    <View style={{
                      width: 40, height: 40, borderRadius: radius.sm,
                      backgroundColor: `${colors.primary}18`,
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Text style={{ fontFamily: typography.family.bold, fontSize: typography.size.base, color: colors.primary }}>
                        {t(`days.${DOW_KEY[d.dayOfWeek]}`)}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: typography.family.semiBold, fontSize: typography.size.body, color: colors.textPrimary }}>
                        {d.workoutName}
                      </Text>
                      {d.muscleGroups && d.muscleGroups.length > 0 && (
                        <Text style={{ fontFamily: typography.family.regular, fontSize: typography.size.base, color: colors.textMuted }}>
                          {d.muscleGroups.slice(0, 3).join(' · ')}
                        </Text>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            </TouchableOpacity>
          )}

          {/* Inactive plans */}
          {inactivePlans.length > 0 && (
            <View style={{ marginTop: spacing.md, gap: spacing.sm }}>
              <Text style={{ fontFamily: typography.family.semiBold, fontSize: typography.size.base, color: colors.textMuted }}>
                {t('workout.otherPlans')}
              </Text>
              {inactivePlans.map((plan) => (
                <TouchableOpacity
                  key={plan.id}
                  onPress={() => router.push(`/plans/create?id=${plan.id}` as any)}
                  style={{
                    backgroundColor: colors.surface,
                    borderRadius: radius.lg,
                    borderWidth: 1,
                    borderColor: colors.surface2,
                    padding: spacing.base,
                    flexDirection: 'row',
                    alignItems: 'center',
                  }}
                  accessibilityLabel={plan.name}
                  accessibilityRole="button"
                >
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={{ fontFamily: typography.family.bold, fontSize: typography.size.body, color: colors.textPrimary }}>
                      {plan.name}
                    </Text>
                    <Text style={{ fontFamily: typography.family.regular, fontSize: typography.size.base, color: colors.textMuted }}>
                      {t('workout.daysPerWeek', { count: plan.days.length })}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={(e) => { e.stopPropagation?.(); activatePlan.mutate({ id: plan.id }) }}
                    style={{
                      backgroundColor: `${colors.primary}18`,
                      borderRadius: radius.sm,
                      paddingHorizontal: spacing.sm,
                      paddingVertical: spacing.xs,
                      marginRight: spacing.sm,
                    }}
                    accessibilityLabel={t('workout.activate')}
                    accessibilityRole="button"
                  >
                    <Text style={{ fontFamily: typography.family.semiBold, fontSize: typography.size.base, color: colors.primary }}>
                      {t('workout.activate')}
                    </Text>
                  </TouchableOpacity>
                  <Text style={{ fontFamily: typography.family.regular, fontSize: typography.size.xl, color: colors.textMuted }}>›</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {!plansLoading && !plans?.length && (
            <TouchableOpacity
              onPress={() => router.push('/plans/create' as any)}
              style={{
                backgroundColor: colors.surface,
                borderRadius: radius.lg,
                borderWidth: 1,
                borderColor: colors.surface2,
                borderStyle: 'dashed',
                padding: spacing.xl,
                alignItems: 'center',
                gap: spacing.sm,
              }}
              accessibilityLabel={t('workout.noPlanYet')}
              accessibilityRole="button"
            >
              <Text style={{ fontSize: typography.size['3xl'] }}>📋</Text>
              <Text style={{ fontFamily: typography.family.semiBold, fontSize: typography.size.body, color: colors.textPrimary }}>
                {t('workout.noPlanYet')}
              </Text>
              <Text style={{ fontFamily: typography.family.regular, fontSize: typography.size.base, color: colors.textMuted }}>
                {t('workout.noPlanYetDesc')}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ─── Workout templates ──────────────────────────────────── */}
        <View>
          <SectionHeader
            title={t('tabs.workouts')}
            onAdd={() => router.push('/workout/build' as any)}
            addLabel={t('workout.addNew')}
          />

          {workoutsLoading && [1, 2, 3].map((i) => <SkeletonCard key={i} height={72} />)}

          <View style={{ gap: spacing.sm }}>
            {workouts?.map((w) => (
              <TouchableOpacity
                key={w.id}
                onPress={() => router.push(`/workout/${w.id}` as any)}
                style={{
                  backgroundColor: colors.surface,
                  borderRadius: radius.lg,
                  borderWidth: 1,
                  borderColor: colors.surface2,
                  padding: spacing.base,
                  flexDirection: 'row',
                  alignItems: 'center',
                }}
                accessibilityLabel={w.name}
                accessibilityRole="button"
              >
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ fontFamily: typography.family.bold, fontSize: typography.size.body, color: colors.textPrimary }}>
                    {w.name}
                  </Text>
                  <Text style={{ fontFamily: typography.family.regular, fontSize: typography.size.base, color: colors.textMuted }}>
                    {w.muscleGroups.length > 0 ? `${w.muscleGroups.slice(0, 3).join(' · ')} · ` : ''}{w.estimatedDuration} {t('common.min')}
                  </Text>
                </View>
                <Text style={{ fontFamily: typography.family.regular, fontSize: typography.size.xl, color: colors.textMuted }}>›</Text>
              </TouchableOpacity>
            ))}
          </View>

          {!workoutsLoading && workouts?.length === 0 && (
            <TouchableOpacity
              onPress={() => router.push('/workout/build' as any)}
              style={{
                backgroundColor: colors.surface,
                borderRadius: radius.lg,
                borderWidth: 1,
                borderColor: colors.surface2,
                borderStyle: 'dashed',
                padding: spacing.xl,
                alignItems: 'center',
                gap: spacing.sm,
              }}
              accessibilityLabel={t('workout.noWorkoutsYet')}
              accessibilityRole="button"
            >
              <Text style={{ fontSize: typography.size['3xl'] }}>🏋️</Text>
              <Text style={{ fontFamily: typography.family.semiBold, fontSize: typography.size.body, color: colors.textPrimary }}>
                {t('workout.noWorkoutsYet')}
              </Text>
              <Text style={{ fontFamily: typography.family.regular, fontSize: typography.size.base, color: colors.textMuted }}>
                {t('workout.noWorkoutsYetDesc')}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
