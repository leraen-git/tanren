import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native'
import { router, useFocusEffect } from 'expo-router'
import { useTheme } from '@/theme/ThemeContext'
import { Screen } from '@/components/Screen'
import { StatsStrip } from '@/components/StatsStrip'
import { MacroRow } from '@/components/MacroRow'
import { MealCard } from '@/components/MealCard'
import { SkeletonCard } from '@/components/SkeletonCard'
import { trpc } from '@/lib/trpc'
import { useTranslation } from 'react-i18next'
import { useGuestBannerVisible } from '@/contexts/GuestBannerContext'
import { sortMeals } from '@/components/MealDetailModal'

const DAY_NAMES_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const DAY_NAMES_FR = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']

export default function HomeScreen() {
  const { tokens, fonts } = useTheme()
  const { t, i18n } = useTranslation()
  const bannerVisible = useGuestBannerVisible()

  function getGreeting(): string {
    const now = new Date()
    const hour = now.getHours()
    const dayIdx = now.getDay()
    const isFr = i18n.language === 'fr'
    const dayName = isFr ? DAY_NAMES_FR[dayIdx] : DAY_NAMES_FULL[dayIdx]
    let timeOfDay: string
    if (hour < 12) timeOfDay = t('home.greeting_morning')
    else if (hour < 17) timeOfDay = t('home.greeting_afternoon')
    else timeOfDay = t('home.greeting_evening')
    return `${dayName} ${timeOfDay}`
  }

  const { data: user, isLoading: userLoading } = trpc.auth.me.useQuery()
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
  const todayMealsSorted = useMemo(() => sortMeals((todayDietDay?.meals ?? []) as { type: string; name: string; id?: string; calories?: number; protein?: number; carbs?: number; fat?: number }[]), [todayDietDay?.meals])
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
      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 16 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetchPlan} tintColor={tokens.accent} />}
      >
        {/* Greeting */}
        <View style={{ gap: 4 }}>
          <Text style={{
            fontFamily: fonts.sansM,
            fontSize: 12,
            letterSpacing: 2.5,
            textTransform: 'uppercase',
            color: tokens.textMute,
          }}>
            {getGreeting()}
          </Text>
          {userLoading ? (
            <SkeletonCard height={32} />
          ) : (
            <Text style={{ fontFamily: fonts.sansX, fontSize: 28, color: tokens.text, textTransform: 'uppercase' }}>
              {t('home.salut')} <Text style={{ color: tokens.accent }}>{user?.name.split(' ')[0] ?? 'Athlete'}.</Text>
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
          <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: tokens.border }}>
            {(['workout', 'diet'] as const).map((tab) => {
              const isActive = activeTab === tab
              return (
                <TouchableOpacity
                  key={tab}
                  onPress={() => handleTabChange(tab)}
                  style={{
                    flex: 1,
                    alignItems: 'center',
                    paddingVertical: 12,
                    borderBottomWidth: isActive ? 2 : 0,
                    borderBottomColor: tokens.accent,
                    marginBottom: isActive ? -1 : 0,
                  }}
                  accessibilityLabel={tab === 'workout' ? t('home.workout') : t('home.diet')}
                  accessibilityRole="tab"
                >
                  <Text style={{
                    fontFamily: fonts.sansB,
                    fontSize: 12,
                    letterSpacing: 3,
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
          <View style={{ gap: 12 }}>
            {todayDietDay ? (
              <>
                {/* Day theme — accent left border */}
                <View style={{
                  paddingVertical: 14, paddingHorizontal: 16,
                  backgroundColor: tokens.ghostBg,
                  borderLeftWidth: 3, borderLeftColor: tokens.accent,
                }}>
                  <Text style={{
                    fontFamily: fonts.sansB, fontSize: 10, letterSpacing: 3,
                    textTransform: 'uppercase', color: tokens.accent, marginBottom: 4,
                  }}>
                    {t('home.today')}
                  </Text>
                  <Text style={{
                    fontFamily: fonts.sansB, fontSize: 15, letterSpacing: 0.5,
                    textTransform: 'uppercase', color: tokens.text,
                  }}>
                    {todayDietDay.theme}
                  </Text>
                </View>

                {/* Calorie target */}
                <View style={{
                  flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline',
                  paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: tokens.border,
                }}>
                  <Text style={{
                    fontFamily: fonts.sansM, fontSize: 11, letterSpacing: 2,
                    textTransform: 'uppercase', color: tokens.textMute,
                  }}>
                    {t('diet.calorieTarget')}
                  </Text>
                  <Text style={{ fontFamily: fonts.sansX, fontSize: 22, color: tokens.text }}>
                    {todayCalories.toLocaleString('fr-FR')}
                    <Text style={{ fontFamily: fonts.sansM, fontSize: 12, color: tokens.textMute }}> kcal</Text>
                  </Text>
                </View>

                {/* Macros */}
                <MacroRow protein={todayProtein} carbs={todayCarbs} fat={todayFat} />

                {/* Section divider */}
                <View style={{ borderBottomWidth: 1, borderBottomColor: tokens.border, paddingBottom: 6, marginTop: 4 }}>
                  <Text style={{
                    fontFamily: fonts.sansB, fontSize: 10, letterSpacing: 3,
                    textTransform: 'uppercase', color: tokens.textMute,
                  }}>
                    {t('diet.mealsToday')}
                  </Text>
                </View>

                {/* Meal cards */}
                {todayMealsSorted.map((meal) => (
                  <MealCard
                    key={`${meal.type}-${meal.name}`}
                    typeLabel={t(`diet.mealType.${meal.type}`, { defaultValue: meal.type })}
                    name={meal.name}
                    calories={meal.calories ?? 0}
                    protein={meal.protein ?? 0}
                    carbs={meal.carbs ?? 0}
                    fat={meal.fat ?? 0}
                    onPress={() => meal.id ? router.push(`/diet/meal/${meal.id}` as any) : undefined}
                    accessibilityLabel={`${meal.name}, tap for recipe`}
                  />
                ))}
              </>
            ) : (
              <View style={{ borderWidth: 1, borderColor: tokens.border, padding: 20, alignItems: 'center' }}>
                <Text style={{ fontFamily: fonts.sansB, fontSize: 14, color: tokens.textMute, textAlign: 'center', textTransform: 'uppercase', letterSpacing: 0.6 }}>
                  {t('home.noMealPlanToday')}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* === WORKOUT TAB === */}
        {(!showTodayTabs || activeTab === 'workout') && (
          <>
            {/* Workout complete — hero card */}
            {isTodayWorkoutDone && (
              <View style={{ borderWidth: 1, borderColor: tokens.green, padding: 24, gap: 12, alignItems: 'center' }}>
                <Text style={{
                  fontFamily: fonts.sansM, fontSize: 10, letterSpacing: 1.6,
                  textTransform: 'uppercase', color: tokens.green,
                }}>
                  {t('home.today')}
                </Text>
                <Text style={{ fontFamily: fonts.sansX, fontSize: 32, color: tokens.text, textTransform: 'uppercase', textAlign: 'center' }}>
                  {t('home.workoutComplete')}
                </Text>
                {showTodayTabs && (
                  <TouchableOpacity
                    onPress={() => handleTabChange('diet')}
                    style={{ backgroundColor: tokens.accent, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 4, alignSelf: 'stretch' }}
                    accessibilityLabel="View today's diet" accessibilityRole="button"
                  >
                    <Text style={{ fontFamily: fonts.sansB, fontSize: 14, letterSpacing: 0.6, textTransform: 'uppercase', color: '#FFFFFF' }}>
                      {t('home.viewMeals')}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Rest day — hero card */}
            {isRestDay && (
              <View style={{ borderWidth: 1, borderColor: tokens.border, padding: 32, alignItems: 'center', gap: 8 }}>
                <Text style={{ fontFamily: fonts.sansX, fontSize: 32, color: tokens.text, textTransform: 'uppercase' }}>
                  {t('home.restDay')}
                </Text>
                <Text style={{ fontFamily: fonts.sans, fontSize: 14, color: tokens.textMute, textAlign: 'center' }}>
                  {t('home.restDayDesc')}
                </Text>
              </View>
            )}

            {/* Next workout card — always compact row */}
            {nextWorkout && (
              <View style={{ gap: 8 }}>
                <View style={{ borderBottomWidth: 1, borderBottomColor: tokens.border, paddingBottom: 6 }}>
                  <Text style={{
                    fontFamily: fonts.sansB, fontSize: 10, letterSpacing: 3,
                    textTransform: 'uppercase', color: tokens.textMute,
                  }}>
                    {t('home.nextWorkout')}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => router.push(`/workout/preview?templateId=${nextWorkout.workoutTemplateId}`)}
                  style={{
                    borderWidth: 1, borderColor: isTodayWorkout ? tokens.accent : tokens.border, padding: 12,
                    flexDirection: 'row', alignItems: 'center',
                  }}
                  accessibilityLabel={`Start ${nextWorkout.workoutName}`}
                  accessibilityRole="button"
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: fonts.sansB, fontSize: 14, color: tokens.text, textTransform: 'uppercase' }}>
                      {nextWorkout.workoutName}
                    </Text>
                    <Text style={{ fontFamily: fonts.sans, fontSize: 12, color: tokens.textMute }}>
                      {isTodayWorkout ? t('home.today') : (i18n.language === 'fr' ? DAY_NAMES_FR : DAY_NAMES_FULL)[nextWorkout.dayOfWeek]} · {nextWorkout.estimatedDuration} min
                    </Text>
                  </View>
                  <Text style={{ fontFamily: fonts.sansB, fontSize: 16, color: tokens.accent }}>›</Text>
                </TouchableOpacity>

                {/* This week */}
                {remainingWorkouts.length > 0 && (
                  <View style={{ gap: 8 }}>
                    <View style={{ borderBottomWidth: 1, borderBottomColor: tokens.border, paddingBottom: 6 }}>
                      <Text style={{
                        fontFamily: fonts.sansB, fontSize: 10, letterSpacing: 3,
                        textTransform: 'uppercase', color: tokens.textMute,
                      }}>
                        {t('home.alsoThisWeek')}
                      </Text>
                    </View>
                    {remainingWorkouts.map((d) => (
                      <TouchableOpacity
                        key={d.workoutTemplateId}
                        onPress={() => router.push(`/workout/preview?templateId=${d.workoutTemplateId}`)}
                        style={{
                          borderWidth: 1, borderColor: tokens.border, padding: 12,
                          flexDirection: 'row', alignItems: 'center',
                        }}
                        accessibilityLabel={`Start ${d.workoutName}`}
                        accessibilityRole="button"
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontFamily: fonts.sansB, fontSize: 14, color: tokens.text, textTransform: 'uppercase' }}>
                            {d.workoutName}
                          </Text>
                          <Text style={{ fontFamily: fonts.sans, fontSize: 12, color: tokens.textMute }}>
                            {(i18n.language === 'fr' ? DAY_NAMES_FR : DAY_NAMES_FULL)[d.dayOfWeek]} · {d.estimatedDuration} min
                          </Text>
                        </View>
                        <Text style={{ fontFamily: fonts.sansB, fontSize: 16, color: tokens.accent }}>›</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* No plan state */}
            {!activePlan && (
              <View style={{ gap: 12 }}>
                <TouchableOpacity
                  onPress={() => router.push('/plans/create')}
                  style={{
                    borderWidth: 2, borderColor: tokens.accent, borderStyle: 'dashed',
                    padding: 20, alignItems: 'center', gap: 12,
                  }}
                  accessibilityLabel="Create a workout plan" accessibilityRole="button"
                >
                  <Text style={{ fontFamily: fonts.sansX, fontSize: 20, color: tokens.text, textTransform: 'uppercase' }}>
                    {t('home.noActivePlan')}
                  </Text>
                  <Text style={{ fontFamily: fonts.sans, fontSize: 14, color: tokens.textMute, textAlign: 'center' }}>
                    {t('home.noActivePlanDesc')}
                  </Text>
                  <View style={{ backgroundColor: tokens.accent, height: 48, paddingHorizontal: 24, alignItems: 'center', justifyContent: 'center', borderRadius: 4 }}>
                    <Text style={{ fontFamily: fonts.sansB, fontSize: 14, letterSpacing: 0.6, textTransform: 'uppercase', color: '#FFFFFF' }}>
                      {t('home.createPlan')}
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* AI generate */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={{ flex: 1, height: 1, backgroundColor: tokens.border }} />
                  <Text style={{ fontFamily: fonts.sans, fontSize: 12, color: tokens.textMute }}>{t('common.or')}</Text>
                  <View style={{ flex: 1, height: 1, backgroundColor: tokens.border }} />
                </View>

                <TouchableOpacity
                  onPress={isGuest ? undefined : () => router.push('/plans/generate')}
                  disabled={isGuest}
                  style={{
                    borderWidth: 1, borderColor: tokens.border, padding: 16,
                    flexDirection: 'row', alignItems: 'center', gap: 12,
                    opacity: isGuest ? 0.4 : 1,
                  }}
                  accessibilityLabel={isGuest ? t('guest.aiLocked') : t('home.generatePlan')}
                  accessibilityRole="button"
                >
                  <View style={{
                    width: 44, height: 44, backgroundColor: isGuest ? tokens.surface2 : `${tokens.accent}18`,
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Text style={{ fontFamily: fonts.sansX, fontSize: 11, letterSpacing: 0.5, color: isGuest ? tokens.textMute : tokens.accent }}>AI</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: fonts.sansB, fontSize: 14, color: isGuest ? tokens.textMute : tokens.text, textTransform: 'uppercase' }}>
                      {isGuest ? t('guest.aiLocked') : t('home.generatePlan')}
                    </Text>
                    <Text style={{ fontFamily: fonts.sans, fontSize: 12, color: tokens.textMute }}>
                      {isGuest ? t('guest.aiLockedDesc') : t('home.generatePlanDesc')}
                    </Text>
                  </View>
                  <Text style={{ fontFamily: fonts.sansB, fontSize: 16, color: isGuest ? tokens.textMute : tokens.accent }}>›</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => router.push('/exercise/quick')}
                  style={{ alignItems: 'center', paddingVertical: 8 }}
                  accessibilityLabel="Just start an exercise" accessibilityRole="button"
                >
                  <Text style={{ fontFamily: fonts.sans, fontSize: 12, color: tokens.textMute }}>
                    {t('home.justStart')}<Text style={{ fontFamily: fonts.sansM, color: tokens.accent }}>{t('home.justStartLink')}</Text>
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* All done this week */}
            {activePlan && !nextWorkout && (
              <View style={{ gap: 12 }}>
                <View style={{ borderWidth: 1, borderColor: tokens.border, padding: 20, alignItems: 'center', gap: 8 }}>
                  <Text style={{ fontFamily: fonts.sansX, fontSize: 20, color: tokens.text, textTransform: 'uppercase' }}>
                    {t('home.allDoneThisWeek')}
                  </Text>
                  <Text style={{ fontFamily: fonts.sans, fontSize: 14, color: tokens.textMute, textAlign: 'center' }}>
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
