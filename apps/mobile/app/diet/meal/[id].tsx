import React from 'react'
import { View, Text, ScrollView, TouchableOpacity, Linking } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { useTheme } from '@/theme/ThemeContext'
import { Screen } from '@/components/Screen'
import { ScreenHeader } from '@/components/ScreenHeader'
import { trpc } from '@/lib/trpc'
import { useTranslation } from 'react-i18next'

export default function MealDetailScreen() {
  const { tokens, fonts, label } = useTheme()
  const { t } = useTranslation()
  const { id } = useLocalSearchParams<{ id: string }>()
  const { data: plan } = trpc.diet.getMyPlanV2.useQuery()

  const meal = React.useMemo(() => {
    if (!plan?.days) return null
    for (const day of plan.days) {
      for (const m of day.meals) {
        if (m.id === id) return m
      }
    }
    return null
  }, [plan, id])

  if (!meal) {
    return (
      <Screen showKanji kanjiChar="錬">
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontFamily: fonts.sans, fontSize: 14, color: tokens.textMute }}>
            {t('common.loading')}
          </Text>
        </View>
      </Screen>
    )
  }

  const ingredients = (meal.ingredients ?? []) as { name: string; quantity: string; unit: string }[]
  const steps = (meal.recipeSteps ?? []) as { stepNumber: number; instruction: string }[]

  return (
    <Screen showKanji kanjiChar="錬">
      <ScreenHeader onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {/* Header */}
        <View style={{ marginBottom: 16 }}>
          <Text style={{ ...label.sm, color: tokens.accent, marginBottom: 4 }}>
            {t(`diet.mealType.${meal.mealType}`, { defaultValue: meal.mealType })}
            {' · '}{meal.suggestedTime}
            {meal.prepTimeMin ? ` · ${meal.prepTimeMin} min` : ''}
          </Text>
          <Text style={{
            fontFamily: fonts.sansX, fontSize: 22, color: tokens.text,
            textTransform: 'uppercase', letterSpacing: 0.4, lineHeight: 26,
          }}>
            {meal.name}
          </Text>
        </View>

        {/* Macros grid — 4 cells */}
        <View style={{ flexDirection: 'row', borderWidth: 1, borderColor: tokens.border, marginBottom: 14 }}>
          {[
            { label: 'Cal', value: String(meal.kcal), color: tokens.text, unit: '' },
            { label: 'Prot', value: String(meal.proteinG), color: tokens.accent, unit: 'g' },
            { label: 'Gluc', value: String(meal.carbsG), color: tokens.amber, unit: 'g' },
            { label: 'Lip', value: String(meal.fatG), color: tokens.green, unit: 'g' },
          ].map((cell, i) => (
            <View key={cell.label} style={{
              flex: 1, paddingVertical: 10, alignItems: 'center',
              borderLeftWidth: i > 0 ? 1 : 0, borderLeftColor: tokens.border,
            }}>
              <Text style={{ fontFamily: fonts.sansB, fontSize: 8, letterSpacing: 2, color: tokens.textMute, textTransform: 'uppercase', marginBottom: 3 }}>
                {cell.label}
              </Text>
              <Text style={{ fontFamily: fonts.monoB, fontSize: 14, color: cell.color }}>
                {cell.value}{cell.unit && <Text style={{ fontFamily: fonts.mono, fontSize: 8, color: tokens.textMute }}>{cell.unit}</Text>}
              </Text>
            </View>
          ))}
        </View>

        {/* Ingredients */}
        {ingredients.length > 0 && (
          <>
            <Text style={{ ...label.sm, color: tokens.textMute, marginBottom: 8 }}>
              {t('diet.mealIngredients')}
            </Text>
            {ingredients.map((ing, i) => (
              <View key={i} style={{
                flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: tokens.border,
              }}>
                <Text style={{ fontFamily: fonts.sansM, fontSize: 12, color: tokens.text }}>
                  {ing.name}
                </Text>
                <Text style={{ fontFamily: fonts.monoB, fontSize: 11, color: tokens.textMute }}>
                  {ing.quantity} {ing.unit}
                </Text>
              </View>
            ))}
          </>
        )}

        {/* Recipe steps */}
        {steps.length > 0 && (
          <>
            <Text style={{ ...label.sm, color: tokens.textMute,
              marginTop: 16, marginBottom: 8 }}>
              {t('diet.mealPrep')}
            </Text>
            {steps.map((step) => (
              <View key={step.stepNumber} style={{
                flexDirection: 'row', gap: 10, alignItems: 'flex-start',
                paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: tokens.border,
              }}>
                <Text style={{ fontFamily: fonts.monoB, fontSize: 12, color: tokens.accent, minWidth: 24 }}>
                  {String(step.stepNumber).padStart(2, '0')}
                </Text>
                <Text style={{ fontFamily: fonts.sans, fontSize: 12, color: tokens.textDim, lineHeight: 18, flex: 1 }}>
                  {step.instruction}
                </Text>
              </View>
            ))}
          </>
        )}

        {/* YouTube CTA — real URL or search fallback */}
        <TouchableOpacity
            onPress={() => Linking.openURL(meal.youtubeUrl || `https://www.youtube.com/results?search_query=${encodeURIComponent(`recette ${meal.name}`)}`)}
            style={{
              flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
              borderWidth: 1, borderColor: tokens.borderStrong,
              borderLeftWidth: 3, borderLeftColor: '#FF0000',
              padding: 14, marginTop: 20, gap: 10,
            }}
            accessibilityLabel={t('diet.mealYoutube')}
            accessibilityRole="link"
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{
                width: 28, height: 20, backgroundColor: '#FF0000', borderRadius: 4,
                alignItems: 'center', justifyContent: 'center',
              }}>
                <View style={{
                  width: 0, height: 0,
                  borderTopWidth: 5, borderTopColor: 'transparent',
                  borderBottomWidth: 5, borderBottomColor: 'transparent',
                  borderLeftWidth: 8, borderLeftColor: '#FFFFFF',
                  marginLeft: 2,
                }} />
              </View>
              <Text style={{ fontFamily: fonts.sansB, fontSize: 12, letterSpacing: 0.8, textTransform: 'uppercase', color: tokens.text }}>
                {t('diet.mealYoutube')}
              </Text>
            </View>
            <Text style={{ fontFamily: fonts.sans, fontSize: 18, color: tokens.textMute }}>›</Text>
          </TouchableOpacity>
      </ScrollView>
    </Screen>
  )
}
