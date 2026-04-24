import React from 'react'
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { useTheme } from '@/theme/ThemeContext'
import { Button } from '@/components/Button'
import { trpc } from '@/lib/trpc'
import { useInvalidateActivePlan, useInvalidateWorkouts } from '@/lib/invalidation'
import { useAIPlanStore } from '@/stores/aiPlanStore'
import { translateMuscleGroup } from '@/hooks/useExercises'

const DAY_NAMES: Record<number, string> = { 1: 'Lun', 2: 'Mar', 3: 'Mer', 4: 'Jeu', 5: 'Ven', 6: 'Sam', 7: 'Dim' }

export default function PreviewPlanScreen() {
  const { tokens, fonts } = useTheme()
  const { t } = useTranslation()
  const { proposedPlan, reset } = useAIPlanStore()
  const { data: plans } = trpc.plans.list.useQuery()
  const currentActivePlan = plans?.find((p) => p.isActive)
  const invalidatePlans = useInvalidateActivePlan()
  const invalidateWorkouts = useInvalidateWorkouts()

  const acceptPlan = trpc.plans.acceptGenerated.useMutation({
    onSuccess: async () => {
      invalidatePlans()
      invalidateWorkouts()
      reset()
      router.replace('/')
    },
    onError: (err) => Alert.alert(t('common.error'), err.message),
  })

  const handleActivate = () => {
    if (!proposedPlan) return

    const warningParts: string[] = []
    const sessionCount = proposedPlan.days.length
    warningParts.push(t('ai.previewActivateWarning', {
      count: sessionCount,
      name: currentActivePlan?.name ?? '',
    }))

    Alert.alert(
      t('planBuilder.activationWarningTitle'),
      warningParts.join(''),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('ai.previewActivate'), onPress: () => acceptPlan.mutate(proposedPlan) },
      ]
    )
  }

  if (!proposedPlan) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: tokens.bg, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontFamily: fonts.sans, color: tokens.textMute }}>{t('plans.noPlans')}</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }} accessibilityLabel={t('common.back')} accessibilityRole="button">
          <Text style={{ fontFamily: fonts.sansB, color: tokens.accent, textTransform: 'uppercase', letterSpacing: 2, fontSize: 10 }}>{t('common.back')}</Text>
        </TouchableOpacity>
      </SafeAreaView>
    )
  }

  const sortedDays = [...proposedPlan.days].sort((a, b) => a.dayOfWeek - b.dayOfWeek)

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: tokens.bg }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 }}>
        <TouchableOpacity onPress={() => router.back()} accessibilityLabel={t('common.back')} accessibilityRole="button">
          <Text style={{ fontFamily: fonts.sansB, fontSize: 10, color: tokens.accent, textTransform: 'uppercase', letterSpacing: 2 }}>
            {'< '}{t('common.back').toUpperCase()}
          </Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }} />
        <View style={{
          backgroundColor: tokens.accent,
          paddingHorizontal: 8,
          paddingVertical: 3,
        }}>
          <Text style={{ fontFamily: fonts.sansB, fontSize: 9, color: '#FFFFFF', letterSpacing: 1.4, textTransform: 'uppercase' }}>
            {t('ai.previewBadge')}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 20, paddingBottom: 140 }}>
        {/* Plan name block */}
        <View style={{
          backgroundColor: tokens.surface1,
          padding: 16,
          borderWidth: 1,
          borderColor: tokens.border,
          borderLeftWidth: 3,
          borderLeftColor: tokens.accent,
        }}>
          <Text style={{ fontFamily: fonts.sansB, fontSize: 9, color: tokens.textMute, textTransform: 'uppercase', letterSpacing: 2 }}>
            {t('ai.previewTitle').toUpperCase()}
          </Text>
          <Text style={{ fontFamily: fonts.sansX, fontSize: 24, color: tokens.text, textTransform: 'uppercase', marginTop: 4 }}>
            {proposedPlan.name}
          </Text>
          <Text style={{ fontFamily: fonts.sans, fontSize: 12, color: tokens.textMute, marginTop: 4 }}>
            {sortedDays.map((d) => DAY_NAMES[d.dayOfWeek]).join(' · ')} · {proposedPlan.days.length} {t('ai.exos')}/{t('ai.perWeek').replace('/ ', '')}
          </Text>
        </View>

        {/* Schedule header */}
        <Text style={{ fontFamily: fonts.sansB, fontSize: 10, color: tokens.textMute, textTransform: 'uppercase', letterSpacing: 2 }}>
          {t('ai.previewSchedule').toUpperCase()}
        </Text>

        {/* Day cards */}
        {sortedDays.map((day, idx) => (
          <View key={idx} style={{
            borderWidth: 1,
            borderColor: tokens.border,
          }}>
            {/* Day header */}
            <View style={{ padding: 12, gap: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{
                  backgroundColor: tokens.accent,
                  paddingVertical: 2,
                  paddingHorizontal: 8,
                }}>
                  <Text style={{ fontFamily: fonts.sansB, fontSize: 9, color: '#FFFFFF', letterSpacing: 1.4, textTransform: 'uppercase' }}>
                    {DAY_NAMES[day.dayOfWeek]}
                  </Text>
                </View>
                <Text style={{ fontFamily: fonts.sansX, fontSize: 17, color: tokens.text, textTransform: 'uppercase', flex: 1 }}>
                  {day.workoutName}
                </Text>
              </View>

              <Text style={{ fontFamily: fonts.mono, fontSize: 11, color: tokens.textMute }}>
                ~{day.estimatedDuration} {t('common.min')}
              </Text>

              {day.muscleGroups.length > 0 && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
                  {day.muscleGroups.map((mg) => (
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

            {/* Exercises */}
            {day.exercises.map((ex, i) => (
              <View
                key={i}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                  borderTopWidth: 1,
                  borderTopColor: tokens.border,
                }}
              >
                <View style={{
                  width: 24, height: 24,
                  borderWidth: 1,
                  borderColor: tokens.accent,
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Text style={{ fontFamily: fonts.sansB, fontSize: 10, color: tokens.accent }}>
                    {i + 1}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: fonts.sansB, fontSize: 13, color: tokens.text, textTransform: 'uppercase' }}>
                    {ex.exerciseName}
                  </Text>
                  <Text style={{ fontFamily: fonts.mono, fontSize: 11, color: tokens.textMute }}>
                    {ex.defaultSets} {t('common.sets')} x {ex.defaultReps} {t('common.reps')} · {ex.defaultRestSeconds}s repos
                  </Text>
                </View>
              </View>
            ))}
          </View>
        ))}
      </ScrollView>

      {/* Bottom actions — two CTAs */}
      <View style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        backgroundColor: tokens.bg,
        padding: 16,
        gap: 8,
        borderTopWidth: 1,
        borderTopColor: tokens.border,
      }}>
        <Button
          label={t('ai.previewActivate')}
          onPress={handleActivate}
          loading={acceptPlan.isPending}
        />
        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            height: 44,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: tokens.border,
          }}
          accessibilityLabel={t('ai.previewEdit')}
          accessibilityRole="button"
        >
          <Text style={{ fontFamily: fonts.sansB, fontSize: 13, color: tokens.textDim, textTransform: 'uppercase', letterSpacing: 1 }}>
            {t('ai.previewEdit')}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}
