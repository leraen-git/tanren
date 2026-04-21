import { SafeAreaView } from 'react-native-safe-area-context'
import { useGuestBannerVisible } from '@/contexts/GuestBannerContext'
import React from 'react'
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native'
import { router } from 'expo-router'
import { useTheme } from '@/theme/ThemeContext'
import { SkeletonCard } from '@/components/SkeletonCard'
import { trpc } from '@/lib/trpc'
import { useTranslation } from 'react-i18next'

const DOW_KEY = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const

function SectionHeader({ title, onAdd, addLabel }: { title: string; onAdd: () => void; addLabel: string }) {
  const { tokens, fonts } = useTheme()
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
      <Text style={{
        fontFamily: fonts.sansB,
        fontSize: 10,
        letterSpacing: 3,
        color: tokens.textMute,
        textTransform: 'uppercase',
      }}>
        {title}
      </Text>
      <TouchableOpacity onPress={onAdd} accessibilityLabel={addLabel} accessibilityRole="button">
        <Text style={{
          fontFamily: fonts.sansB,
          fontSize: 10,
          letterSpacing: 1,
          color: tokens.accent,
          textTransform: 'uppercase',
        }}>
          + {addLabel}
        </Text>
      </TouchableOpacity>
    </View>
  )
}

export default function WorkoutsScreen() {
  const { tokens, fonts } = useTheme()
  const { t } = useTranslation()
  const bannerVisible = useGuestBannerVisible()

  const utils = trpc.useUtils()
  const { data: plans, isLoading: plansLoading, refetch: refetchPlans, isRefetching } = trpc.plans.list.useQuery()
  const { data: workouts, isLoading: workoutsLoading, refetch: refetchWorkouts } = trpc.workouts.list.useQuery()

  const activatePlan = trpc.plans.activate.useMutation({
    onSuccess: () => { utils.plans.list.invalidate(); utils.plans.active.invalidate() },
  })

  const activePlan = plans?.find((p) => p.isActive)
  const inactivePlans = plans?.filter((p) => !p.isActive) ?? []

  const refetch = () => { refetchPlans(); refetchWorkouts() }

  type PlanDay = { id: string; dayOfWeek: number; workoutName: string; workoutTemplateId: string; muscleGroups?: string[] }
  const sortedDays = (days: PlanDay[]) =>
    [...days].sort((a, b) => ((a.dayOfWeek + 6) % 7) - ((b.dayOfWeek + 6) % 7))

  return (
    <SafeAreaView edges={bannerVisible ? [] : ['top']} style={{ flex: 1, backgroundColor: tokens.bg }}>
      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 20 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={tokens.accent} />}
      >
        {/* Plans section */}
        <View>
          <SectionHeader
            title={t('workout.myPlan')}
            onAdd={() => router.push('/plans/create')}
            addLabel={t('workout.addNew')}
          />

          {plansLoading && <SkeletonCard height={120} />}

          {activePlan && (
            <TouchableOpacity
              onPress={() => router.push(`/plans/create?id=${activePlan.id}`)}
              style={{
                backgroundColor: tokens.surface1,
                borderWidth: 1,
                borderColor: tokens.accent,
                overflow: 'hidden',
              }}
              accessibilityLabel={`${t('workout.myPlan')}: ${activePlan.name}`}
              accessibilityRole="button"
            >
              <View style={{ padding: 16, gap: 4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{
                    backgroundColor: tokens.accent,
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                  }}>
                    <Text style={{
                      fontFamily: fonts.sansB,
                      fontSize: 9,
                      letterSpacing: 2,
                      color: '#FFFFFF',
                      textTransform: 'uppercase',
                    }}>
                      {t('workout.activeBadge')}
                    </Text>
                  </View>
                  <Text style={{ fontFamily: fonts.sans, fontSize: 20, color: tokens.textMute }}>›</Text>
                </View>
                <Text style={{
                  fontFamily: fonts.sansX,
                  fontSize: 20,
                  color: tokens.text,
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                }}>
                  {activePlan.name}
                </Text>
                <Text style={{ fontFamily: fonts.sans, fontSize: 12, color: tokens.textMute }}>
                  {t('workout.daysPerWeek', { count: activePlan.days.length })}
                </Text>
              </View>

              <View style={{ height: 1, backgroundColor: tokens.border }} />

              <View style={{ padding: 16, gap: 8 }}>
                {sortedDays(activePlan.days).map((d) => (
                  <View key={d.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={{
                      width: 40,
                      height: 40,
                      backgroundColor: tokens.surface2,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <Text style={{ fontFamily: fonts.sansB, fontSize: 12, color: tokens.accent }}>
                        {t(`days.${DOW_KEY[d.dayOfWeek]}`)}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: fonts.sansM, fontSize: 14, color: tokens.text }}>
                        {d.workoutName}
                      </Text>
                      {d.muscleGroups && d.muscleGroups.length > 0 && (
                        <Text style={{ fontFamily: fonts.sans, fontSize: 12, color: tokens.textMute }}>
                          {d.muscleGroups.slice(0, 3).join(' · ')}
                        </Text>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            </TouchableOpacity>
          )}

          {inactivePlans.length > 0 && (
            <View style={{ marginTop: 12, gap: 8 }}>
              <Text style={{
                fontFamily: fonts.sansB,
                fontSize: 9,
                letterSpacing: 2,
                color: tokens.textGhost,
                textTransform: 'uppercase',
              }}>
                {t('workout.otherPlans')}
              </Text>
              {inactivePlans.map((plan) => (
                <TouchableOpacity
                  key={plan.id}
                  onPress={() => router.push(`/plans/create?id=${plan.id}`)}
                  style={{
                    backgroundColor: tokens.surface1,
                    borderWidth: 1,
                    borderColor: tokens.border,
                    padding: 16,
                    flexDirection: 'row',
                    alignItems: 'center',
                  }}
                  accessibilityLabel={plan.name}
                  accessibilityRole="button"
                >
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={{ fontFamily: fonts.sansB, fontSize: 14, color: tokens.text }}>
                      {plan.name}
                    </Text>
                    <Text style={{ fontFamily: fonts.sans, fontSize: 12, color: tokens.textMute }}>
                      {t('workout.daysPerWeek', { count: plan.days.length })}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={(e) => { e.stopPropagation?.(); activatePlan.mutate({ id: plan.id }) }}
                    style={{
                      borderWidth: 1,
                      borderColor: tokens.accent,
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      marginRight: 8,
                    }}
                    accessibilityLabel={t('workout.activate')}
                    accessibilityRole="button"
                  >
                    <Text style={{
                      fontFamily: fonts.sansB,
                      fontSize: 10,
                      letterSpacing: 1,
                      textTransform: 'uppercase',
                      color: tokens.accent,
                    }}>
                      {t('workout.activate')}
                    </Text>
                  </TouchableOpacity>
                  <Text style={{ fontFamily: fonts.sans, fontSize: 20, color: tokens.textMute }}>›</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {!plansLoading && !plans?.length && (
            <TouchableOpacity
              onPress={() => router.push('/plans/create')}
              style={{
                borderWidth: 1,
                borderColor: tokens.borderStrong,
                borderStyle: 'dashed',
                padding: 20,
                alignItems: 'center',
                gap: 8,
              }}
              accessibilityLabel={t('workout.noPlanYet')}
              accessibilityRole="button"
            >
              <Text style={{
                fontFamily: fonts.sansM,
                fontSize: 14,
                color: tokens.text,
              }}>
                {t('workout.noPlanYet')}
              </Text>
              <Text style={{ fontFamily: fonts.sans, fontSize: 12, color: tokens.textMute }}>
                {t('workout.noPlanYetDesc')}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Workout templates */}
        <View>
          <SectionHeader
            title={t('tabs.workouts')}
            onAdd={() => router.push('/workout/build')}
            addLabel={t('workout.addNew')}
          />

          {workoutsLoading && [1, 2, 3].map((i) => <SkeletonCard key={i} height={72} />)}

          <View style={{ gap: 1, borderWidth: 1, borderColor: tokens.border }}>
            {workouts?.map((w, idx) => (
              <TouchableOpacity
                key={w.id}
                onPress={() => router.push(`/workout/${w.id}`)}
                style={{
                  backgroundColor: tokens.surface1,
                  padding: 16,
                  flexDirection: 'row',
                  alignItems: 'center',
                  borderTopWidth: idx > 0 ? 1 : 0,
                  borderTopColor: tokens.border,
                }}
                accessibilityLabel={w.name}
                accessibilityRole="button"
              >
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ fontFamily: fonts.sansB, fontSize: 14, color: tokens.text }}>
                    {w.name}
                  </Text>
                  <Text style={{ fontFamily: fonts.sans, fontSize: 12, color: tokens.textMute }}>
                    {w.muscleGroups.length > 0 ? `${w.muscleGroups.slice(0, 3).join(' · ')} · ` : ''}{w.estimatedDuration} {t('common.min')}
                  </Text>
                </View>
                <Text style={{ fontFamily: fonts.sans, fontSize: 20, color: tokens.textMute }}>›</Text>
              </TouchableOpacity>
            ))}
          </View>

          {!workoutsLoading && workouts?.length === 0 && (
            <TouchableOpacity
              onPress={() => router.push('/workout/build')}
              style={{
                borderWidth: 1,
                borderColor: tokens.borderStrong,
                borderStyle: 'dashed',
                padding: 20,
                alignItems: 'center',
                gap: 8,
              }}
              accessibilityLabel={t('workout.noWorkoutsYet')}
              accessibilityRole="button"
            >
              <Text style={{ fontFamily: fonts.sansM, fontSize: 14, color: tokens.text }}>
                {t('workout.noWorkoutsYet')}
              </Text>
              <Text style={{ fontFamily: fonts.sans, fontSize: 12, color: tokens.textMute }}>
                {t('workout.noWorkoutsYetDesc')}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
