import React, { useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useGuestBannerVisible } from '@/contexts/GuestBannerContext'
import { router } from 'expo-router'
import { useTheme } from '@/theme/ThemeContext'
import { trpc } from '@/lib/trpc'
import { SkeletonCard } from '@/components/SkeletonCard'
import { MealDetailModal, MEAL_ICONS, sortMeals, type DietMeal } from '@/components/MealDetailModal'
import { useTranslation } from 'react-i18next'

const DOW_DB_KEY = ['', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const

type DietDay = {
  dayOfWeek: number
  theme: string
  totalCalories: number
  totalProtein: number
  totalCarbs: number
  totalFat: number
  meals: DietMeal[]
}

type DietPlanRaw = {
  summary: {
    targetCalories: number
    targetProtein: number
    targetCarbs: number
    targetFat: number
    hydrationLiters: number
    calculationExplanation: string
    macroExplanation: string
  }
  days: DietDay[]
  snackSwaps: { original: string; swap: string; calories: number; note: string }[]
  rules: string[]
  timeline: string
  hydrationTips: string[]
  hydrationFatLossExplanation: string
  supplements: { name: string; dose: string; timing: string; reason: string; budget: string }[]
}

function MacroBar({ label, value, target, color }: { label: string; value: number; target: number; color: string }) {
  const { tokens, fonts } = useTheme()
  const pct = Math.min(1, value / Math.max(1, target))
  return (
    <View style={{ flex: 1, gap: 4 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ fontFamily: fonts.sansB, fontSize: 9, letterSpacing: 1, color: tokens.textMute, textTransform: 'uppercase' }}>{label}</Text>
        <Text style={{ fontFamily: fonts.mono, fontSize: 10, color: tokens.textMute }}>{target}g</Text>
      </View>
      <View style={{ height: 4, backgroundColor: tokens.surface2 }}>
        <View style={{ width: `${pct * 100}%`, height: 4, backgroundColor: color }} />
      </View>
    </View>
  )
}

export default function DietScreen() {
  const { tokens, fonts } = useTheme()
  const { t } = useTranslation()
  const bannerVisible = useGuestBannerVisible()
  const { data: plan, isLoading } = trpc.diet.activePlan.useQuery()
  const { data: planCount } = trpc.diet.planCount.useQuery()
  const { data: user } = trpc.users.me.useQuery()
  const isGuest = user?.authProvider === 'guest'
  const utils = trpc.useUtils()
  const [selectedMeal, setSelectedMeal] = useState<DietMeal | null>(null)

  const restorePlan = trpc.diet.restoreLastPlan.useMutation({
    onSuccess: () => Promise.all([
      utils.diet.activePlan.invalidate(),
      utils.diet.todayMeals.invalidate(),
    ]),
    onError: () => {},
  })

  const todayJs = new Date().getDay()
  const todayDow = todayJs === 0 ? 7 : todayJs
  const [selectedDay, setSelectedDay] = useState(todayDow)

  const handleDelete = () => {
    router.push('/diet/intake')
  }

  if (isLoading) {
    return (
      <SafeAreaView edges={bannerVisible ? [] : ['top']} style={{ flex: 1, backgroundColor: tokens.bg }}>
        <View style={{ padding: 16, gap: 12 }}>
          <SkeletonCard height={80} />
          <SkeletonCard height={200} />
          <SkeletonCard height={120} />
        </View>
      </SafeAreaView>
    )
  }

  if (!plan || !plan.isActive) {
    return (
      <SafeAreaView edges={bannerVisible ? [] : ['top']} style={{ flex: 1, backgroundColor: tokens.bg }}>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 16, flexGrow: 1, justifyContent: 'center' }}>
          <View style={{ alignItems: 'center', gap: 12 }}>
            <Text style={{
              fontFamily: fonts.sansX,
              fontSize: 32,
              color: tokens.text,
              textAlign: 'center',
              textTransform: 'uppercase',
              letterSpacing: 0.5,
            }}>
              {t('diet.yourPlan')}
            </Text>
            <Text style={{ fontFamily: fonts.sans, fontSize: 14, color: tokens.textMute, textAlign: 'center' }}>
              {t('diet.yourPlanDesc')}
            </Text>
          </View>

          {[
            { text: t('diet.feature1') },
            { text: t('diet.feature2') },
            { text: t('diet.feature3') },
            { text: t('diet.feature4') },
          ].map((f, i) => (
            <View key={i} style={{
              flexDirection: 'row', alignItems: 'center', gap: 12,
              borderWidth: 1, borderColor: tokens.border,
              padding: 12,
            }}>
              <Text style={{ fontFamily: fonts.sans, fontSize: 12, color: tokens.textMute, flex: 1 }}>{f.text}</Text>
            </View>
          ))}

          <TouchableOpacity
            onPress={isGuest ? undefined : () => router.push('/diet/intake')}
            disabled={isGuest}
            style={{
              backgroundColor: isGuest ? tokens.surface2 : tokens.accent,
              paddingVertical: 16,
              alignItems: 'center',
              gap: 4,
              opacity: isGuest ? 0.4 : 1,
            }}
            accessibilityLabel={isGuest ? t('guest.aiLocked') : t('diet.buildPlan')}
            accessibilityRole="button"
          >
            <Text style={{
              fontFamily: fonts.sansX,
              fontSize: 20,
              color: isGuest ? tokens.textMute : '#FFFFFF',
              textTransform: 'uppercase',
              letterSpacing: 1,
            }}>
              {isGuest ? t('guest.aiLocked') : t('diet.buildPlan')}
            </Text>
            {isGuest && (
              <Text style={{ fontFamily: fonts.sans, fontSize: 10, color: tokens.textMute }}>
                {t('guest.aiLockedDesc')}
              </Text>
            )}
          </TouchableOpacity>

          {(planCount ?? 0) > 0 && (
            <TouchableOpacity
              onPress={() => restorePlan.mutate()}
              disabled={restorePlan.isPending}
              style={{ alignItems: 'center', paddingVertical: 8 }}
              accessibilityLabel={t('diet.restorePlan')} accessibilityRole="button"
            >
              <Text style={{ fontFamily: fonts.sansM, fontSize: 12, color: tokens.textMute }}>
                {restorePlan.isPending ? t('common.loading') : t('diet.restorePlan')}
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </SafeAreaView>
    )
  }

  const rawPlan = plan.rawPlan as unknown as DietPlanRaw
  const days = rawPlan.days ?? []
  const currentDay = days.find((d) => d.dayOfWeek === selectedDay) ?? days[0]

  const currentMeals = sortMeals(currentDay?.meals ?? [])
  const dayCalories = currentMeals.reduce((s, m) => s + (m.calories ?? 0), 0)
  const dayProtein  = currentMeals.reduce((s, m) => s + (m.protein  ?? 0), 0)
  const dayCarbs    = currentMeals.reduce((s, m) => s + (m.carbs    ?? 0), 0)
  const dayFat      = currentMeals.reduce((s, m) => s + (m.fat      ?? 0), 0)

  return (
    <SafeAreaView edges={bannerVisible ? [] : ['top']} style={{ flex: 1, backgroundColor: tokens.bg }}>
      <MealDetailModal meal={selectedMeal} onClose={() => setSelectedMeal(null)} />

      <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
        {/* Header */}
        <View style={{ padding: 16, gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View>
              <Text style={{
                fontFamily: fonts.sansB,
                fontSize: 9,
                letterSpacing: 3,
                color: tokens.textMute,
                textTransform: 'uppercase',
              }}>
                {t('diet.title')}
              </Text>
              <Text style={{ fontFamily: fonts.sansX, fontSize: 24, color: tokens.text }}>
                {plan.targetCalories} {t('diet.kcalPerDay')}
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleDelete}
              style={{ paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: tokens.accent }}
              accessibilityLabel={t('diet.reset')} accessibilityRole="button"
            >
              <Text style={{
                fontFamily: fonts.sansB,
                fontSize: 10,
                letterSpacing: 1,
                color: tokens.accent,
                textTransform: 'uppercase',
              }}>
                {t('diet.reset')}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={{ flexDirection: 'row', gap: 8 }}>
            <MacroBar label={t('diet.protein')} value={plan.targetProtein} target={plan.targetProtein} color={tokens.accent} />
            <MacroBar label={t('diet.carbs')} value={plan.targetCarbs} target={plan.targetCarbs} color={tokens.amber} />
            <MacroBar label={t('diet.fat')} value={plan.targetFat} target={plan.targetFat} color={tokens.green} />
          </View>
          <Text style={{ fontFamily: fonts.sans, fontSize: 12, color: tokens.textMute }}>
            {rawPlan.summary.hydrationLiters}{t('diet.water')}
          </Text>
        </View>

        {/* Day selector chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
          {days.map((d) => {
            const isToday = d.dayOfWeek === todayDow
            const isSelected = d.dayOfWeek === selectedDay
            return (
              <TouchableOpacity
                key={d.dayOfWeek}
                onPress={() => setSelectedDay(d.dayOfWeek)}
                style={{
                  alignItems: 'center', gap: 4,
                  paddingVertical: 8, paddingHorizontal: 12,
                  backgroundColor: isSelected ? tokens.accent : 'transparent',
                  borderWidth: isToday && !isSelected ? 1 : 1,
                  borderColor: isSelected ? tokens.accent : isToday ? tokens.accent : tokens.borderStrong,
                }}
                accessibilityRole="button" accessibilityLabel={t(`days.${DOW_DB_KEY[d.dayOfWeek]}`)}
              >
                <Text style={{
                  fontFamily: fonts.sansB,
                  fontSize: 10,
                  letterSpacing: 1,
                  color: isSelected ? '#FFFFFF' : tokens.textMute,
                  textTransform: 'uppercase',
                }}>
                  {t(`days.${DOW_DB_KEY[d.dayOfWeek]}`)}
                </Text>
                <Text style={{ fontFamily: fonts.mono, fontSize: 10, color: isSelected ? 'rgba(255,255,255,0.7)' : tokens.textGhost }}>
                  {(d.meals ?? []).reduce((s: number, m: any) => s + (m.calories ?? 0), 0)}
                </Text>
              </TouchableOpacity>
            )
          })}
        </ScrollView>

        {/* Day detail */}
        {currentDay && (
          <View style={{ padding: 16, gap: 12 }}>
            <View>
              <Text style={{ fontFamily: fonts.sansX, fontSize: 20, color: tokens.text, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {currentDay.theme}
              </Text>
              <Text style={{ fontFamily: fonts.mono, fontSize: 11, color: tokens.textDim }}>
                {dayCalories} {t('diet.kcal')} · P {dayProtein}g · G {dayCarbs}g · L {dayFat}g
              </Text>
            </View>

            {/* Meal cards */}
            {currentMeals.map((meal, i) => (
              <TouchableOpacity
                key={i}
                onPress={() => setSelectedMeal(meal)}
                style={{
                  borderWidth: 1,
                  borderColor: tokens.border,
                  borderLeftWidth: 3,
                  borderLeftColor: tokens.accent,
                  padding: 16,
                  gap: 8,
                }}
                accessibilityLabel={`${meal.name}, tap for recipe`}
                accessibilityRole="button"
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{
                      fontFamily: fonts.sansB,
                      fontSize: 9,
                      letterSpacing: 1.4,
                      color: tokens.textGhost,
                      textTransform: 'uppercase',
                    }}>
                      {t(`diet.mealType.${meal.type}`, { defaultValue: meal.type })}
                      {meal.batchCookable ? ' · batch' : ''}
                      {meal.prepTime ? ` · ${meal.prepTime}min` : ''}
                    </Text>
                    <Text style={{ fontFamily: fonts.sansX, fontSize: 17, color: tokens.text, textTransform: 'uppercase', letterSpacing: 0.3 }}>
                      {meal.name}
                    </Text>
                  </View>
                  <Text style={{ fontFamily: fonts.monoB, fontSize: 14, color: tokens.accent }}>
                    {meal.calories}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {[
                    { label: 'P', value: meal.protein, color: tokens.accent },
                    { label: 'G', value: meal.carbs, color: tokens.amber },
                    { label: 'L', value: meal.fat, color: tokens.green },
                  ].map((m) => (
                    <View key={m.label} style={{
                      flex: 1, flexDirection: 'row',
                      borderWidth: 1, borderColor: m.color,
                      paddingVertical: 4, paddingHorizontal: 8,
                      alignItems: 'center', justifyContent: 'center', gap: 4,
                    }}>
                      <Text style={{ fontFamily: fonts.monoB, fontSize: 12, color: m.color }}>{m.value}g</Text>
                      <Text style={{ fontFamily: fonts.sansB, fontSize: 8, letterSpacing: 1, color: tokens.textGhost }}>{m.label}</Text>
                    </View>
                  ))}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Snack swaps */}
        {rawPlan.snackSwaps && rawPlan.snackSwaps.length > 0 && (
          <View style={{ padding: 16, gap: 12 }}>
            <Text style={{
              fontFamily: fonts.sansB,
              fontSize: 10,
              letterSpacing: 3,
              color: tokens.textMute,
              textTransform: 'uppercase',
            }}>
              {t('diet.snackSwaps')}
            </Text>
            {rawPlan.snackSwaps.map((s, i) => (
              <View key={i} style={{ borderWidth: 1, borderColor: tokens.border, padding: 16, gap: 4 }}>
                <Text style={{ fontFamily: fonts.sans, fontSize: 12, color: tokens.textMute }}>
                  {t('diet.insteadOf')} <Text style={{ color: tokens.accent, fontFamily: fonts.sansM }}>{s.original}</Text>
                </Text>
                <Text style={{ fontFamily: fonts.sansB, fontSize: 14, color: tokens.text }}>
                  → {s.swap}
                </Text>
                <Text style={{ fontFamily: fonts.mono, fontSize: 11, color: tokens.textMute }}>
                  {s.calories} kcal · {s.note}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Rules */}
        {rawPlan.rules && rawPlan.rules.length > 0 && (
          <View style={{ padding: 16, gap: 12 }}>
            <Text style={{
              fontFamily: fonts.sansB,
              fontSize: 10,
              letterSpacing: 3,
              color: tokens.textMute,
              textTransform: 'uppercase',
            }}>
              {t('diet.rules')}
            </Text>
            {rawPlan.rules.map((r, i) => (
              <View key={i} style={{
                flexDirection: 'row', gap: 12,
                borderWidth: 1, borderColor: tokens.border,
                padding: 16, alignItems: 'flex-start',
              }}>
                <View style={{ width: 24, height: 24, backgroundColor: tokens.accent, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Text style={{ fontFamily: fonts.sansB, fontSize: 12, color: '#FFFFFF' }}>{i + 1}</Text>
                </View>
                <Text style={{ fontFamily: fonts.sans, fontSize: 12, color: tokens.text, flex: 1 }}>{r}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Supplements */}
        {rawPlan.supplements && rawPlan.supplements.length > 0 && (
          <View style={{ padding: 16, gap: 12 }}>
            <Text style={{
              fontFamily: fonts.sansB,
              fontSize: 10,
              letterSpacing: 3,
              color: tokens.textMute,
              textTransform: 'uppercase',
            }}>
              {t('diet.supplements')}
            </Text>
            {rawPlan.supplements.map((s, i) => (
              <View key={i} style={{ borderWidth: 1, borderColor: tokens.border, padding: 16, gap: 4 }}>
                <Text style={{ fontFamily: fonts.sansB, fontSize: 14, color: tokens.text }}>{s.name}</Text>
                <Text style={{ fontFamily: fonts.sans, fontSize: 12, color: tokens.textMute }}>{s.dose} · {s.timing}</Text>
                <Text style={{ fontFamily: fonts.sans, fontSize: 12, color: tokens.textMute }}>{s.reason}</Text>
                <Text style={{ fontFamily: fonts.sansM, fontSize: 12, color: tokens.accent }}>{s.budget}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Timeline */}
        {rawPlan.timeline && (
          <View style={{ margin: 16, borderWidth: 1, borderColor: tokens.border, padding: 16, gap: 8 }}>
            <Text style={{
              fontFamily: fonts.sansB,
              fontSize: 10,
              letterSpacing: 3,
              color: tokens.textMute,
              textTransform: 'uppercase',
            }}>
              {t('diet.timeline')}
            </Text>
            <Text style={{ fontFamily: fonts.sans, fontSize: 12, color: tokens.textMute, lineHeight: 22 }}>
              {rawPlan.timeline}
            </Text>
          </View>
        )}

        {/* Regenerate */}
        <TouchableOpacity
          onPress={isGuest ? undefined : () => router.push('/diet/intake')}
          disabled={isGuest}
          style={{ margin: 16, alignItems: 'center', paddingVertical: 12, opacity: isGuest ? 0.4 : 1 }}
          accessibilityLabel={isGuest ? t('guest.aiLocked') : t('diet.regenerateLink')}
          accessibilityRole="button"
        >
          <Text style={{ fontFamily: fonts.sansM, fontSize: 12, color: tokens.textMute }}>
            {isGuest
              ? t('guest.aiLocked')
              : <>{t('diet.regeneratePrompt')}{' '}<Text style={{ color: tokens.accent }}>{t('diet.regenerateLink')}</Text></>
            }
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}
