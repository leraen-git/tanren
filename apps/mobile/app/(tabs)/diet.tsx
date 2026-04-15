import React, { useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useTheme } from '@/theme/ThemeContext'
import { trpc } from '@/lib/trpc'
import { SkeletonCard } from '@/components/SkeletonCard'
import { colors as tokenColors } from '@/theme/tokens'
import { MealDetailModal, MEAL_ICONS, sortMeals, type DietMeal } from '@/components/MealDetailModal'
import { useTranslation } from 'react-i18next'

const DAY_NAMES = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] // index 1–7

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
  const { colors, typography, spacing, radius } = useTheme()
  const pct = Math.min(1, value / Math.max(1, target))
  return (
    <View style={{ flex: 1, gap: 4 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ fontFamily: typography.family.semiBold, fontSize: typography.size.xs, color: colors.textMuted }}>{label}</Text>
        <Text style={{ fontFamily: typography.family.semiBold, fontSize: typography.size.xs, color: colors.textMuted }}>{target}g</Text>
      </View>
      <View style={{ height: 6, backgroundColor: colors.surface2, borderRadius: radius.pill }}>
        <View style={{ width: `${pct * 100}%`, height: 6, backgroundColor: color, borderRadius: radius.pill }} />
      </View>
    </View>
  )
}


export default function DietScreen() {
  const { colors, typography, spacing, radius } = useTheme()
  const { t } = useTranslation()
  const { data: plan, isLoading } = trpc.diet.activePlan.useQuery()
  const utils = trpc.useUtils()
  const [selectedMeal, setSelectedMeal] = useState<DietMeal | null>(null)

  // Today's day of week mapped to 1-7 (Mon=1, Sun=7)
  const todayJs = new Date().getDay() // 0=Sun
  const todayDow = todayJs === 0 ? 7 : todayJs // convert to 1-7
  const [selectedDay, setSelectedDay] = useState(todayDow)

  const deletePlan = trpc.diet.deletePlan.useMutation({
    onSuccess: () => Promise.all([
      utils.diet.activePlan.invalidate(),
      utils.diet.todayMeals.invalidate(),
    ]),
    onError: (err) => Alert.alert('Error', err.message),
  })

  const handleDelete = () => {
    Alert.alert(t('diet.resetTitle'), t('diet.resetDesc'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('diet.reset'), style: 'destructive', onPress: () => deletePlan.mutate() },
    ])
  }

  if (isLoading) {
    return (
      <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={{ padding: spacing.base, gap: spacing.md }}>
          <SkeletonCard height={80} />
          <SkeletonCard height={200} />
          <SkeletonCard height={120} />
        </View>
      </SafeAreaView>
    )
  }

  // No plan state
  if (!plan || !plan.isActive) {
    return (
      <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.background }}>
        <ScrollView contentContainerStyle={{ padding: spacing.base, gap: spacing.lg, flexGrow: 1, justifyContent: 'center' }}>
          <View style={{ alignItems: 'center', gap: spacing.md }}>
            <Text style={{ fontSize: 64 }}>🥗</Text>
            <Text style={{ fontFamily: typography.family.extraBold, fontSize: typography.size['3xl'], color: colors.textPrimary, textAlign: 'center' }}>
              {t('diet.yourPlan')}
            </Text>
            <Text style={{ fontFamily: typography.family.regular, fontSize: typography.size.body, color: colors.textMuted, textAlign: 'center' }}>
              {t('diet.yourPlanDesc')}
            </Text>
          </View>

          {[
            { icon: '🔢', text: t('diet.feature1') },
            { icon: '🍽️', text: t('diet.feature2') },
            { icon: '🍫', text: t('diet.feature3') },
            { icon: '💊', text: t('diet.feature4') },
          ].map((f) => (
            <View key={f.icon} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md }}>
              <Text style={{ fontSize: typography.size['2xl'] }}>{f.icon}</Text>
              <Text style={{ fontFamily: typography.family.regular, fontSize: typography.size.base, color: colors.textMuted, flex: 1 }}>{f.text}</Text>
            </View>
          ))}

          <TouchableOpacity
            onPress={() => router.push('/diet/intake' as any)}
            style={{ backgroundColor: colors.primary, borderRadius: radius.lg, paddingVertical: spacing.lg, alignItems: 'center' }}
            accessibilityLabel={t('diet.buildPlan')} accessibilityRole="button"
          >
            <Text style={{ fontFamily: typography.family.extraBold, fontSize: typography.size.xl, color: tokenColors.white }}>
              {t('diet.buildPlan')}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    )
  }

  const rawPlan = plan.rawPlan as unknown as DietPlanRaw
  const days = rawPlan.days ?? []
  const currentDay = days.find((d) => d.dayOfWeek === selectedDay) ?? days[0]

  // Compute totals from individual meal values — the AI-provided day totals are
  // calculated independently and often drift from the per-meal numbers.
  const currentMeals = sortMeals(currentDay?.meals ?? [])
  const dayCalories = currentMeals.reduce((s, m) => s + (m.calories ?? 0), 0)
  const dayProtein  = currentMeals.reduce((s, m) => s + (m.protein  ?? 0), 0)
  const dayCarbs    = currentMeals.reduce((s, m) => s + (m.carbs    ?? 0), 0)
  const dayFat      = currentMeals.reduce((s, m) => s + (m.fat      ?? 0), 0)

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.background }}>
      <MealDetailModal meal={selectedMeal} onClose={() => setSelectedMeal(null)} />

      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xl }}>
        {/* Header */}
        <View style={{ padding: spacing.base, gap: spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View>
              <Text style={{ fontFamily: typography.family.semiBold, fontSize: typography.size.xs, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1 }}>
                {t('diet.title')}
              </Text>
              <Text style={{ fontFamily: typography.family.extraBold, fontSize: typography.size['2xl'], color: colors.textPrimary }}>
                {plan.targetCalories} {t('diet.kcalPerDay')}
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleDelete}
              style={{ paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radius.sm, borderWidth: 1, borderColor: `${colors.danger}40` }}
              accessibilityLabel={t('diet.reset')} accessibilityRole="button"
            >
              <Text style={{ fontFamily: typography.family.semiBold, fontSize: typography.size.base, color: colors.danger }}>{t('diet.reset')}</Text>
            </TouchableOpacity>
          </View>

          {/* Macro targets */}
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <MacroBar label={t('diet.protein')} value={plan.targetProtein} target={plan.targetProtein} color={colors.primary} />
            <MacroBar label={t('diet.carbs')} value={plan.targetCarbs} target={plan.targetCarbs} color="#F59E0B" />
            <MacroBar label={t('diet.fat')} value={plan.targetFat} target={plan.targetFat} color="#8B5CF6" />
          </View>
          <Text style={{ fontFamily: typography.family.regular, fontSize: typography.size.base, color: colors.textMuted }}>
            💧 {rawPlan.summary.hydrationLiters}{t('diet.water')}
          </Text>
        </View>

        {/* Day selector */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.base, gap: spacing.sm }}>
          {days.map((d) => {
            const isToday = d.dayOfWeek === todayDow
            const isSelected = d.dayOfWeek === selectedDay
            return (
              <TouchableOpacity
                key={d.dayOfWeek}
                onPress={() => setSelectedDay(d.dayOfWeek)}
                style={{
                  alignItems: 'center', gap: 4,
                  paddingVertical: spacing.sm, paddingHorizontal: spacing.md,
                  borderRadius: radius.md,
                  backgroundColor: isSelected ? colors.primary : colors.surface,
                  borderWidth: isToday && !isSelected ? 1 : 0,
                  borderColor: colors.primary,
                }}
                accessibilityRole="button" accessibilityLabel={DAY_NAMES[d.dayOfWeek]}
              >
                <Text style={{ fontFamily: typography.family.bold, fontSize: typography.size.base, color: isSelected ? tokenColors.white : colors.textMuted }}>
                  {DAY_NAMES[d.dayOfWeek]}
                </Text>
                <Text style={{ fontFamily: typography.family.regular, fontSize: typography.size.xs, color: isSelected ? `${tokenColors.white}99` : colors.textMuted }}>
                  {(d.meals ?? []).reduce((s: number, m: any) => s + (m.calories ?? 0), 0)}
                </Text>
              </TouchableOpacity>
            )
          })}
        </ScrollView>

        {/* Day detail */}
        {currentDay && (
          <View style={{ padding: spacing.base, gap: spacing.md }}>
            <View>
              <Text style={{ fontFamily: typography.family.extraBold, fontSize: typography.size.xl, color: colors.textPrimary }}>
                {currentDay.theme}
              </Text>
              <Text style={{ fontFamily: typography.family.regular, fontSize: typography.size.base, color: colors.textMuted }}>
                {dayCalories} kcal · P {dayProtein}g · C {dayCarbs}g · F {dayFat}g
              </Text>
            </View>

            {/* Meals — already sorted + normalised above as currentMeals */}
            {currentMeals.map((meal, i) => (
              <TouchableOpacity
                key={i}
                onPress={() => setSelectedMeal(meal)}
                style={{ backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.base, gap: spacing.sm }}
                accessibilityLabel={`${meal.name}, tap for recipe`}
                accessibilityRole="button"
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                  <Text style={{ fontSize: typography.size.xl }}>{MEAL_ICONS[meal.type] ?? '🍴'}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: typography.family.semiBold, fontSize: typography.size.xs, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      {t(`diet.mealType.${meal.type}`, { defaultValue: meal.type })}
                      {meal.isTreat ? ' ✨' : ''}
                      {meal.batchCookable ? ' · 🍱' : ''}
                      {meal.prepTime ? ` · ${meal.prepTime}min` : ''}
                    </Text>
                    <Text style={{ fontFamily: typography.family.bold, fontSize: typography.size.body, color: colors.textPrimary }}>
                      {meal.name}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 2 }}>
                    <Text style={{ fontFamily: typography.family.extraBold, fontSize: typography.size.body, color: colors.primary }}>
                      {meal.calories}
                    </Text>
                    {/* Recipe indicator */}
                    {(meal.ingredients?.length ?? 0) > 0 && (
                      <Text style={{ fontFamily: typography.family.regular, fontSize: typography.size.xs, color: colors.textMuted }}>
                        📖 {t('diet.recipe')}
                      </Text>
                    )}
                  </View>
                </View>
                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                  {[
                    { label: t('diet.proteinShort'), value: meal.protein, color: colors.primary },
                    { label: t('diet.carbsShort'), value: meal.carbs, color: '#F59E0B' },
                    { label: t('diet.fatShort'), value: meal.fat, color: '#8B5CF6' },
                  ].map((m) => (
                    <View key={m.label} style={{ flex: 1, flexDirection: 'row', backgroundColor: colors.surface2, borderRadius: radius.sm, paddingVertical: spacing.xs, paddingHorizontal: spacing.sm, alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                      <Text style={{ fontFamily: typography.family.bold, fontSize: typography.size.base, color: m.color }}>{m.value}g</Text>
                      <Text style={{ fontFamily: typography.family.regular, fontSize: typography.size.xs, color: colors.textMuted }}>{m.label}</Text>
                    </View>
                  ))}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Snack swaps */}
        {rawPlan.snackSwaps && rawPlan.snackSwaps.length > 0 && (
          <View style={{ padding: spacing.base, gap: spacing.md }}>
            <Text style={{ fontFamily: typography.family.bold, fontSize: typography.size.xl, color: colors.textPrimary }}>
              {t('diet.snackSwaps')}
            </Text>
            {rawPlan.snackSwaps.map((s, i) => (
              <View key={i} style={{ backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.base, gap: spacing.xs }}>
                <Text style={{ fontFamily: typography.family.regular, fontSize: typography.size.base, color: colors.textMuted }}>
                  {t('diet.insteadOf')} <Text style={{ color: colors.danger, fontFamily: typography.family.semiBold }}>{s.original}</Text>
                </Text>
                <Text style={{ fontFamily: typography.family.bold, fontSize: typography.size.body, color: colors.textPrimary }}>
                  → {s.swap}
                </Text>
                <Text style={{ fontFamily: typography.family.regular, fontSize: typography.size.base, color: colors.textMuted }}>
                  {s.calories} kcal · {s.note}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* My rules */}
        {rawPlan.rules && rawPlan.rules.length > 0 && (
          <View style={{ padding: spacing.base, gap: spacing.md }}>
            <Text style={{ fontFamily: typography.family.bold, fontSize: typography.size.xl, color: colors.textPrimary }}>
              {t('diet.rules')}
            </Text>
            {rawPlan.rules.map((r, i) => (
              <View key={i} style={{ flexDirection: 'row', gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.base, alignItems: 'flex-start' }}>
                <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Text style={{ fontFamily: typography.family.extraBold, fontSize: typography.size.base, color: tokenColors.white }}>{i + 1}</Text>
                </View>
                <Text style={{ fontFamily: typography.family.regular, fontSize: typography.size.base, color: colors.textPrimary, flex: 1 }}>{r}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Supplements */}
        {rawPlan.supplements && rawPlan.supplements.length > 0 && (
          <View style={{ padding: spacing.base, gap: spacing.md }}>
            <Text style={{ fontFamily: typography.family.bold, fontSize: typography.size.xl, color: colors.textPrimary }}>
              {t('diet.supplements')}
            </Text>
            {rawPlan.supplements.map((s, i) => (
              <View key={i} style={{ backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.base, gap: spacing.xs }}>
                <Text style={{ fontFamily: typography.family.bold, fontSize: typography.size.body, color: colors.textPrimary }}>{s.name}</Text>
                <Text style={{ fontFamily: typography.family.regular, fontSize: typography.size.base, color: colors.textMuted }}>{s.dose} · {s.timing}</Text>
                <Text style={{ fontFamily: typography.family.regular, fontSize: typography.size.base, color: colors.textMuted }}>{s.reason}</Text>
                <Text style={{ fontFamily: typography.family.semiBold, fontSize: typography.size.base, color: colors.primary }}>💡 {s.budget}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Timeline */}
        {rawPlan.timeline && (
          <View style={{ margin: spacing.base, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.base, gap: spacing.sm }}>
            <Text style={{ fontFamily: typography.family.bold, fontSize: typography.size.xl, color: colors.textPrimary }}>
              {t('diet.timeline')}
            </Text>
            <Text style={{ fontFamily: typography.family.regular, fontSize: typography.size.base, color: colors.textMuted, lineHeight: 22 }}>
              {rawPlan.timeline}
            </Text>
          </View>
        )}

        {/* Regenerate */}
        <TouchableOpacity
          onPress={() => router.push('/diet/intake' as any)}
          style={{ margin: spacing.base, alignItems: 'center', paddingVertical: spacing.md }}
          accessibilityLabel={t('diet.regenerateLink')} accessibilityRole="button"
        >
          <Text style={{ fontFamily: typography.family.semiBold, fontSize: typography.size.base, color: colors.textMuted }}>
            {t('diet.regeneratePrompt')}{' '}<Text style={{ color: colors.primary }}>{t('diet.regenerateLink')}</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}
