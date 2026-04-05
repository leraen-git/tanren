import { SafeAreaView } from 'react-native-safe-area-context'
import React, { useCallback } from 'react'
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native'
import { router, useFocusEffect } from 'expo-router'
import { useTheme } from '@/theme/ThemeContext'
import { StatCard } from '@/components/StatCard'
import { SkeletonCard } from '@/components/SkeletonCard'
import { trpc } from '@/lib/trpc'
import { colors as tokenColors } from '@/theme/tokens'

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const DAY_NAMES_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

export default function HomeScreen() {
  const { colors, typography, spacing, radius } = useTheme()
  const { data: user, isLoading: userLoading } = trpc.users.me.useQuery()
  const { data: activePlan, refetch: refetchPlan, isRefetching } = trpc.plans.active.useQuery()

  useFocusEffect(useCallback(() => { refetchPlan() }, []))
  const { data: lastSessionPRCount } = trpc.progress.lastSessionPRCount.useQuery()

  const nextWorkout = activePlan?.stats.nextWorkout
  const { data: workoutDetail } = trpc.workouts.detail.useQuery(
    { id: nextWorkout?.workoutTemplateId ?? '' },
    { enabled: !!nextWorkout?.workoutTemplateId },
  )

  const stats = activePlan?.stats

  // Remaining workouts this week: planned days not yet done, excluding the next one
  const doneTemplateIds = new Set(stats?.doneTemplateIds ?? [])
  const remainingWorkouts = (activePlan?.days ?? [])
    .filter((d) => !doneTemplateIds.has(d.workoutTemplateId) && d.workoutTemplateId !== nextWorkout?.workoutTemplateId)
    .sort((a, b) => {
      const todayDow = new Date().getDay()
      return ((a.dayOfWeek - todayDow + 7) % 7) - ((b.dayOfWeek - todayDow + 7) % 7)
    })

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={{ padding: spacing.base, gap: spacing.lg }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetchPlan} tintColor={colors.primary} />}
      >
        {/* Greeting */}
        <View style={{ gap: 2 }}>
          <Text style={{ fontFamily: typography.family.regular, fontSize: typography.size.body, color: colors.textMuted }}>
            {getGreeting()},
          </Text>
          {userLoading ? (
            <SkeletonCard height={36} />
          ) : (
            <Text style={{ fontFamily: typography.family.extraBold, fontSize: typography.size['3xl'], color: colors.textPrimary }}>
              {user?.name.split(' ')[0] ?? 'Athlete'} 👋
            </Text>
          )}
        </View>

        {/* Active plan banner */}
        {activePlan ? (
          <View style={{
            backgroundColor: colors.surface,
            borderRadius: radius.md,
            padding: spacing.base,
            borderLeftWidth: 3,
            borderLeftColor: colors.primary,
          }}>
            <Text style={{ fontFamily: typography.family.semiBold, fontSize: typography.size.xs, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1 }}>
              Active plan
            </Text>
            <Text style={{ fontFamily: typography.family.bold, fontSize: typography.size.xl, color: colors.textPrimary, marginTop: 2 }}>
              {activePlan.name}
            </Text>
            <Text style={{ fontFamily: typography.family.regular, fontSize: typography.size.base, color: colors.textMuted, marginTop: 2 }}>
              {activePlan.days.map((d) => DAY_NAMES[d.dayOfWeek]).join(' · ')}
            </Text>
          </View>
        ) : (
          <View style={{ gap: spacing.md }}>
            {/* Hero: no plan */}
            <TouchableOpacity
              onPress={() => router.push('/plans/create' as any)}
              style={{
                backgroundColor: colors.surface,
                borderRadius: radius.lg,
                padding: spacing.xl,
                alignItems: 'center',
                gap: spacing.md,
                borderWidth: 2,
                borderColor: colors.primary,
                borderStyle: 'dashed',
              }}
              accessibilityLabel="Create a workout plan"
              accessibilityRole="button"
            >
              <Text style={{ fontSize: 40 }}>📋</Text>
              <View style={{ alignItems: 'center', gap: spacing.xs }}>
                <Text style={{ fontFamily: typography.family.extraBold, fontSize: typography.size.xl, color: colors.textPrimary }}>
                  No active plan
                </Text>
                <Text style={{ fontFamily: typography.family.regular, fontSize: typography.size.body, color: colors.textMuted, textAlign: 'center' }}>
                  Create your first workout plan and start tracking your progress.
                </Text>
              </View>
              <View style={{
                backgroundColor: colors.primary,
                borderRadius: radius.lg,
                paddingVertical: spacing.md,
                paddingHorizontal: spacing.xl,
              }}>
                <Text style={{ fontFamily: typography.family.bold, fontSize: typography.size.body, color: tokenColors.white }}>
                  Create a plan →
                </Text>
              </View>
            </TouchableOpacity>

            {/* AI divider */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <View style={{ flex: 1, height: 1, backgroundColor: colors.surface2 }} />
              <Text style={{ fontFamily: typography.family.regular, fontSize: typography.size.base, color: colors.textMuted }}>or</Text>
              <View style={{ flex: 1, height: 1, backgroundColor: colors.surface2 }} />
            </View>

            {/* AI generate button */}
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

            {/* Just start an exercise */}
            <TouchableOpacity
              onPress={() => router.push('/exercise/quick' as any)}
              style={{ alignItems: 'center', paddingVertical: spacing.sm }}
              accessibilityLabel="Just start an exercise"
              accessibilityRole="button"
            >
              <Text style={{ fontFamily: typography.family.regular, fontSize: typography.size.base, color: colors.textMuted }}>
                or <Text style={{ fontFamily: typography.family.semiBold, color: colors.primary }}>just start an exercise</Text>
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Stats */}
        {activePlan && (
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <StatCard
              label="This week"
              value={stats ? `${stats.sessionsThisWeek}/${stats.plannedThisWeek}` : '—'}
              trend={stats && stats.sessionsThisWeek >= stats.plannedThisWeek ? 'up' : 'neutral'}
            />
            <StatCard
              label="Streak"
              value={stats ? `${stats.streak}w` : '—'}
              trend={stats && stats.streak > 0 ? 'up' : 'neutral'}
            />
            <StatCard
              label="Last session PRs"
              value={lastSessionPRCount != null ? String(lastSessionPRCount) : '—'}
              trend={lastSessionPRCount != null && lastSessionPRCount > 0 ? 'up' : 'neutral'}
            />
          </View>
        )}

        {/* Next workout — full detail */}
        {nextWorkout ? (
          <View style={{ gap: spacing.md }}>
            <Text style={{ fontFamily: typography.family.bold, fontSize: typography.size.xl, color: colors.textPrimary }}>
              Next workout
            </Text>

            <View style={{
              backgroundColor: colors.surface,
              borderRadius: radius.lg,
              overflow: 'hidden',
            }}>
              {/* Header */}
              <View style={{ padding: spacing.base, gap: spacing.xs }}>
                <Text style={{ fontFamily: typography.family.extraBold, fontSize: typography.size['2xl'], color: colors.textPrimary }}>
                  {nextWorkout.workoutName}
                </Text>
                <Text style={{ fontFamily: typography.family.regular, fontSize: typography.size.body, color: colors.textMuted }}>
                  {DAY_NAMES_FULL[nextWorkout.dayOfWeek]} · {nextWorkout.estimatedDuration} min
                </Text>

                {/* Muscle group tags */}
                {nextWorkout.muscleGroups && nextWorkout.muscleGroups.length > 0 && (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.xs }}>
                    {nextWorkout.muscleGroups.map((mg) => (
                      <View key={mg} style={{
                        backgroundColor: `${colors.primary}18`,
                        borderRadius: radius.pill,
                        paddingHorizontal: spacing.sm,
                        paddingVertical: 3,
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
              <View style={{ height: 1, backgroundColor: colors.surface2, marginHorizontal: spacing.base }} />

              {/* Exercise list */}
              <View style={{ padding: spacing.base, gap: spacing.sm }}>
                {workoutDetail ? (
                  workoutDetail.exercises.map((ex, i) => (
                    <View key={ex.id} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                      <View style={{
                        width: 28,
                        height: 28,
                        borderRadius: 14,
                        backgroundColor: colors.surface2,
                        alignItems: 'center',
                        justifyContent: 'center',
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
                          {ex.defaultSets} sets · {ex.defaultReps} reps
                          {ex.defaultWeight > 0 ? ` · ${ex.defaultWeight}kg` : ''}
                        </Text>
                      </View>
                    </View>
                  ))
                ) : (
                  <>
                    <SkeletonCard height={40} />
                    <SkeletonCard height={40} />
                    <SkeletonCard height={40} />
                  </>
                )}
              </View>

              {/* Big Start button */}
              <TouchableOpacity
                onPress={() => router.push(`/workout/preview?templateId=${nextWorkout.workoutTemplateId}` as any)}
                style={{
                  backgroundColor: colors.primary,
                  margin: spacing.base,
                  marginTop: 0,
                  borderRadius: radius.lg,
                  paddingVertical: spacing.lg,
                  alignItems: 'center',
                }}
                accessibilityLabel={`Start ${nextWorkout.workoutName}`}
                accessibilityRole="button"
              >
                <Text style={{ fontFamily: typography.family.extraBold, fontSize: typography.size['2xl'], color: '#FFFFFF' }}>
                  Start workout →
                </Text>
              </TouchableOpacity>
            </View>

            {/* Other workouts this week */}
            {remainingWorkouts.length > 0 && (
              <View style={{ gap: spacing.sm }}>
                <Text style={{ fontFamily: typography.family.semiBold, fontSize: typography.size.base, color: colors.textMuted }}>
                  Also this week
                </Text>
                {remainingWorkouts.map((d) => (
                  <TouchableOpacity
                    key={d.workoutTemplateId}
                    onPress={() => router.push(`/workout/preview?templateId=${d.workoutTemplateId}` as any)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: colors.surface,
                      borderRadius: radius.md,
                      padding: spacing.md,
                      gap: spacing.md,
                    }}
                    accessibilityLabel={`Start ${d.workoutName}`}
                    accessibilityRole="button"
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: typography.family.bold, fontSize: typography.size.body, color: colors.textPrimary }}>
                        {d.workoutName}
                      </Text>
                      <Text style={{ fontFamily: typography.family.regular, fontSize: typography.size.base, color: colors.textMuted }}>
                        {DAY_NAMES_FULL[d.dayOfWeek]} · {d.estimatedDuration} min
                      </Text>
                    </View>
                    <Text style={{ fontFamily: typography.family.bold, fontSize: typography.size.title, color: colors.primary }}>→</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        ) : activePlan ? (
          /* All done this week */
          <View style={{ gap: spacing.md }}>
            <View style={{
              backgroundColor: colors.surface,
              borderRadius: radius.lg,
              padding: spacing.xl,
              alignItems: 'center',
              gap: spacing.sm,
            }}>
              <Text style={{ fontSize: 40 }}>🎉</Text>
              <Text style={{ fontFamily: typography.family.bold, fontSize: typography.size.xl, color: colors.textPrimary }}>
                All done this week!
              </Text>
              <Text style={{ fontFamily: typography.family.regular, fontSize: typography.size.body, color: colors.textMuted, textAlign: 'center' }}>
                Rest up — you've earned it.
              </Text>
            </View>

            {/* Next upcoming session (first day of plan starting from tomorrow) */}
            {(() => {
              const todayDow = new Date().getDay()
              const nextUpcoming = [...activePlan.days].sort((a, b) => {
                const aDiff = (a.dayOfWeek - todayDow + 6) % 7  // +6 so today itself sorts last
                const bDiff = (b.dayOfWeek - todayDow + 6) % 7
                return aDiff - bDiff
              })[0]
              if (!nextUpcoming) return null
              return (
                <View style={{ gap: spacing.sm }}>
                  <Text style={{ fontFamily: typography.family.semiBold, fontSize: typography.size.base, color: colors.textMuted }}>
                    Your next session
                  </Text>
                  <TouchableOpacity
                    onPress={() => router.push(`/workout/preview?templateId=${nextUpcoming.workoutTemplateId}` as any)}
                    style={{
                      backgroundColor: colors.surface,
                      borderRadius: radius.lg,
                      padding: spacing.base,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: spacing.md,
                    }}
                    accessibilityLabel={`Start ${nextUpcoming.workoutName}`}
                    accessibilityRole="button"
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: typography.family.bold, fontSize: typography.size.xl, color: colors.textPrimary }}>
                        {nextUpcoming.workoutName}
                      </Text>
                      <Text style={{ fontFamily: typography.family.regular, fontSize: typography.size.body, color: colors.textMuted }}>
                        {DAY_NAMES_FULL[nextUpcoming.dayOfWeek]} · {nextUpcoming.estimatedDuration} min
                      </Text>
                    </View>
                    <Text style={{ fontFamily: typography.family.bold, fontSize: typography.size.title, color: colors.primary }}>→</Text>
                  </TouchableOpacity>
                </View>
              )
            })()}
          </View>
        ) : (
          /* No plan — CTA handled above in no-plan block */
          null
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
