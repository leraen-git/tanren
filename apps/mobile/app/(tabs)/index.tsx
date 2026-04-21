import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native'
import { router, useFocusEffect } from 'expo-router'
import { useTheme } from '@/theme/ThemeContext'
import { Screen } from '@/components/Screen'
import { StatsStrip } from '@/components/StatsStrip'
import { CornerAccent } from '@/components/CornerAccent'
import { MacroRow } from '@/components/MacroRow'
import { MealCard } from '@/components/MealCard'
import { SkeletonCard } from '@/components/SkeletonCard'
import { trpc } from '@/lib/trpc'
import { useTranslation } from 'react-i18next'
import { useGuestBannerVisible } from '@/contexts/GuestBannerContext'
import { MealDetailModal, sortMeals, type DietMeal } from '@/components/MealDetailModal'

const DAY_NAMES_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export default function HomeScreen() {
  const { tokens, typography, spacing } = useTheme()
  const { t } = useTranslation()
  const bannerVisible = useGuestBannerVisible()

  function getGreeting(): string {
    const hour = new Date().getHours()
    if (hour < 12) return t('home.greeting_morning')
    if (hour < 17) return t('home.greeting_afternoon')
    return t('home.greeting_evening')
  }

  const { data: user, isLoading: userLoading } = trpc.users.me.useQuery()
  const isGuest = user?.authProvider === 'guest'
  const { data: activePlan, refetch: refetchPlan, isRefetching } = trpc.plans.active.useQuery()
  const { data: dietToday } = trpc.diet.todayMeals.useQuery(undefined, { staleTime: Infinity })
  useFocusEffect(useCallback(() => { refetchPlan() }, []))
  const { data: lastSessionPRCount } = trpc.progress.lastSessionPRCount.useQuery()

  const nextWorkout = activePlan?.stats.nextWorkout
  const { data: workoutDetail } = trpc.workouts.detail.useQuery(
    { id: nextWorkout?.workoutTemplateId ?? '' },
    { enabled: !!nextWorkout?.workoutTemplateId },
  )

  const stats = activePlan?.stats
  const doneTemplateIds = new Set(stats?.doneTemplateIds ?? [])
  const remainingWorkouts = (activePlan?.days ?? [])
    .filter((d) => !doneTemplateIds.has(d.workoutTemplateId) && d.workoutTemplateId !== nextWorkout?.workoutTemplateId)
    .sort((a, b) => {
      const todayDow = new Date().getDay()
      return ((a.dayOfWeek - todayDow + 7) % 7) - ((b.dayOfWeek - todayDow + 7) % 7)
    })

  const showTodayTabs = !!activePlan && !!dietToday
  const todayJsDow = new Date().getDay()
  const todayPlanDays = (activePlan?.days ?? []).filter((d) => d.dayOfWeek === todayJsDow)
  const isTodayWorkoutDone = todayPlanDays.length > 0 && todayPlanDays.every((d) => doneTemplateIds.has(d.workoutTemplateId))
  const isTodayWorkout = nextWorkout?.dayOfWeek === todayJsDow && !isTodayWorkoutDone
  const isRestDay = !!activePlan && todayPlanDays.length === 0

  const [activeTab, setActiveTab] = useState<'workout' | 'diet'>('workout')
  const [selectedMeal, setSelectedMeal] = useState<DietMeal | null>(null)
  const hasManuallySet = useRef(false)

  useEffect(() => {
    if (hasManuallySet.current) return
    if (isRestDay || isTodayWorkoutDone) setActiveTab('diet')
  }, [isRestDay, isTodayWorkoutDone])

  const lastDateRef = useRef(new Date().toDateString())
  useFocusEffect(useCallback(() => {
    const today = new Date().toDateString()
    if (today !== lastDateRef.current) {
      lastDateRef.current = today
      hasManuallySet.current = false
    }
    if (!hasManuallySet.current && (isRestDay || isTodayWorkoutDone)) setActiveTab('diet')
  }, [isRestDay, isTodayWorkoutDone]))

  const handleTabChange = (tab: 'workout' | 'diet') => {
    hasManuallySet.current = true
    setActiveTab(tab)
  }

  const todayDietDay = dietToday?.todayDay ?? null
  const todayMealsSorted = useMemo(() => sortMeals((todayDietDay?.meals ?? []) as DietMeal[]), [todayDietDay?.meals])
  const { todayCalories, todayProtein, todayCarbs, todayFat } = useMemo(() => {
    let calories = 0, protein = 0, carbs = 0, fat = 0
    for (const m of todayMealsSorted) {
      calories += m.calories ?? 0
      protein += m.protein ?? 0
      carbs += m.carbs ?? 0
      fat += m.fat ?? 0
    }
    return { todayCalories: calories, todayProtein: protein, todayCarbs: carbs, todayFat: fat }
  }, [todayMealsSorted])

  return (
    <Screen showKanji kanjiChar="鍛" edges={bannerVisible ? [] : ['top']}>
      <MealDetailModal meal={selectedMeal} onClose={() => setSelectedMeal(null)} />
      <ScrollView
        contentContainerStyle={{ padding: spacing.base, gap: spacing.lg }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetchPlan} tintColor={tokens.accent} />}
      >
        {/* Greeting */}
        <View style={{ gap: 2 }}>
          <Text style={{
            fontFamily: typography.family.sansM,
            fontSize: 13,
            letterSpacing: 2,
            textTransform: 'uppercase',
            color: tokens.textMute,
          }}>
            {getGreeting()}
          </Text>
          {userLoading ? (
            <SkeletonCard height={36} />
          ) : (
            <Text style={{ fontFamily: typography.family.sansX, fontSize: 32, color: tokens.text }}>
              {user?.name.split(' ')[0] ?? 'Athlete'}
              <Text style={{ color: tokens.accent }}>.</Text>
            </Text>
          )}
        </View>

        {/* Stats strip */}
        {activePlan && (
          <StatsStrip
            stats={[
              {
                value: stats ? `${stats.sessionsThisWeek}/${stats.plannedThisWeek}` : '—',
                label: t('home.thisWeek'),
              },
              {
                value: stats ? `${stats.streak}` : '—',
                label: t('home.streak'),
                highlight: !!(stats && stats.streak > 0),
              },
              {
                value: lastSessionPRCount != null ? String(lastSessionPRCount) : '—',
                label: t('home.lastPRs'),
              },
            ]}
          />
        )}

        {/* Home tabs: Entraînement / Nutrition */}
        {showTodayTabs && (
          <View style={{ flexDirection: 'row', gap: spacing.lg }}>
            {(['workout', 'diet'] as const).map((tab) => {
              const isActive = activeTab === tab
              return (
                <TouchableOpacity
                  key={tab}
                  onPress={() => handleTabChange(tab)}
                  style={{ paddingBottom: spacing.sm, borderBottomWidth: isActive ? 2 : 0, borderBottomColor: tokens.accent }}
                  accessibilityLabel={tab === 'workout' ? t('home.workout') : t('home.diet')}
                  accessibilityRole="tab"
                >
                  <Text style={{
                    fontFamily: typography.family.sansB,
                    fontSize: 14,
                    letterSpacing: 1,
                    textTransform: 'uppercase',
                    color: isActive ? tokens.accent : tokens.textMute,
                  }}>
                    {tab === 'workout' ? t('home.workout') : t('home.diet')}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>
        )}

        {/* === DIET TAB === */}
        {showTodayTabs && activeTab === 'diet' && (
          <View style={{ gap: spacing.md }}>
            {todayDietDay ? (
              <>
                {/* Day header with macro row */}
                <View style={{ gap: spacing.md }}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                    <View>
                      <Text style={{
                        fontFamily: typography.family.sansM, fontSize: 10, letterSpacing: 1.6,
                        textTransform: 'uppercase', color: tokens.accent,
                      }}>
                        {t('diet.title')}
                      </Text>
                      <Text style={{ fontFamily: typography.family.sansX, fontSize: 22, color: tokens.text }}>
                        {todayDietDay.theme}
                      </Text>
                    </View>
                    <Text style={{ fontFamily: typography.family.sansX, fontSize: 22, color: tokens.accent }}>
                      {todayCalories}
                      <Text style={{ fontFamily: typography.family.sansM, fontSize: 11, color: tokens.textMute }}> kcal</Text>
                    </Text>
                  </View>
                  <MacroRow protein={todayProtein} carbs={todayCarbs} fat={todayFat} />
                </View>

                {/* Meal cards with red left border */}
                {todayMealsSorted.map((meal) => (
                  <MealCard
                    key={`${meal.type}-${meal.name}`}
                    typeLabel={t(`diet.mealType.${meal.type}`, { defaultValue: meal.type })}
                    name={meal.name}
                    calories={meal.calories ?? 0}
                    protein={meal.protein ?? 0}
                    carbs={meal.carbs ?? 0}
                    fat={meal.fat ?? 0}
                    onPress={() => setSelectedMeal(meal as DietMeal)}
                    accessibilityLabel={`${meal.name}, tap for recipe`}
                  />
                ))}
              </>
            ) : (
              <View style={{ borderWidth: 1, borderColor: tokens.border, padding: spacing.xl, alignItems: 'center' }}>
                <Text style={{ fontFamily: typography.family.sansB, fontSize: 14, color: tokens.textMute, textAlign: 'center', textTransform: 'uppercase', letterSpacing: 0.6 }}>
                  {t('home.noMealPlanToday')}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* === WORKOUT TAB === */}
        {(!showTodayTabs || activeTab === 'workout') && (
          <>
            {/* Workout complete */}
            {isTodayWorkoutDone && (
              <View style={{ borderWidth: 1, borderColor: tokens.green }}>
                <View style={{ padding: spacing.base, gap: spacing.xs }}>
                  <Text style={{
                    fontFamily: typography.family.sansM, fontSize: 10, letterSpacing: 1.6,
                    textTransform: 'uppercase', color: tokens.green,
                  }}>
                    {t('home.today') ?? 'Today'}
                  </Text>
                  <Text style={{ fontFamily: typography.family.sansX, fontSize: 22, color: tokens.text, textTransform: 'uppercase' }}>
                    {t('home.workoutComplete') ?? 'Workout complete'}
                  </Text>
                </View>
                {showTodayTabs && (
                  <TouchableOpacity
                    onPress={() => handleTabChange('diet')}
                    style={{ backgroundColor: tokens.accent, margin: spacing.base, marginTop: 0, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 4 }}
                    accessibilityLabel="View today's diet" accessibilityRole="button"
                  >
                    <Text style={{ fontFamily: typography.family.sansB, fontSize: 14, letterSpacing: 0.6, textTransform: 'uppercase', color: '#FFFFFF' }}>
                      {t('home.viewMeals') ?? 'View meals'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Rest day */}
            {isRestDay && (
              <View style={{ borderWidth: 1, borderColor: tokens.border, padding: spacing.xl, alignItems: 'center', gap: spacing.xs }}>
                <Text style={{ fontFamily: typography.family.sansX, fontSize: 24, color: tokens.text, textTransform: 'uppercase' }}>
                  {t('home.restDay')}
                </Text>
                <Text style={{ fontFamily: typography.family.sans, fontSize: 14, color: tokens.textMute, textAlign: 'center' }}>
                  {t('home.restDayDesc')}
                </Text>
              </View>
            )}

            {/* Today card with CornerAccent */}
            {nextWorkout && (
              <View style={{ gap: spacing.md }}>
                <View style={{ borderWidth: 1, borderColor: tokens.accent, overflow: 'hidden' }}>
                  <CornerAccent position="tl" size="md" />
                  <View style={{ padding: spacing.base, gap: spacing.sm }}>
                    <Text style={{
                      fontFamily: typography.family.sansM, fontSize: 10, letterSpacing: 1.6,
                      textTransform: 'uppercase', color: tokens.accent,
                    }}>
                      {isTodayWorkout ? (t('home.today') ?? 'Today') : DAY_NAMES_FULL[nextWorkout.dayOfWeek]}
                    </Text>
                    <Text style={{ fontFamily: typography.family.sansX, fontSize: 22, color: tokens.text, textTransform: 'uppercase' }}>
                      {nextWorkout.workoutName}
                    </Text>
                    <Text style={{ fontFamily: typography.family.sans, fontSize: 14, color: tokens.textMute }}>
                      {t('home.estimatedDuration') ?? 'Durée estimée'} · {nextWorkout.estimatedDuration} min
                    </Text>

                    {/* Muscle tags */}
                    {nextWorkout.muscleGroups && nextWorkout.muscleGroups.length > 0 && (
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
                        {nextWorkout.muscleGroups.map((mg) => (
                          <View key={mg} style={{
                            backgroundColor: `${tokens.accent}18`,
                            paddingHorizontal: spacing.sm,
                            paddingVertical: 3,
                          }}>
                            <Text style={{ fontFamily: typography.family.sansM, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: tokens.accent }}>
                              {mg}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}

                    {/* Exercise preview with arabic numbers */}
                    <View style={{ gap: spacing.xs, marginTop: spacing.sm, borderTopWidth: 1, borderTopColor: tokens.border, paddingTop: spacing.md }}>
                      {workoutDetail ? (
                        <>
                          {workoutDetail.exercises.slice(0, 3).map((ex, i) => (
                            <View key={ex.id} style={{ flexDirection: 'row', gap: spacing.sm }}>
                              <Text style={{ fontFamily: typography.family.sansX, fontSize: 14, color: tokens.accent, width: 20 }}>
                                {i + 1}.
                              </Text>
                              <Text style={{ fontFamily: typography.family.sans, fontSize: 14, color: tokens.text, flex: 1 }}>
                                {ex.exerciseName} · {ex.defaultSets}×{ex.defaultReps}
                                {ex.defaultWeight > 0 ? ` · ${ex.defaultWeight} kg` : ''}
                              </Text>
                            </View>
                          ))}
                          {workoutDetail.exercises.length > 3 && (
                            <Text style={{ fontFamily: typography.family.sans, fontSize: 14, color: tokens.textMute, fontStyle: 'italic', marginLeft: 20 }}>
                              +{workoutDetail.exercises.length - 3} {t('home.moreExercises') ?? 'autres exercices'}
                            </Text>
                          )}
                        </>
                      ) : (
                        <>
                          <SkeletonCard height={20} />
                          <SkeletonCard height={20} />
                          <SkeletonCard height={20} />
                        </>
                      )}
                    </View>

                    {/* CTA */}
                    <TouchableOpacity
                      onPress={() => router.push(`/workout/preview?templateId=${nextWorkout.workoutTemplateId}`)}
                      style={{ backgroundColor: tokens.accent, height: 52, alignItems: 'center', justifyContent: 'center', borderRadius: 4, marginTop: spacing.sm }}
                      accessibilityLabel={`Start ${nextWorkout.workoutName}`}
                      accessibilityRole="button"
                    >
                      <Text style={{ fontFamily: typography.family.sansB, fontSize: 15, letterSpacing: 0.6, textTransform: 'uppercase', color: '#FFFFFF' }}>
                        {isTodayWorkout ? t('home.startNow') : t('home.startWorkout')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* This week */}
                {remainingWorkouts.length > 0 && (
                  <View style={{ gap: spacing.sm }}>
                    <Text style={{
                      fontFamily: typography.family.sansM, fontSize: 10, letterSpacing: 1.6,
                      textTransform: 'uppercase', color: tokens.textMute,
                    }}>
                      {t('home.alsoThisWeek')}
                    </Text>
                    {remainingWorkouts.map((d) => (
                      <TouchableOpacity
                        key={d.workoutTemplateId}
                        onPress={() => router.push(`/workout/preview?templateId=${d.workoutTemplateId}`)}
                        style={{
                          borderWidth: 1, borderColor: tokens.border, padding: spacing.md,
                          flexDirection: 'row', alignItems: 'center',
                        }}
                        accessibilityLabel={`Start ${d.workoutName}`}
                        accessibilityRole="button"
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontFamily: typography.family.sansB, fontSize: 14, color: tokens.text, textTransform: 'uppercase' }}>
                            {d.workoutName}
                          </Text>
                          <Text style={{ fontFamily: typography.family.sans, fontSize: 12, color: tokens.textMute }}>
                            {DAY_NAMES_FULL[d.dayOfWeek]} · {d.estimatedDuration} min
                          </Text>
                        </View>
                        <Text style={{ fontFamily: typography.family.sansB, fontSize: 16, color: tokens.accent }}>›</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* No plan state */}
            {!activePlan && (
              <View style={{ gap: spacing.md }}>
                <TouchableOpacity
                  onPress={() => router.push('/plans/create')}
                  style={{
                    borderWidth: 2, borderColor: tokens.accent, borderStyle: 'dashed',
                    padding: spacing.xl, alignItems: 'center', gap: spacing.md,
                  }}
                  accessibilityLabel="Create a workout plan" accessibilityRole="button"
                >
                  <Text style={{ fontFamily: typography.family.sansX, fontSize: 20, color: tokens.text, textTransform: 'uppercase' }}>
                    {t('home.noActivePlan')}
                  </Text>
                  <Text style={{ fontFamily: typography.family.sans, fontSize: 14, color: tokens.textMute, textAlign: 'center' }}>
                    {t('home.noActivePlanDesc')}
                  </Text>
                  <View style={{ backgroundColor: tokens.accent, height: 48, paddingHorizontal: 24, alignItems: 'center', justifyContent: 'center', borderRadius: 4 }}>
                    <Text style={{ fontFamily: typography.family.sansB, fontSize: 14, letterSpacing: 0.6, textTransform: 'uppercase', color: '#FFFFFF' }}>
                      {t('home.createPlan')}
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* AI generate */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                  <View style={{ flex: 1, height: 1, backgroundColor: tokens.border }} />
                  <Text style={{ fontFamily: typography.family.sans, fontSize: 12, color: tokens.textMute }}>{t('common.or')}</Text>
                  <View style={{ flex: 1, height: 1, backgroundColor: tokens.border }} />
                </View>

                <TouchableOpacity
                  onPress={isGuest ? undefined : () => router.push('/plans/generate')}
                  disabled={isGuest}
                  style={{
                    borderWidth: 1, borderColor: tokens.border, padding: spacing.base,
                    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
                    opacity: isGuest ? 0.4 : 1,
                  }}
                  accessibilityLabel={isGuest ? t('guest.aiLocked') : t('home.generatePlan')}
                  accessibilityRole="button"
                >
                  <View style={{
                    width: 44, height: 44, backgroundColor: isGuest ? tokens.surface2 : `${tokens.accent}18`,
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Text style={{ fontFamily: typography.family.sansX, fontSize: 11, letterSpacing: 0.5, color: isGuest ? tokens.textMute : tokens.accent }}>AI</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: typography.family.sansB, fontSize: 14, color: isGuest ? tokens.textMute : tokens.text, textTransform: 'uppercase' }}>
                      {isGuest ? t('guest.aiLocked') : t('home.generatePlan')}
                    </Text>
                    <Text style={{ fontFamily: typography.family.sans, fontSize: 12, color: tokens.textMute }}>
                      {isGuest ? t('guest.aiLockedDesc') : t('home.generatePlanDesc')}
                    </Text>
                  </View>
                  <Text style={{ fontFamily: typography.family.sansB, fontSize: 16, color: isGuest ? tokens.textMute : tokens.accent }}>›</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => router.push('/exercise/quick')}
                  style={{ alignItems: 'center', paddingVertical: spacing.sm }}
                  accessibilityLabel="Just start an exercise" accessibilityRole="button"
                >
                  <Text style={{ fontFamily: typography.family.sans, fontSize: 12, color: tokens.textMute }}>
                    {t('home.justStart')}<Text style={{ fontFamily: typography.family.sansM, color: tokens.accent }}>{t('home.justStartLink')}</Text>
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* All done this week */}
            {activePlan && !nextWorkout && (
              <View style={{ gap: spacing.md }}>
                <View style={{ borderWidth: 1, borderColor: tokens.border, padding: spacing.xl, alignItems: 'center', gap: spacing.sm }}>
                  <Text style={{ fontFamily: typography.family.sansX, fontSize: 20, color: tokens.text, textTransform: 'uppercase' }}>
                    {t('home.allDoneThisWeek')}
                  </Text>
                  <Text style={{ fontFamily: typography.family.sans, fontSize: 14, color: tokens.textMute, textAlign: 'center' }}>
                    {t('home.allDoneDesc')}
                  </Text>
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </Screen>
  )
}
