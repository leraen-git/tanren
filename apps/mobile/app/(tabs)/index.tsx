import { SafeAreaView } from 'react-native-safe-area-context'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native'
import { router, useFocusEffect } from 'expo-router'
import { useTheme } from '@/theme/ThemeContext'
import { StatCard } from '@/components/StatCard'
import { SkeletonCard } from '@/components/SkeletonCard'
import { trpc } from '@/lib/trpc'
import { colors as tokenColors } from '@/theme/tokens'
import { useTranslation } from 'react-i18next'
import { MealDetailModal, MEAL_ICONS, sortMeals, type DietMeal } from '@/components/MealDetailModal'

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const DAY_NAMES_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']


export default function HomeScreen() {
  const { colors, typography, spacing, radius } = useTheme()
  const { t } = useTranslation()

  function getGreeting(): string {
    const hour = new Date().getHours()
    if (hour < 12) return t('home.greeting_morning')
    if (hour < 17) return t('home.greeting_afternoon')
    return t('home.greeting_evening')
  }
  const { data: user, isLoading: userLoading } = trpc.users.me.useQuery()
  const { data: activePlan, refetch: refetchPlan, isRefetching } = trpc.plans.active.useQuery()
  // todayMeals is a lightweight endpoint — only today's day, no full rawPlan JSON.
  // staleTime: Infinity because the plan never changes unless the user explicitly
  // regenerates or deletes it (both mutations invalidate this query).
  const { data: dietToday } = trpc.diet.todayMeals.useQuery(undefined, { staleTime: Infinity })

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

  // Today tab logic — only rendered when both workout plan AND diet plan are active
  const showTodayTabs = !!activePlan && !!dietToday
  const todayJsDow = new Date().getDay()
  const todayPlanDays = (activePlan?.days ?? []).filter((d) => d.dayOfWeek === todayJsDow)
  const isTodayWorkoutDone =
    todayPlanDays.length > 0 && todayPlanDays.every((d) => doneTemplateIds.has(d.workoutTemplateId))
  // True when today has a workout that hasn't been done yet → compact/hero mode
  const isTodayWorkout = nextWorkout?.dayOfWeek === todayJsDow && !isTodayWorkoutDone

  const [activeTab, setActiveTab] = useState<'workout' | 'diet'>('workout')
  const [selectedMeal, setSelectedMeal] = useState<DietMeal | null>(null)
  const hasManuallySet = useRef(false)

  // Auto-default to diet tab when today's workout is done (respect manual overrides)
  useEffect(() => {
    if (!hasManuallySet.current && isTodayWorkoutDone) setActiveTab('diet')
  }, [isTodayWorkoutDone])

  // Reset manual override when date changes (checked on each focus)
  const lastDateRef = useRef(new Date().toDateString())
  useFocusEffect(useCallback(() => {
    const today = new Date().toDateString()
    if (today !== lastDateRef.current) {
      lastDateRef.current = today
      hasManuallySet.current = false
    }
  }, []))

  const handleTabChange = (tab: 'workout' | 'diet') => {
    hasManuallySet.current = true
    setActiveTab(tab)
  }

  // todayDietDay comes directly from the server — no client-side JSONB traversal needed
  const todayDietDay = dietToday?.todayDay ?? null

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: colors.background }}>
      <MealDetailModal meal={selectedMeal} onClose={() => setSelectedMeal(null)} />
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

        {/* Today tab toggle — only when both plans are active */}
        {showTodayTabs && (
          <View style={{
            flexDirection: 'row',
            backgroundColor: colors.surface2,
            borderRadius: radius.lg,
            padding: 4,
          }}>
            {(['workout', 'diet'] as const).map((tab) => (
              <TouchableOpacity
                key={tab}
                onPress={() => handleTabChange(tab)}
                style={{
                  flex: 1,
                  paddingVertical: spacing.sm,
                  borderRadius: radius.md,
                  alignItems: 'center',
                  backgroundColor: activeTab === tab ? colors.background : 'transparent',
                }}
                accessibilityLabel={tab === 'workout' ? "Today's workout" : "Today's diet"}
                accessibilityRole="tab"
              >
                <Text style={{
                  fontFamily: typography.family.bold,
                  fontSize: typography.size.base,
                  color: activeTab === tab ? colors.textPrimary : colors.textMuted,
                }}>
                  {tab === 'workout' ? `${t('home.workout')}${isTodayWorkoutDone ? ' ✓' : ''}` : t('home.diet')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Diet today view */}
        {showTodayTabs && activeTab === 'diet' && (
          <View style={{ gap: spacing.md }}>
            {todayDietDay ? (
              <>
                {/* Day theme + macro targets */}
                <View style={{
                  backgroundColor: colors.surface,
                  borderRadius: radius.lg,
                  padding: spacing.base,
                  gap: spacing.sm,
                }}>
                  <Text style={{ fontFamily: typography.family.bold, fontSize: typography.size.xl, color: colors.textPrimary }}>
                    {todayDietDay.theme}
                  </Text>
                  <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                    {[
                      { label: 'Calories', value: `${todayDietDay.totalCalories} kcal` },
                      { label: 'Protein', value: `${todayDietDay.totalProtein}g` },
                      { label: 'Carbs', value: `${todayDietDay.totalCarbs}g` },
                      { label: 'Fat', value: `${todayDietDay.totalFat}g` },
                    ].map(({ label, value }) => (
                      <View key={label} style={{
                        flex: 1, backgroundColor: colors.surface2,
                        borderRadius: radius.md, padding: spacing.sm, alignItems: 'center',
                      }}>
                        <Text style={{ fontFamily: typography.family.regular, fontSize: typography.size.xs, color: colors.textMuted }}>{label}</Text>
                        <Text style={{ fontFamily: typography.family.bold, fontSize: typography.size.body, color: colors.textPrimary }}>{value}</Text>
                      </View>
                    ))}
                  </View>
                </View>

                {/* Meals — sorted breakfast→lunch→snack→dinner→dessert */}
                {sortMeals(todayDietDay.meals).map((meal: any, i: number) => (
                  <TouchableOpacity
                    key={i}
                    onPress={() => setSelectedMeal(meal as DietMeal)}
                    style={{
                      backgroundColor: colors.surface,
                      borderRadius: radius.md,
                      padding: spacing.base,
                      gap: spacing.xs,
                    }}
                    accessibilityLabel={`${meal.name}, tap for recipe`}
                    accessibilityRole="button"
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                        <Text style={{ fontSize: 14 }}>{MEAL_ICONS[meal.type] ?? '🍴'}</Text>
                        <Text style={{ fontFamily: typography.family.semiBold, fontSize: typography.size.xs, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1 }}>
                          {meal.type}
                        </Text>
                      </View>
                      <Text style={{ fontFamily: typography.family.regular, fontSize: typography.size.xs, color: colors.textMuted }}>
                        {meal.calories} kcal
                      </Text>
                    </View>
                    <Text style={{ fontFamily: typography.family.bold, fontSize: typography.size.body, color: colors.textPrimary }}>
                      {meal.name}
                    </Text>
                    <Text style={{ fontFamily: typography.family.regular, fontSize: typography.size.xs, color: colors.textMuted }}>
                      P {meal.protein}g · C {meal.carbs}g · F {meal.fat}g
                      {(meal.ingredients?.length ?? 0) > 0 ? ' · 📖 recipe' : ''}
                    </Text>
                  </TouchableOpacity>
                ))}

              </>
            ) : (
              <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.xl, alignItems: 'center', gap: spacing.sm }}>
                <Text style={{ fontSize: 32 }}>🥗</Text>
                <Text style={{ fontFamily: typography.family.bold, fontSize: typography.size.body, color: colors.textMuted, textAlign: 'center' }}>
                  {t('home.noMealPlanToday')}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Workout content — shown when no tab toggle, or workout tab is active */}
        {(!showTodayTabs || activeTab === 'workout') && (
          <>

        {/* Active plan banner */}
        {activePlan ? (
          isTodayWorkout ? (
            // Compact single-line banner when today's workout is pending
            <View style={{
              backgroundColor: colors.surface,
              borderRadius: radius.md,
              paddingVertical: spacing.sm,
              paddingHorizontal: spacing.base,
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.sm,
              borderLeftWidth: 3,
              borderLeftColor: colors.primary,
            }}>
              <Text style={{ fontFamily: typography.family.semiBold, fontSize: typography.size.xs, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1 }}>
                {t('home.plan')}
              </Text>
              <Text style={{ fontFamily: typography.family.bold, fontSize: typography.size.base, color: colors.textPrimary, flex: 1 }} numberOfLines={1}>
                {activePlan.name}
              </Text>
              <Text style={{ fontFamily: typography.family.regular, fontSize: typography.size.xs, color: colors.textMuted }}>
                {activePlan.days.map((d) => DAY_NAMES[d.dayOfWeek]).join(' · ')}
              </Text>
            </View>
          ) : (
            // Full banner when no workout today or workout already done
            <View style={{
              backgroundColor: colors.surface,
              borderRadius: radius.md,
              padding: spacing.base,
              borderLeftWidth: 3,
              borderLeftColor: colors.primary,
            }}>
              <Text style={{ fontFamily: typography.family.semiBold, fontSize: typography.size.xs, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1 }}>
                {t('home.activePlan')}
              </Text>
              <Text style={{ fontFamily: typography.family.bold, fontSize: typography.size.xl, color: colors.textPrimary, marginTop: 2 }}>
                {activePlan.name}
              </Text>
              <Text style={{ fontFamily: typography.family.regular, fontSize: typography.size.base, color: colors.textMuted, marginTop: 2 }}>
                {activePlan.days.map((d) => DAY_NAMES[d.dayOfWeek]).join(' · ')}
              </Text>
            </View>
          )
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
                  {t('home.noActivePlan')}
                </Text>
                <Text style={{ fontFamily: typography.family.regular, fontSize: typography.size.body, color: colors.textMuted, textAlign: 'center' }}>
                  {t('home.noActivePlanDesc')}
                </Text>
              </View>
              <View style={{
                backgroundColor: colors.primary,
                borderRadius: radius.lg,
                paddingVertical: spacing.md,
                paddingHorizontal: spacing.xl,
              }}>
                <Text style={{ fontFamily: typography.family.bold, fontSize: typography.size.body, color: tokenColors.white }}>
                  {t('home.createPlan')}
                </Text>
              </View>
            </TouchableOpacity>

            {/* AI divider */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <View style={{ flex: 1, height: 1, backgroundColor: colors.surface2 }} />
              <Text style={{ fontFamily: typography.family.regular, fontSize: typography.size.base, color: colors.textMuted }}>{t('common.or')}</Text>
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
                  {t('home.generatePlan')}
                </Text>
                <Text style={{ fontFamily: typography.family.regular, fontSize: typography.size.base, color: colors.textMuted }}>
                  {t('home.generatePlanDesc')}
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
                {t('home.justStart')}<Text style={{ fontFamily: typography.family.semiBold, color: colors.primary }}>{t('home.justStartLink')}</Text>
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Stats — hidden when today's workout is pending (give space to hero card) */}
        {activePlan && !isTodayWorkout && (
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <StatCard
              label={t('home.thisWeek')}
              value={stats ? `${stats.sessionsThisWeek}/${stats.plannedThisWeek}` : '—'}
              trend={stats && stats.sessionsThisWeek >= stats.plannedThisWeek ? 'up' : 'neutral'}
            />
            <StatCard
              label={t('home.streak')}
              value={stats ? `${stats.streak}w` : '—'}
              trend={stats && stats.streak > 0 ? 'up' : 'neutral'}
            />
            <StatCard
              label={t('home.lastPRs')}
              value={lastSessionPRCount != null ? String(lastSessionPRCount) : '—'}
              trend={lastSessionPRCount != null && lastSessionPRCount > 0 ? 'up' : 'neutral'}
            />
          </View>
        )}

        {/* Rest day notice */}
        {activePlan && todayPlanDays.length === 0 && !isTodayWorkoutDone && (
          <View style={{
            backgroundColor: colors.surface,
            borderRadius: radius.lg,
            padding: spacing.xl,
            alignItems: 'center',
            gap: spacing.sm,
          }}>
            <Text style={{ fontSize: 40 }}>😴</Text>
            <Text style={{ fontFamily: typography.family.bold, fontSize: typography.size.xl, color: colors.textPrimary }}>
              {t('home.restDay')}
            </Text>
            <Text style={{ fontFamily: typography.family.regular, fontSize: typography.size.body, color: colors.textMuted, textAlign: 'center' }}>
              {t('home.restDayDesc')}
            </Text>
          </View>
        )}

        {/* Next workout — full detail */}
        {nextWorkout ? (
          <View style={{ gap: spacing.md }}>
            <Text style={{ fontFamily: typography.family.bold, fontSize: typography.size.xl, color: colors.textPrimary }}>
              {isTodayWorkout ? t('home.todayWorkout') : t('home.nextWorkout')}
            </Text>

            <View style={{
              backgroundColor: colors.surface,
              borderRadius: radius.lg,
              overflow: 'hidden',
            }}>
              {/* Header */}
              <View style={{ padding: spacing.base, gap: spacing.xs }}>
                <Text style={{ fontFamily: typography.family.extraBold, fontSize: isTodayWorkout ? typography.size['3xl'] : typography.size['2xl'], color: colors.textPrimary }}>
                  {nextWorkout.workoutName}
                </Text>
                <Text style={{ fontFamily: typography.family.regular, fontSize: typography.size.body, color: colors.textMuted }}>
                  {isTodayWorkout ? `${nextWorkout.estimatedDuration} min` : `${DAY_NAMES_FULL[nextWorkout.dayOfWeek]} · ${nextWorkout.estimatedDuration} min`}
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

              {/* Start button — larger when today's workout */}
              <TouchableOpacity
                onPress={() => router.push(`/workout/preview?templateId=${nextWorkout.workoutTemplateId}` as any)}
                style={{
                  backgroundColor: colors.primary,
                  margin: spacing.base,
                  marginTop: 0,
                  borderRadius: radius.lg,
                  paddingVertical: isTodayWorkout ? spacing.xl : spacing.lg,
                  alignItems: 'center',
                }}
                accessibilityLabel={`Start ${nextWorkout.workoutName}`}
                accessibilityRole="button"
              >
                <Text style={{ fontFamily: typography.family.extraBold, fontSize: isTodayWorkout ? typography.size['3xl'] : typography.size['2xl'], color: '#FFFFFF' }}>
                  {isTodayWorkout ? t('home.startNow') : t('home.startWorkout')}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Other workouts this week */}
            {remainingWorkouts.length > 0 && (
              <View style={{ gap: spacing.sm }}>
                <Text style={{ fontFamily: typography.family.semiBold, fontSize: typography.size.base, color: colors.textMuted }}>
                  {t('home.alsoThisWeek')}
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
                {t('home.allDoneThisWeek')}
              </Text>
              <Text style={{ fontFamily: typography.family.regular, fontSize: typography.size.body, color: colors.textMuted, textAlign: 'center' }}>
                {t('home.allDoneDesc')}
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
                    {t('home.yourNextSession')}
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
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
