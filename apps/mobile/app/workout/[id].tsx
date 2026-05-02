import React from 'react'
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { useLocalSearchParams, router } from 'expo-router'
import { useTheme } from '@/theme/ThemeContext'
import { useTranslation } from 'react-i18next'
import { trpc } from '@/lib/trpc'
import { translateMuscleGroup } from '@/hooks/useExercises'

export default function WorkoutDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { tokens, fonts, label } = useTheme()
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()

  const { data: workout, isLoading } = trpc.workouts.detail.useQuery(
    { id: id ?? '' },
    { enabled: !!id },
  )

  if (isLoading || !workout) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: tokens.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={tokens.accent} size="large" />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: tokens.bg }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 }}>
        <TouchableOpacity onPress={() => router.back()} accessibilityLabel={t('common.back')} accessibilityRole="button">
          <Text style={{ ...label.md, color: tokens.accent }}>
            {'< ' + t('common.back').toUpperCase()}
          </Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }} />
        <TouchableOpacity
          onPress={() => router.push(`/workout/build?editId=${id}`)}
          accessibilityLabel={t('workout.modify')}
          accessibilityRole="button"
        >
          <Text style={{ ...label.md, color: tokens.accent }}>
            {t('workout.modify').toUpperCase()}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 100 }}>
        {/* Name + meta */}
        <View style={{ gap: 4 }}>
          <Text style={{ ...label.sm, color: tokens.textMute }}>
            {t('workout.session').toUpperCase()}
          </Text>
          <Text style={{ fontFamily: fonts.sansX, fontSize: 22, color: tokens.text, textTransform: 'uppercase' }}>
            {workout.name}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
            <Text style={{ fontFamily: fonts.mono, fontSize: 11, color: tokens.textMute }}>
              {t('workout.exerciseCount', { count: workout.exercises.length })} / ~{workout.estimatedDuration} {t('common.min')}
            </Text>
          </View>
          {workout.muscleGroups && workout.muscleGroups.length > 0 && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
              {workout.muscleGroups.map((mg) => (
                <View key={mg} style={{
                  borderWidth: 1,
                  borderColor: tokens.border,
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                }}>
                  <Text style={{ fontFamily: fonts.sansB, fontSize: 8, color: tokens.textMute, textTransform: 'uppercase', letterSpacing: 1 }}>
                    {translateMuscleGroup(mg, t)}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={{ height: 1, backgroundColor: tokens.border }} />

        {/* Exercises */}
        <View>
          <Text style={{ ...label.md, color: tokens.textMute, marginBottom: 8 }}>
            {t('workout.exercises').toUpperCase()}
          </Text>
          {workout.exercises.map((ex, i) => (
            <View key={ex.id} style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              paddingVertical: 10,
              paddingHorizontal: 4,
              borderTopWidth: i > 0 ? 1 : 0,
              borderTopColor: tokens.border,
            }}>
              <View style={{
                width: 28, height: 28,
                borderWidth: 1,
                borderColor: tokens.accent,
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Text style={{ fontFamily: fonts.sansB, fontSize: 11, color: tokens.accent }}>
                  {String(i + 1).padStart(2, '0')}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: fonts.sansB, fontSize: 13, color: tokens.text, textTransform: 'uppercase' }}>
                  {ex.exerciseName}
                </Text>
                <Text style={{ fontFamily: fonts.mono, fontSize: 11, color: tokens.textMute }}>
                  {ex.defaultSets}s x {ex.defaultReps}r{ex.defaultWeight > 0 ? ` / ${ex.defaultWeight} kg` : ''} / {ex.defaultRestSeconds}s
                </Text>
                {ex.previousSets.length > 0 && (
                  <Text style={{ fontFamily: fonts.sans, fontSize: 10, color: tokens.textGhost, marginTop: 2 }}>
                    {t('workout.lastSession')}: {ex.previousSets.map((s: any) => `${s.weight}kg x${s.reps}`).join(', ')}
                  </Text>
                )}
              </View>
              {ex.prWeight != null && (
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ fontFamily: fonts.sansB, fontSize: 8, color: tokens.accent, textTransform: 'uppercase', letterSpacing: 1 }}>PR</Text>
                  <Text style={{ fontFamily: fonts.monoB, fontSize: 12, color: tokens.accent }}>
                    {ex.prWeight} kg
                  </Text>
                </View>
              )}
            </View>
          ))}
          {workout.exercises.length === 0 && (
            <Text style={{ fontFamily: fonts.sans, fontSize: 13, color: tokens.textMute }}>
              {t('workout.noExercises')}
            </Text>
          )}
        </View>
      </ScrollView>

      {/* Start session CTA */}
      <View style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        padding: 16,
        paddingBottom: 16 + insets.bottom,
        backgroundColor: tokens.bg,
        borderTopWidth: 1,
        borderTopColor: tokens.border,
      }}>
        <TouchableOpacity
          onPress={() => router.push(`/workout/preview?templateId=${id}`)}
          style={{
            backgroundColor: tokens.accent,
            height: 48,
            alignItems: 'center',
            justifyContent: 'center',
          }}
          accessibilityLabel={t('workout.startSession')}
          accessibilityRole="button"
        >
          <Text style={{ fontFamily: fonts.sansX, fontSize: 14, color: '#FFFFFF', textTransform: 'uppercase', letterSpacing: 1 }}>
            {t('workout.startSession')}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}
