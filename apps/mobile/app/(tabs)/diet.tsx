import React, { useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useGuestBannerVisible } from '@/contexts/GuestBannerContext'
import { router } from 'expo-router'
import { useTheme } from '@/theme/ThemeContext'
import { trpc } from '@/lib/trpc'
import { useProfile } from '@/data/useProfile'
import { useInvalidateDiet } from '@/lib/invalidation'
import { SkeletonCard } from '@/components/SkeletonCard'
import { KanjiWatermark } from '@/components/KanjiWatermark'
import { useTranslation } from 'react-i18next'

const DOW_DB_KEY = ['', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const

function MacroCell({ label, value, color }: { label: string; value: number; color: string }) {
  const { tokens, fonts } = useTheme()
  return (
    <View style={{
      flex: 1, paddingVertical: 10, alignItems: 'center',
      borderWidth: 1, borderColor: tokens.border,
      borderTopWidth: 2, borderTopColor: color,
    }}>
      <Text style={{ fontFamily: fonts.sansB, fontSize: 9, letterSpacing: 2, color: tokens.textMute, textTransform: 'uppercase', marginBottom: 4 }}>
        {label}
      </Text>
      <Text style={{ fontFamily: fonts.monoB, fontSize: 15, color }}>
        {value}<Text style={{ fontFamily: fonts.mono, fontSize: 10, color: tokens.textMute }}>g</Text>
      </Text>
    </View>
  )
}

function V2MealCard({
  meal, isDessert, onPress,
}: {
  meal: { name: string; mealType: string; suggestedTime: string; kcal: number; proteinG: number; carbsG: number; fatG: number; isBatchCookFriendly: boolean }
  isDessert: boolean
  onPress: () => void
}) {
  const { tokens, fonts } = useTheme()
  const { t } = useTranslation()
  const borderColor = isDessert ? tokens.amber : tokens.accent
  const typeColor = isDessert ? tokens.amber : tokens.textMute

  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        borderWidth: 1, borderColor: tokens.border,
        borderLeftWidth: 3, borderLeftColor: borderColor,
        padding: 14,
      }}
      accessibilityLabel={meal.name}
      accessibilityRole="button"
    >
      {/* Head: type left, kcal right */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
        <Text style={{
          fontFamily: fonts.sansB, fontSize: 9, letterSpacing: 2.4,
          color: typeColor, textTransform: 'uppercase',
        }}>
          {t(`diet.mealType.${meal.mealType}`, { defaultValue: meal.mealType })}
          {' · '}{meal.suggestedTime}
        </Text>
        <Text style={{ fontFamily: fonts.monoB, fontSize: 13, color: tokens.text }}>
          {meal.kcal}<Text style={{ fontFamily: fonts.mono, fontSize: 9, color: tokens.textMute }}>kcal</Text>
        </Text>
      </View>
      {/* Meal name */}
      <Text style={{ fontFamily: fonts.sansX, fontSize: 17, color: tokens.text, textTransform: 'uppercase', letterSpacing: 0.3, lineHeight: 20, marginBottom: 8 }}>
        {meal.name}
      </Text>
      {/* Macros inline */}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {[
          { label: 'P', value: meal.proteinG, color: tokens.accent },
          { label: 'G', value: meal.carbsG, color: tokens.amber },
          { label: 'L', value: meal.fatG, color: tokens.green },
        ].map((m) => (
          <View key={m.label} style={{
            borderWidth: 1, borderColor: m.color,
            paddingVertical: 3, paddingHorizontal: 6,
          }}>
            <Text style={{ fontFamily: fonts.monoB, fontSize: 11, color: m.color }}>{m.label} {m.value}</Text>
          </View>
        ))}
      </View>
    </TouchableOpacity>
  )
}

// ─── No plan state ──────────────────────────────────────────────────────────

function NoPlanView({ isGuest }: { isGuest: boolean }) {
  const { tokens, fonts } = useTheme()
  const { t } = useTranslation()
  const { data: planCount } = trpc.diet.planCount.useQuery()
  const invalidateDiet = useInvalidateDiet()
  const restorePlan = trpc.diet.restoreLastPlan.useMutation({
    onSuccess: invalidateDiet,
  })

  const FEATURES = [
    { title: t('diet.v2Feature1Title'), desc: t('diet.v2Feature1Desc') },
    { title: t('diet.v2Feature2Title'), desc: t('diet.v2Feature2Desc') },
    { title: t('diet.v2Feature3Title'), desc: t('diet.v2Feature3Desc') },
    { title: t('diet.v2Feature4Title'), desc: t('diet.v2Feature4Desc') },
  ]

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 16, flexGrow: 1, justifyContent: 'center' }}>
      {/* Hero */}
      <View style={{ alignItems: 'center', gap: 12 }}>
        <Text style={{
          fontFamily: 'NotoSerifJP_900Black_subset', fontSize: 28,
          color: tokens.accent, letterSpacing: 4,
        }}>
          鍛 錬
        </Text>
        <Text style={{
          fontFamily: fonts.sansX, fontSize: 28, color: tokens.text,
          textAlign: 'center', textTransform: 'uppercase', letterSpacing: 0.5,
        }}>
          {t('diet.v2Hero')}
        </Text>
        <Text style={{ fontFamily: fonts.sans, fontSize: 13, color: tokens.textMute, textAlign: 'center', lineHeight: 20 }}>
          {t('diet.v2HeroDesc')}
        </Text>
      </View>

      {/* Features */}
      <Text style={{
        fontFamily: fonts.sansB, fontSize: 9, letterSpacing: 3,
        color: tokens.textMute, textTransform: 'uppercase',
      }}>
        {t('diet.v2Features')}
      </Text>

      {FEATURES.map((f, i) => (
        <View key={i} style={{
          flexDirection: 'row', gap: 12, alignItems: 'flex-start',
          borderWidth: 1, borderColor: tokens.border, padding: 14,
        }}>
          <View style={{
            width: 28, height: 28, backgroundColor: tokens.accent,
            alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Text style={{ fontFamily: fonts.sansB, fontSize: 12, color: '#FFFFFF' }}>
              {String(i + 1).padStart(2, '0')}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: fonts.sansB, fontSize: 14, color: tokens.text }}>{f.title}</Text>
            <Text style={{ fontFamily: fonts.sans, fontSize: 12, color: tokens.textMute, marginTop: 2 }}>{f.desc}</Text>
          </View>
        </View>
      ))}

      {/* CTA */}
      <TouchableOpacity
        onPress={isGuest ? undefined : () => router.push('/diet/intake-v2/stats')}
        disabled={isGuest}
        style={{
          backgroundColor: isGuest ? tokens.surface2 : tokens.accent,
          paddingVertical: 16, alignItems: 'center', gap: 4,
          opacity: isGuest ? 0.4 : 1,
        }}
        accessibilityLabel={isGuest ? t('guest.aiLocked') : t('diet.v2BuildPlan')}
        accessibilityRole="button"
      >
        <Text style={{
          fontFamily: fonts.sansX, fontSize: 18,
          color: isGuest ? tokens.textMute : '#FFFFFF',
          textTransform: 'uppercase', letterSpacing: 1,
        }}>
          {isGuest ? t('guest.aiLocked') : t('diet.v2BuildPlan')}
        </Text>
        {isGuest && (
          <Text style={{ fontFamily: fonts.sans, fontSize: 10, color: tokens.textMute }}>
            {t('guest.aiLockedDesc')}
          </Text>
        )}
      </TouchableOpacity>
      <Text style={{ fontFamily: fonts.sans, fontSize: 11, color: tokens.textGhost, textAlign: 'center' }}>
        {t('diet.v2BuildMeta')}
      </Text>

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
  )
}

// ─── V2 active plan (normalized) ────────────────────────────────────────────

interface V2Day {
  id: string
  dayNumber: number
  dayLabel: string
  theme: string
  targetKcal: number
  meals: V2Meal[]
}

interface V2Meal {
  id: string
  mealType: string
  suggestedTime: string
  name: string
  kcal: number
  proteinG: number
  carbsG: number
  fatG: number
  prepTimeMin: number
  isBatchCookFriendly: boolean
  isLowCalTreat: boolean
  ingredients: { name: string; quantity: string; unit: string; grocerySection?: string }[]
  recipeSteps: { stepNumber: number; instruction: string }[]
  youtubeUrl: string | null
}

interface V2GroceryItem {
  id: string
  section: string
  name: string
  quantity: string
  isChecked: boolean
}

interface V2PlanData {
  id: string
  targetKcal: number
  targetProteinG: number
  targetCarbsG: number
  targetFatG: number
  aiExplanation: string | null
  aiPersonalRules: string[] | null
  aiTimeline: string | null
  aiSupplements: { name: string; dose: string; when: string; why: string; productHint: string }[] | null
  aiSnackSwaps: { originalSnack: string; swap: string; kcal: number }[] | null
  days: V2Day[]
  groceryItems: V2GroceryItem[]
}

function V2ActivePlan({ plan }: { plan: V2PlanData }) {
  const { tokens, fonts } = useTheme()
  const { t } = useTranslation()
  const { data: user } = useProfile()
  const isGuest = user?.authProvider === 'guest'

  const todayJs = new Date().getDay()
  const todayDow = todayJs === 0 ? 7 : todayJs
  const [selectedDay, setSelectedDay] = useState(todayDow)

  const days = plan.days ?? []
  const currentDay = days.find((d) => d.dayNumber === selectedDay) ?? days[0]
  const meals = currentDay?.meals ?? []

  const checkedCount = plan.groceryItems.filter((g) => g.isChecked).length
  const totalGroceries = plan.groceryItems.length

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 }}>
        <Text style={{ fontFamily: fonts.sansX, fontSize: 24, color: tokens.text, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Nutrition
        </Text>
        <TouchableOpacity
          onPress={() => router.push('/diet/regenerate' as any)}
          accessibilityRole="button"
        >
          <Text style={{ fontFamily: fonts.sansB, fontSize: 12, letterSpacing: 1, color: tokens.accent, textTransform: 'uppercase' }}>
            {t('diet.v2PlanLink')} ›
          </Text>
        </TouchableOpacity>
      </View>

      {/* Day selector */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 6, paddingBottom: 12 }}>
        {days.map((d) => {
          const isToday = d.dayNumber === todayDow
          const isSelected = d.dayNumber === selectedDay
          const base = new Date()
          const diff = d.dayNumber - todayDow
          base.setDate(base.getDate() + diff)
          const dateNum = base.getDate()
          return (
            <TouchableOpacity
              key={d.dayNumber}
              onPress={() => setSelectedDay(d.dayNumber)}
              style={{
                alignItems: 'center', paddingVertical: 10, paddingHorizontal: 6,
                backgroundColor: isSelected ? tokens.accent : 'transparent',
                borderWidth: 1,
                borderColor: isSelected ? tokens.accent : isToday ? tokens.accent : tokens.border,
                minWidth: 52,
              }}
              accessibilityRole="button"
            >
              <Text style={{ fontFamily: fonts.sansB, fontSize: 9, letterSpacing: 1.6, color: isSelected ? 'rgba(255,255,255,0.7)' : tokens.textMute, textTransform: 'uppercase', marginBottom: 4 }}>
                {d.dayLabel}
              </Text>
              <Text style={{ fontFamily: fonts.sansX, fontSize: 18, lineHeight: 18, color: isSelected ? '#FFFFFF' : tokens.text }}>
                {dateNum}
              </Text>
              <Text style={{ fontFamily: fonts.mono, fontSize: 8, letterSpacing: 0.3, color: isSelected ? 'rgba(255,255,255,0.7)' : tokens.textMute, marginTop: 5 }}>
                {d.targetKcal}
              </Text>
            </TouchableOpacity>
          )
        })}
      </ScrollView>

      {currentDay && (
        <View style={{ padding: 16, gap: 14 }}>
          {/* Day theme block */}
          <View style={{
            borderLeftWidth: 3, borderLeftColor: tokens.accent,
            backgroundColor: 'rgba(255, 45, 63, 0.05)',
            paddingVertical: 10, paddingHorizontal: 14,
          }}>
            <Text style={{ fontFamily: fonts.sansB, fontSize: 9, letterSpacing: 2, color: tokens.accent, textTransform: 'uppercase', marginBottom: 3 }}>
              {currentDay.dayLabel} · {t('diet.v2DayTheme')}
            </Text>
            <Text style={{ fontFamily: fonts.sansX, fontSize: 14, letterSpacing: 0.3, color: tokens.text, textTransform: 'uppercase', lineHeight: 16 }}>
              {currentDay.theme}
            </Text>
          </View>

          {/* Cal target */}
          <View style={{
            flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline',
            borderWidth: 1, borderColor: tokens.border, padding: 14,
          }}>
            <Text style={{ fontFamily: fonts.sansB, fontSize: 10, letterSpacing: 2.8, color: tokens.textMute, textTransform: 'uppercase' }}>
              {t('diet.v2DayTarget')}
            </Text>
            <Text style={{ fontFamily: fonts.monoB, fontSize: 22, lineHeight: 22, color: tokens.text }}>
              {currentDay.targetKcal}<Text style={{ fontFamily: fonts.mono, fontSize: 11, color: tokens.textMute }}> kcal</Text>
            </Text>
          </View>

          {/* Macro row */}
          <View style={{ flexDirection: 'row', gap: 6 }}>
            <MacroCell label="Prot." value={plan.targetProteinG} color={tokens.accent} />
            <MacroCell label="Gluc." value={plan.targetCarbsG} color={tokens.amber} />
            <MacroCell label="Lip." value={plan.targetFatG} color={tokens.green} />
          </View>

          {/* Meals label */}
          <Text style={{
            fontFamily: fonts.sansB, fontSize: 9, letterSpacing: 3,
            color: tokens.textMute, textTransform: 'uppercase', marginTop: 4,
          }}>
            {t('diet.v2Meals')}
          </Text>

          {/* Meal cards */}
          {meals.map((meal) => (
            <V2MealCard
              key={meal.id}
              meal={meal}
              isDessert={meal.mealType === 'DESSERT'}
              onPress={() => router.push(`/diet/meal/${meal.id}` as any)}
            />
          ))}

          {/* Groceries preview */}
          {totalGroceries > 0 && (
            <TouchableOpacity
              onPress={() => router.push('/diet/groceries' as any)}
              style={{
                borderWidth: 1, borderColor: tokens.border,
                borderLeftWidth: 3, borderLeftColor: tokens.accent,
                padding: 14, gap: 8, marginTop: 8,
              }}
              accessibilityRole="button"
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Text style={{ fontFamily: 'NotoSerifJP_900Black_subset', fontSize: 20, color: tokens.accent }}>
                    買
                  </Text>
                  <Text style={{ fontFamily: fonts.sansB, fontSize: 13, color: tokens.text, textTransform: 'uppercase', letterSpacing: 0.6 }}>
                    {t('diet.v2Groceries')}
                  </Text>
                </View>
                <Text style={{ fontFamily: fonts.sansB, fontSize: 16, color: tokens.accent }}>›</Text>
              </View>
              <Text style={{ fontFamily: fonts.mono, fontSize: 11, color: tokens.textMute }}>
                {checkedCount}<Text style={{ color: tokens.textGhost }}> / {totalGroceries} {t('diet.v2GroceriesChecked')}</Text>
              </Text>
              <View style={{ height: 3, backgroundColor: tokens.surface2 }}>
                <View style={{
                  width: totalGroceries > 0 ? `${(checkedCount / totalGroceries) * 100}%` : '0%',
                  height: 3, backgroundColor: tokens.accent,
                }} />
              </View>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Regenerate link */}
      <TouchableOpacity
        onPress={isGuest ? undefined : () => router.push('/diet/regenerate' as any)}
        disabled={isGuest}
        style={{ margin: 16, alignItems: 'center', paddingVertical: 12, opacity: isGuest ? 0.4 : 1 }}
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
  )
}

// ─── Main screen ────────────────────────────────────────────────────────────

export default function DietScreen() {
  const { tokens } = useTheme()
  const bannerVisible = useGuestBannerVisible()
  const { data: user } = useProfile()
  const isGuest = user?.authProvider === 'guest'

  const { data: v2Plan, isLoading } = trpc.diet.getMyPlanV2.useQuery()

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

  return (
    <SafeAreaView edges={bannerVisible ? [] : ['top']} style={{ flex: 1, backgroundColor: tokens.bg }}>
      <KanjiWatermark char="錬" />
      {v2Plan ? (
        <V2ActivePlan plan={v2Plan as unknown as V2PlanData} />
      ) : (
        <NoPlanView isGuest={isGuest ?? false} />
      )}
    </SafeAreaView>
  )
}
