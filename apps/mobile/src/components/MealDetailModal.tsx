import React from 'react'
import { View, Text, ScrollView, TouchableOpacity, Modal, Linking, Dimensions } from 'react-native'
import { useTheme } from '@/theme/ThemeContext'
import { colors as tokenColors } from '@/theme/tokens'
import { useTranslation } from 'react-i18next'

export const MEAL_ICONS: Record<string, string> = {
  breakfast: '🌅',
  lunch: '☀️',
  snack: '🍎',
  dinner: '🌙',
  dessert: '🍫',
}

const MEAL_ORDER: Record<string, number> = {
  breakfast: 0,
  lunch: 1,
  snack: 2,
  dinner: 3,
  dessert: 4,
}

// Name keywords that identify a mid-morning snack → sorts after breakfast (0.5)
const SNACK_AM_KEYWORDS = ['mid-morning', 'mid morning', 'morning snack', 'pre-workout', 'pre workout', 'pre-lunch', 'mid-matin']
// Name keywords that identify an afternoon snack → sorts between lunch and dinner (2)
const SNACK_PM_KEYWORDS = ['afternoon', 'après-midi', 'evening snack', 'pre-dinner', 'post-workout', 'post workout', 'post-lunch']
// All snack-like keywords (union of the above + generic)
const SNACK_KEYWORDS = [...SNACK_AM_KEYWORDS, ...SNACK_PM_KEYWORDS, 'snack', 'collation']

// Fractional sort order for snack based on AM vs PM timing in the meal name.
function getSnackSortOrder(name: string): number {
  const lower = name.toLowerCase()
  if (SNACK_AM_KEYWORDS.some((k) => lower.includes(k))) return 0.5  // after breakfast, before lunch
  return 2  // default: between lunch and dinner
}

// Sorts meals into canonical order and normalises duplicate types:
// if a type appears more than once (e.g. two breakfasts from a bad AI response)
// and the meal name looks snack-like, its type is reassigned to 'snack' so the
// label and sort position are corrected automatically.
export function sortMeals<T extends { type: string; name: string }>(meals: T[]): T[] {
  const typeCounts: Record<string, number> = {}
  for (const m of meals) typeCounts[m.type] = (typeCounts[m.type] ?? 0) + 1

  const normalized = meals.map((m) => {
    if (typeCounts[m.type] > 1) {
      const lower = m.name.toLowerCase()
      if (SNACK_KEYWORDS.some((k) => lower.includes(k))) return { ...m, type: 'snack' }
    }
    return m
  })

  return normalized.sort((a, b) => {
    const aOrd = a.type === 'snack' ? getSnackSortOrder(a.name) : (MEAL_ORDER[a.type] ?? 9)
    const bOrd = b.type === 'snack' ? getSnackSortOrder(b.name) : (MEAL_ORDER[b.type] ?? 9)
    return aOrd - bOrd
  })
}

export type DietMeal = {
  type: string
  name: string
  calories: number
  protein: number
  carbs: number
  fat: number
  batchCookable?: boolean
  isTreat?: boolean
  prepTime?: number
  ingredients?: string[]
  preparationSteps?: string[]
  recipeVideoUrl?: string
}

export function MealDetailModal({ meal, onClose }: { meal: DietMeal | null; onClose: () => void }) {
  const { colors, typography, spacing, radius } = useTheme()
  const { t } = useTranslation()
  if (!meal) return null

  const SHEET_HEIGHT = Dimensions.get('window').height * 0.85
  const hasRecipe = (meal.ingredients?.length ?? 0) > 0 || (meal.preparationSteps?.length ?? 0) > 0

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      {/*
        Layout:
        - TouchableOpacity (flex:1) = backdrop, fills everything BEHIND the sheet
        - View (position:absolute, bottom:0, explicit height) = sheet ON TOP
        Since the sheet is rendered after the backdrop and is position:absolute,
        it sits in a higher z-layer. Touches on the sheet go to the sheet;
        touches on the backdrop area (above the sheet) close the modal.
        The ScrollView gets a concrete pixel height to scroll within.
      */}

      {/* Backdrop */}
      <TouchableOpacity
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}
        activeOpacity={1}
        onPress={onClose}
        accessibilityLabel="Close meal detail"
        accessibilityRole="button"
      />

      {/* Sheet — position:absolute gives it an explicit height the ScrollView can resolve */}
      <View style={{
        position: 'absolute',
        bottom: 0, left: 0, right: 0,
        height: SHEET_HEIGHT,
        backgroundColor: colors.background,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
      }}>
        {/* Drag handle */}
        <View style={{ alignItems: 'center', paddingTop: spacing.md, paddingBottom: spacing.xs }}>
          <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.surface2 }} />
        </View>

        {/* Scrollable content — flex:1 fills the remaining sheet height */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: spacing.base, gap: spacing.lg, paddingBottom: 48 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Title row */}
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md }}>
            <Text style={{ fontSize: 36 }}>{MEAL_ICONS[meal.type] ?? '🍴'}</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: typography.family.semiBold, fontSize: typography.size.xs, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {t(`diet.mealType.${meal.type}`, { defaultValue: meal.type })}
                {meal.isTreat ? ' ✨' : ''}{meal.batchCookable ? ' · 🍱' : ''}
                {meal.prepTime ? ` · ${meal.prepTime} min` : ''}
              </Text>
              <Text style={{ fontFamily: typography.family.extraBold, fontSize: typography.size['2xl'], color: colors.textPrimary }}>
                {meal.name}
              </Text>
            </View>
          </View>

          {/* Macro pills */}
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            {[
              { label: t('diet.kcal'), value: meal.calories, color: colors.textPrimary },
              { label: t('diet.protein'), value: `${meal.protein}g`, color: colors.primary },
              { label: t('diet.carbs'), value: `${meal.carbs}g`, color: '#F59E0B' },
              { label: t('diet.fat'), value: `${meal.fat}g`, color: '#8B5CF6' },
            ].map((m) => (
              <View key={m.label} style={{ flex: 1, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.sm, alignItems: 'center' }}>
                <Text style={{ fontFamily: typography.family.extraBold, fontSize: typography.size.base, color: m.color }}>{m.value}</Text>
                <Text style={{ fontFamily: typography.family.regular, fontSize: typography.size.xs, color: colors.textMuted }}>{m.label}</Text>
              </View>
            ))}
          </View>

          {/* Ingredients */}
          {(meal.ingredients?.length ?? 0) > 0 && (
            <View style={{ gap: spacing.sm }}>
              <Text style={{ fontFamily: typography.family.bold, fontSize: typography.size.xl, color: colors.textPrimary }}>
                🛒 {t('diet.ingredients')}
              </Text>
              {meal.ingredients!.map((ing, i) => (
                <View key={i} style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' }}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary, marginTop: 7, flexShrink: 0 }} />
                  <Text style={{ fontFamily: typography.family.regular, fontSize: typography.size.body, color: colors.textPrimary, flex: 1 }}>
                    {ing}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Preparation */}
          {(meal.preparationSteps?.length ?? 0) > 0 && (
            <View style={{ gap: spacing.sm }}>
              <Text style={{ fontFamily: typography.family.bold, fontSize: typography.size.xl, color: colors.textPrimary }}>
                👨‍🍳 {t('diet.preparation')}
              </Text>
              {meal.preparationSteps!.map((step, i) => (
                <View key={i} style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start', backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md }}>
                  <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Text style={{ fontFamily: typography.family.extraBold, fontSize: typography.size.xs, color: tokenColors.white }}>{i + 1}</Text>
                  </View>
                  <Text style={{ fontFamily: typography.family.regular, fontSize: typography.size.body, color: colors.textPrimary, flex: 1, lineHeight: 22 }}>
                    {step}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* No recipe fallback */}
          {!hasRecipe && (
            <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.base, alignItems: 'center', gap: spacing.sm }}>
              <Text style={{ fontSize: 32 }}>🍽️</Text>
              <Text style={{ fontFamily: typography.family.regular, fontSize: typography.size.base, color: colors.textMuted, textAlign: 'center' }}>
                {t('diet.noRecipe')}
              </Text>
            </View>
          )}

          {/* Video link */}
          {meal.recipeVideoUrl && (
            <TouchableOpacity
              onPress={() => Linking.openURL(meal.recipeVideoUrl!)}
              style={{
                flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                gap: spacing.sm, backgroundColor: '#FF0000',
                borderRadius: radius.lg, paddingVertical: spacing.md,
              }}
              accessibilityLabel={t('diet.watchYoutube')} accessibilityRole="link"
            >
              <Text style={{ fontSize: 20 }}>▶️</Text>
              <Text style={{ fontFamily: typography.family.bold, fontSize: typography.size.body, color: tokenColors.white }}>
                {t('diet.watchYoutube')}
              </Text>
            </TouchableOpacity>
          )}

          {/* Close */}
          <TouchableOpacity
            onPress={onClose}
            style={{ alignItems: 'center', paddingVertical: spacing.md }}
            accessibilityLabel={t('common.close')} accessibilityRole="button"
          >
            <Text style={{ fontFamily: typography.family.semiBold, fontSize: typography.size.base, color: colors.textMuted }}>{t('common.close')}</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  )
}
