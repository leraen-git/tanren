import React from 'react'
import { View, Text, ScrollView, TouchableOpacity, Linking } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { useTheme } from '@/theme/ThemeContext'
import { Screen } from '@/components/Screen'
import { trpc } from '@/lib/trpc'
import { useTranslation } from 'react-i18next'

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return s > 0 ? `${m}:${String(s).padStart(2, '0')}` : `${m}:00`
}

export default function MealDetailScreen() {
  const { tokens, fonts } = useTheme()
  const { t } = useTranslation()
  const { id } = useLocalSearchParams<{ id: string }>()
  const { data: plan } = trpc.diet.getMyPlanV2.useQuery()

  const meal = React.useMemo(() => {
    if (!plan) return null
    const p = plan as any
    for (const day of p.days ?? []) {
      for (const m of day.meals ?? []) {
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
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {/* Drag handle */}
        <View style={{ alignItems: 'center', marginBottom: 8 }}>
          <View style={{ width: 40, height: 4, backgroundColor: tokens.borderStrong, borderRadius: 2 }} />
        </View>

        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
          <View style={{ flex: 1 }}>
            <Text style={{
              fontFamily: fonts.sansB, fontSize: 9, letterSpacing: 2.4,
              color: tokens.accent, textTransform: 'uppercase', marginBottom: 4,
            }}>
              {t(`diet.mealType.${meal.mealType}`, { defaultValue: meal.mealType })}
              {' · '}{meal.suggestedTime}
            </Text>
            <Text style={{
              fontFamily: fonts.sansX, fontSize: 19, color: tokens.text,
              textTransform: 'uppercase', letterSpacing: 0.4, lineHeight: 22,
            }}>
              {meal.name}
            </Text>
          </View>
          <TouchableOpacity onPress={() => router.back()} accessibilityLabel={t('common.close')} accessibilityRole="button">
            <Text style={{ fontFamily: fonts.sans, fontSize: 22, color: tokens.textMute, lineHeight: 24, paddingLeft: 8 }}>
              {'✕'}
            </Text>
          </TouchableOpacity>
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
            <Text style={{
              fontFamily: fonts.sansB, fontSize: 9, letterSpacing: 3,
              color: tokens.textMute, textTransform: 'uppercase', marginBottom: 8,
            }}>
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
            <Text style={{
              fontFamily: fonts.sansB, fontSize: 9, letterSpacing: 3,
              color: tokens.textMute, textTransform: 'uppercase',
              marginTop: 16, marginBottom: 8,
            }}>
              {t('diet.mealPrep')} · {meal.prepTimeMin} min
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

        {/* YouTube CTA */}
        {meal.youtubeUrl && (
          <TouchableOpacity
            onPress={() => Linking.openURL(meal.youtubeUrl)}
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
              <View>
                <Text style={{ fontFamily: fonts.sansB, fontSize: 12, letterSpacing: 0.8, textTransform: 'uppercase', color: tokens.text }}>
                  {t('diet.mealYoutube')}
                </Text>
                {meal.youtubeChannelName && (
                  <Text style={{ fontFamily: fonts.sansM, fontSize: 10, color: tokens.textMute, letterSpacing: 0.6 }}>
                    {meal.youtubeChannelName}
                    {meal.youtubeDurationSec ? ` · ${formatDuration(meal.youtubeDurationSec)}` : ''}
                  </Text>
                )}
              </View>
            </View>
            <Text style={{ fontFamily: fonts.sans, fontSize: 18, color: tokens.textMute }}>›</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </Screen>
  )
}
