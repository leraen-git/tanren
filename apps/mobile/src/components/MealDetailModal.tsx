import React from 'react'
import { View, Text, ScrollView, TouchableOpacity, Modal, Linking } from 'react-native'
import { useTheme } from '@/theme/ThemeContext'
import { colors as tokenColors } from '@/theme/tokens'

export const MEAL_ICONS: Record<string, string> = {
  breakfast: '🌅',
  lunch: '☀️',
  dinner: '🌙',
  dessert: '🍫',
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
  if (!meal) return null

  const hasRecipe = (meal.ingredients?.length ?? 0) > 0 || (meal.preparationSteps?.length ?? 0) > 0

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <TouchableOpacity
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}
        activeOpacity={1}
        onPress={onClose}
        accessibilityLabel="Close meal detail"
        accessibilityRole="button"
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => {}}
          style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            backgroundColor: colors.background,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            maxHeight: '90%',
          }}
        >
          {/* Drag handle */}
          <View style={{ alignItems: 'center', paddingTop: spacing.md }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.surface2 }} />
          </View>

          <ScrollView contentContainerStyle={{ padding: spacing.base, gap: spacing.lg, paddingBottom: 48 }}>
            {/* Title row */}
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md }}>
              <Text style={{ fontSize: 36 }}>{MEAL_ICONS[meal.type] ?? '🍴'}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: typography.family.semiBold, fontSize: typography.size.xs, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  {meal.type}{meal.isTreat ? ' ✨' : ''}{meal.batchCookable ? ' · 🍱' : ''}
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
                { label: 'kcal', value: meal.calories, color: colors.textPrimary },
                { label: 'Protein', value: `${meal.protein}g`, color: colors.primary },
                { label: 'Carbs', value: `${meal.carbs}g`, color: '#F59E0B' },
                { label: 'Fat', value: `${meal.fat}g`, color: '#8B5CF6' },
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
                  🛒 Ingredients
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
                  👨‍🍳 Preparation
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
                  No recipe stored yet. Regenerate your plan to get full ingredient lists and steps.
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
                accessibilityLabel="Watch recipe on YouTube" accessibilityRole="link"
              >
                <Text style={{ fontSize: 20 }}>▶️</Text>
                <Text style={{ fontFamily: typography.family.bold, fontSize: typography.size.body, color: tokenColors.white }}>
                  Watch recipe on YouTube
                </Text>
              </TouchableOpacity>
            )}

            {/* Close */}
            <TouchableOpacity
              onPress={onClose}
              style={{ alignItems: 'center', paddingVertical: spacing.md }}
              accessibilityLabel="Close" accessibilityRole="button"
            >
              <Text style={{ fontFamily: typography.family.semiBold, fontSize: typography.size.base, color: colors.textMuted }}>Close</Text>
            </TouchableOpacity>
          </ScrollView>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  )
}
