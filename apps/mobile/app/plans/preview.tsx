import React from 'react'
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { useTheme } from '@/theme/ThemeContext'
import { Button } from '@/components/Button'
import { trpc } from '@/lib/trpc'
import { useAIPlanStore } from '@/stores/aiPlanStore'

const DAY_NAMES = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']

export default function PreviewPlanScreen() {
  const { tokens, fonts } = useTheme()
  const { t } = useTranslation()
  const { proposedPlan, reset } = useAIPlanStore()
  const utils = trpc.useUtils()

  const acceptPlan = trpc.plans.acceptGenerated.useMutation({
    onSuccess: async () => {
      await utils.plans.active.invalidate()
      await utils.plans.list.invalidate()
      reset()
      router.replace('/')
    },
    onError: (err) => Alert.alert('Failed to save plan', err.message),
  })

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

  const sortedDays = [...proposedPlan.days].sort((a, b) => ((a.dayOfWeek + 6) % 7) - ((b.dayOfWeek + 6) % 7))

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: tokens.bg }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 }}>
        <TouchableOpacity onPress={() => router.back()} accessibilityLabel="Go back" accessibilityRole="button">
          <Text style={{ fontFamily: fonts.sansB, fontSize: 10, color: tokens.accent, textTransform: 'uppercase', letterSpacing: 2 }}>
            {'< BACK'}
          </Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }} />
        <View style={{
          borderWidth: 1,
          borderColor: tokens.accent,
          paddingHorizontal: 8,
          paddingVertical: 3,
        }}>
          <Text style={{ fontFamily: fonts.sansB, fontSize: 9, color: tokens.accent, letterSpacing: 1.4 }}>AI</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 20, paddingBottom: 120 }}>
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
            PLAN NAME
          </Text>
          <Text style={{ fontFamily: fonts.sansX, fontSize: 24, color: tokens.text, textTransform: 'uppercase', marginTop: 4 }}>
            {proposedPlan.name}
          </Text>
          <Text style={{ fontFamily: fonts.sans, fontSize: 12, color: tokens.textMute, marginTop: 4 }}>
            {sortedDays.map((d) => DAY_NAMES[d.dayOfWeek]).join(' / ')} / {proposedPlan.days.length} sessions/week
          </Text>
        </View>

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
                  <Text style={{ fontFamily: fonts.sansB, fontSize: 9, color: '#FFFFFF', letterSpacing: 1.4 }}>
                    {DAY_NAMES[day.dayOfWeek]}
                  </Text>
                </View>
                <Text style={{ fontFamily: fonts.sansX, fontSize: 17, color: tokens.text, textTransform: 'uppercase', flex: 1 }}>
                  {day.workoutName}
                </Text>
              </View>

              <Text style={{ fontFamily: fonts.mono, fontSize: 11, color: tokens.textMute }}>
                ~{day.estimatedDuration} min
              </Text>

              {/* Muscle tags */}
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
                        {mg}
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
                    {ex.defaultSets}s x {ex.defaultReps}r / {ex.defaultRestSeconds}s rest
                  </Text>
                </View>
              </View>
            ))}
          </View>
        ))}
      </ScrollView>

      {/* Bottom actions */}
      <View style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        backgroundColor: tokens.bg,
        padding: 16,
        gap: 8,
        borderTopWidth: 1,
        borderTopColor: tokens.border,
      }}>
        <Button
          label={t('plans.activatePlan') || 'Activate this plan'}
          onPress={() => acceptPlan.mutate(proposedPlan)}
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
          accessibilityLabel="Ask for changes"
          accessibilityRole="button"
        >
          <Text style={{ fontFamily: fonts.sansB, fontSize: 13, color: tokens.textDim, textTransform: 'uppercase', letterSpacing: 1 }}>
            ASK FOR CHANGES
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}
