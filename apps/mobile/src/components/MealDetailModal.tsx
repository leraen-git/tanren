import React from 'react'
import { View, Text, ScrollView, TouchableOpacity, Modal, Linking, Dimensions } from 'react-native'
import { useTheme } from '@/theme/ThemeContext'
import { useTranslation } from 'react-i18next'

export const MEAL_ICONS: Record<string, string> = {
  breakfast: 'AM',
  lunch: 'MD',
  snack: 'SN',
  dinner: 'PM',
  dessert: 'DS',
}

const MEAL_ORDER: Record<string, number> = {
  breakfast: 0,
  lunch: 1,
  snack: 2,
  dinner: 3,
  dessert: 4,
}

const SNACK_AM_KEYWORDS = ['mid-morning', 'mid morning', 'morning snack', 'pre-workout', 'pre workout', 'pre-lunch', 'mid-matin']
const SNACK_PM_KEYWORDS = ['afternoon', 'après-midi', 'evening snack', 'pre-dinner', 'post-workout', 'post workout', 'post-lunch']
const SNACK_KEYWORDS = [...SNACK_AM_KEYWORDS, ...SNACK_PM_KEYWORDS, 'snack', 'collation']

function getSnackSortOrder(name: string): number {
  const lower = name.toLowerCase()
  if (SNACK_AM_KEYWORDS.some((k) => lower.includes(k))) return 0.5
  return 2
}

export function sortMeals<T extends { type: string; name: string }>(meals: T[]): T[] {
  const typeCounts: Record<string, number> = {}
  for (const m of meals) typeCounts[m.type] = (typeCounts[m.type] ?? 0) + 1

  const normalized = meals.map((m) => {
    if ((typeCounts[m.type] ?? 0) > 1) {
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

export const MealDetailModal = React.memo(function MealDetailModal({ meal, onClose }: { meal: DietMeal | null; onClose: () => void }) {
  const { tokens, fonts } = useTheme()
  const { t } = useTranslation()
  if (!meal) return null

  const SHEET_HEIGHT = Dimensions.get('window').height * 0.85
  const hasRecipe = (meal.ingredients?.length ?? 0) > 0 || (meal.preparationSteps?.length ?? 0) > 0

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <TouchableOpacity
        style={{ flex: 1, backgroundColor: tokens.overlay }}
        activeOpacity={1}
        onPress={onClose}
        accessibilityLabel="Close meal detail"
        accessibilityRole="button"
      />

      <View style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        height: SHEET_HEIGHT, backgroundColor: tokens.bg,
      }}>
        {/* Drag handle */}
        <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 4 }}>
          <View style={{ width: 40, height: 3, backgroundColor: tokens.border }} />
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 48 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Title row */}
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
            <View style={{ width: 44, height: 44, borderWidth: 1, borderColor: tokens.accent, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontFamily: fonts.sansB, fontSize: 10, color: tokens.accent, letterSpacing: 1 }}>
                {MEAL_ICONS[meal.type] ?? 'ML'}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: fonts.sansB, fontSize: 9, color: tokens.textMute, textTransform: 'uppercase', letterSpacing: 1.4 }}>
                {t(`diet.mealType.${meal.type}`, { defaultValue: meal.type })}
                {meal.batchCookable ? ' / BATCH' : ''}
                {meal.prepTime ? ` / ${meal.prepTime} min` : ''}
              </Text>
              <Text style={{ fontFamily: fonts.sansX, fontSize: 20, color: tokens.text, textTransform: 'uppercase' }}>
                {meal.name}
              </Text>
            </View>
          </View>

          {/* Macro strip */}
          <View style={{ flexDirection: 'row', borderWidth: 1, borderColor: tokens.border }}>
            {[
              { label: 'KCAL', value: meal.calories, color: tokens.text },
              { label: t('diet.protein'), value: `${meal.protein}g`, color: tokens.accent },
              { label: t('diet.carbs'), value: `${meal.carbs}g`, color: tokens.amber },
              { label: t('diet.fat'), value: `${meal.fat}g`, color: tokens.green },
            ].map((m, i) => (
              <View key={m.label} style={{
                flex: 1, alignItems: 'center', paddingVertical: 10,
                borderLeftWidth: i > 0 ? 1 : 0, borderLeftColor: tokens.border,
              }}>
                <Text style={{ fontFamily: fonts.sansX, fontSize: 16, color: m.color }}>{m.value}</Text>
                <Text style={{ fontFamily: fonts.sansM, fontSize: 8, color: tokens.textMute, textTransform: 'uppercase', letterSpacing: 1 }}>{m.label}</Text>
              </View>
            ))}
          </View>

          {/* Ingredients */}
          {(meal.ingredients?.length ?? 0) > 0 && (
            <View style={{ gap: 6 }}>
              <Text style={{ fontFamily: fonts.sansB, fontSize: 9, color: tokens.textMute, textTransform: 'uppercase', letterSpacing: 2 }}>
                {t('diet.ingredients')}
              </Text>
              {meal.ingredients!.map((ing, i) => (
                <View key={i} style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
                  <Text style={{ fontFamily: fonts.sans, fontSize: 12, color: tokens.accent, marginTop: 1 }}>-</Text>
                  <Text style={{ fontFamily: fonts.sans, fontSize: 12, color: tokens.text, flex: 1, lineHeight: 18 }}>
                    {ing}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Preparation */}
          {(meal.preparationSteps?.length ?? 0) > 0 && (
            <View style={{ gap: 6 }}>
              <Text style={{ fontFamily: fonts.sansB, fontSize: 9, color: tokens.textMute, textTransform: 'uppercase', letterSpacing: 2 }}>
                {t('diet.preparation')}
              </Text>
              {meal.preparationSteps!.map((step, i) => (
                <View key={i} style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start', borderBottomWidth: 1, borderBottomColor: tokens.border, paddingVertical: 8 }}>
                  <View style={{ width: 24, height: 24, borderWidth: 1, borderColor: tokens.accent, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontFamily: fonts.sansB, fontSize: 11, color: tokens.accent }}>{i + 1}</Text>
                  </View>
                  <Text style={{ fontFamily: fonts.sans, fontSize: 12, color: tokens.text, flex: 1, lineHeight: 18 }}>
                    {step}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {!hasRecipe && (
            <View style={{ borderWidth: 1, borderColor: tokens.border, padding: 16, alignItems: 'center', gap: 6 }}>
              <Text style={{ fontFamily: fonts.sans, fontSize: 12, color: tokens.textMute, textAlign: 'center' }}>
                {t('diet.noRecipe')}
              </Text>
            </View>
          )}

          {meal.recipeVideoUrl && (
            <TouchableOpacity
              onPress={() => Linking.openURL(meal.recipeVideoUrl!)}
              style={{
                flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                gap: 8, backgroundColor: tokens.accent, height: 44,
              }}
              accessibilityLabel={t('diet.watchYoutube')} accessibilityRole="link"
            >
              <Text style={{ fontFamily: fonts.sansB, fontSize: 12, color: '#FFFFFF', textTransform: 'uppercase', letterSpacing: 1 }}>
                {t('diet.watchYoutube')}
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            onPress={onClose}
            style={{ height: 44, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: tokens.border }}
            accessibilityLabel={t('common.close')} accessibilityRole="button"
          >
            <Text style={{ fontFamily: fonts.sansB, fontSize: 11, color: tokens.textMute, textTransform: 'uppercase', letterSpacing: 1 }}>
              {t('common.close')}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  )
})
