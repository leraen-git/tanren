import { SafeAreaView } from 'react-native-safe-area-context'
import { useGuestBannerVisible } from '@/contexts/GuestBannerContext'
import React from 'react'
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native'
import { router } from 'expo-router'
import { useTheme } from '@/theme/ThemeContext'
import { SkeletonCard } from '@/components/SkeletonCard'
import { trpc } from '@/lib/trpc'
import { useTranslation } from 'react-i18next'
import { translateMuscleGroup } from '@/hooks/useExercises'

const DOW_SHORT: Record<number, string> = { 1: 'Lun', 2: 'Mar', 3: 'Mer', 4: 'Jeu', 5: 'Ven', 6: 'Sam', 7: 'Dim' }
const DOW_KEY: Record<number, string> = { 1: 'mon', 2: 'tue', 3: 'wed', 4: 'thu', 5: 'fri', 6: 'sat', 7: 'sun' }

function jsDowToUi(jsDow: number): number { return jsDow === 0 ? 7 : jsDow }

function SectionLabel({ title, count, onAdd, addLabel }: { title: string; count?: number; onAdd?: () => void; addLabel?: string }) {
  const { tokens, fonts } = useTheme()
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
      <Text style={{
        fontFamily: fonts.sansB,
        fontSize: 10,
        letterSpacing: 3,
        color: tokens.textMute,
        textTransform: 'uppercase',
      }}>
        {title}{count != null ? ` (${count})` : ''}
      </Text>
      {onAdd && addLabel && (
        <TouchableOpacity onPress={onAdd} accessibilityLabel={addLabel} accessibilityRole="button">
          <Text style={{
            fontFamily: fonts.sansB,
            fontSize: 10,
            letterSpacing: 1,
            color: tokens.accent,
            textTransform: 'uppercase',
          }}>
            {addLabel}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

export default function TrainingScreen() {
  const { tokens, fonts } = useTheme()
  const { t } = useTranslation()
  const bannerVisible = useGuestBannerVisible()

  const utils = trpc.useUtils()
  const { data: activePlan, isLoading: planLoading, isRefetching } = trpc.plans.active.useQuery()
  const { data: workouts, isLoading: workoutsLoading, refetch: refetchWorkouts } = trpc.workouts.list.useQuery()
  const { data: plans } = trpc.plans.list.useQuery()
  const { data: user } = trpc.auth.me.useQuery()
  const isGuest = user?.authProvider === 'guest'

  const todayUiDow = jsDowToUi(new Date().getDay())

  const refetch = () => {
    utils.plans.active.invalidate()
    utils.plans.list.invalidate()
    refetchWorkouts()
  }

  const nextWorkout = activePlan?.stats?.nextWorkout
  const inactivePlans = plans?.filter((p) => !p.isActive) ?? []

  return (
    <SafeAreaView edges={bannerVisible ? [] : ['top']} style={{ flex: 1, backgroundColor: tokens.bg }}>
      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 24, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={tokens.accent} />}
      >
        {/* Screen title */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ fontFamily: fonts.sansX, fontSize: 24, color: tokens.text, textTransform: 'uppercase' }}>
            {t('training.title')}
          </Text>
          <TouchableOpacity onPress={() => router.push('/workout/build')} accessibilityLabel={t('training.newWorkout')} accessibilityRole="button">
            <Text style={{ fontFamily: fonts.sansB, fontSize: 10, letterSpacing: 1, color: tokens.accent, textTransform: 'uppercase' }}>
              {t('training.newWorkout')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Today block */}
        {nextWorkout && (
          <TouchableOpacity
            onPress={() => router.push(`/workout/preview?templateId=${nextWorkout.workoutTemplateId}`)}
            style={{
              backgroundColor: tokens.surface1,
              borderWidth: 1,
              borderColor: tokens.accent,
              padding: 16,
              gap: 8,
            }}
            accessibilityLabel={t('training.startSession')}
            accessibilityRole="button"
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ fontFamily: fonts.sansB, fontSize: 9, color: tokens.textMute, textTransform: 'uppercase', letterSpacing: 2 }}>
                {t('training.todayLabel')} · {DOW_SHORT[todayUiDow]}
              </Text>
              <View style={{ backgroundColor: tokens.accent, paddingHorizontal: 8, paddingVertical: 2 }}>
                <Text style={{ fontFamily: fonts.sansB, fontSize: 9, letterSpacing: 2, color: '#FFFFFF', textTransform: 'uppercase' }}>
                  {t('training.todayLabel').toUpperCase()}
                </Text>
              </View>
            </View>
            <Text style={{ fontFamily: fonts.sansX, fontSize: 22, color: tokens.text, textTransform: 'uppercase' }}>
              {nextWorkout.workoutName}
            </Text>
            <Text style={{ fontFamily: fonts.sans, fontSize: 12, color: tokens.textMute }}>
              {nextWorkout.muscleGroups?.slice(0, 3).map((mg: string) => translateMuscleGroup(mg, t)).join(' · ')}
              {nextWorkout.estimatedDuration ? ` · ~${nextWorkout.estimatedDuration} ${t('common.min')}` : ''}
            </Text>
            <TouchableOpacity
              onPress={() => router.push(`/workout/preview?templateId=${nextWorkout.workoutTemplateId}`)}
              style={{
                backgroundColor: tokens.accent,
                height: 44,
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: 4,
              }}
              accessibilityLabel={t('training.startSession')}
              accessibilityRole="button"
            >
              <Text style={{ fontFamily: fonts.sansX, fontSize: 14, color: '#FFFFFF', textTransform: 'uppercase', letterSpacing: 1 }}>
                {t('training.startSession')}
              </Text>
            </TouchableOpacity>
          </TouchableOpacity>
        )}

        {/* Active plan */}
        {planLoading && <SkeletonCard height={140} />}
        {activePlan && (
          <View>
            <SectionLabel title={t('training.myActivePlan')} />
            <TouchableOpacity
              onPress={() => router.push(`/plans/create?id=${activePlan.id}`)}
              style={{
                backgroundColor: tokens.surface1,
                borderWidth: 1,
                borderColor: tokens.border,
              }}
              accessibilityLabel={activePlan.name}
              accessibilityRole="button"
            >
              <View style={{ padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ gap: 2 }}>
                  <Text style={{ fontFamily: fonts.sansX, fontSize: 18, color: tokens.text, textTransform: 'uppercase' }}>
                    {activePlan.name}
                  </Text>
                  <Text style={{ fontFamily: fonts.sans, fontSize: 12, color: tokens.textMute }}>
                    {activePlan.days.length} {t('common.exercises')} / {t('common.sets').toLowerCase()}
                  </Text>
                </View>
                <View style={{ backgroundColor: tokens.accent, paddingHorizontal: 8, paddingVertical: 2 }}>
                  <Text style={{ fontFamily: fonts.sansB, fontSize: 9, letterSpacing: 2, color: '#FFFFFF', textTransform: 'uppercase' }}>
                    {t('training.active')}
                  </Text>
                </View>
              </View>
              {/* 7-day schedule grid */}
              <View style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: tokens.border }}>
                {[1, 2, 3, 4, 5, 6, 7].map((dow) => {
                  const assigned = activePlan.days.find((d) => d.dayOfWeek === dow)
                  const isToday = dow === todayUiDow
                  const isDone = activePlan.stats?.doneTemplateIds?.includes(assigned?.workoutTemplateId ?? '')
                  return (
                    <View
                      key={dow}
                      style={{
                        flex: 1,
                        paddingVertical: 8,
                        alignItems: 'center',
                        gap: 2,
                        borderRightWidth: dow < 7 ? 1 : 0,
                        borderRightColor: tokens.border,
                        backgroundColor: assigned ? (isDone ? tokens.green + '18' : tokens.accent + '12') : 'transparent',
                        borderBottomWidth: isToday ? 2 : 0,
                        borderBottomColor: tokens.accent,
                      }}
                    >
                      <Text style={{
                        fontFamily: fonts.sansB,
                        fontSize: 9,
                        letterSpacing: 1,
                        color: isToday ? tokens.accent : tokens.textMute,
                        textTransform: 'uppercase',
                      }}>
                        {DOW_SHORT[dow]?.charAt(0)}
                      </Text>
                      {assigned ? (
                        <View style={{
                          width: 6,
                          height: 6,
                          backgroundColor: isDone ? tokens.green : tokens.accent,
                        }} />
                      ) : (
                        <Text style={{ fontFamily: fonts.mono, fontSize: 7, color: tokens.textGhost }}>—</Text>
                      )}
                    </View>
                  )
                })}
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* No plan state */}
        {!planLoading && !activePlan && (
          <View>
            <SectionLabel title={t('home.plan')} />
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
              accessibilityLabel={t('training.createPlan')}
              accessibilityRole="button"
            >
              <Text style={{ fontFamily: fonts.sansM, fontSize: 14, color: tokens.text }}>
                {t('training.noPlan')}
              </Text>
              <Text style={{ fontFamily: fonts.sans, fontSize: 12, color: tokens.textMute, textAlign: 'center' }}>
                {t('training.noPlanDesc')}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Other plans */}
        {inactivePlans.length > 0 && (
          <View>
            <SectionLabel title={t('workout.otherPlans')} />
            {inactivePlans.map((plan) => (
              <TouchableOpacity
                key={plan.id}
                onPress={() => router.push(`/plans/create?id=${plan.id}`)}
                style={{
                  backgroundColor: tokens.surface1,
                  borderWidth: 1,
                  borderColor: tokens.border,
                  padding: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginBottom: 6,
                }}
                accessibilityLabel={plan.name}
                accessibilityRole="button"
              >
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ fontFamily: fonts.sansB, fontSize: 14, color: tokens.text }}>{plan.name}</Text>
                  <Text style={{ fontFamily: fonts.sans, fontSize: 12, color: tokens.textMute }}>
                    {plan.days.length} j/sem
                  </Text>
                </View>
                <Text style={{ fontFamily: fonts.sans, fontSize: 20, color: tokens.textMute }}>›</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Workouts list */}
        <View>
          <SectionLabel
            title={t('training.mySeances')}
            count={workouts?.length}
            onAdd={() => router.push('/workout/build')}
            addLabel={t('training.newWorkout')}
          />

          {workoutsLoading && [1, 2, 3].map((i) => <SkeletonCard key={i} height={64} />)}

          {workouts && workouts.length > 0 && (
            <View style={{ borderWidth: 1, borderColor: tokens.border }}>
              {workouts.map((w, idx) => (
                <TouchableOpacity
                  key={w.id}
                  onPress={() => router.push(`/workout/${w.id}`)}
                  style={{
                    backgroundColor: tokens.surface1,
                    padding: 12,
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
                      {w.muscleGroups.length > 0 ? `${w.muscleGroups.slice(0, 3).map((mg) => translateMuscleGroup(mg, t)).join(' · ')} · ` : ''}{w.estimatedDuration} {t('common.min')}
                    </Text>
                  </View>
                  <Text style={{ fontFamily: fonts.sans, fontSize: 20, color: tokens.textMute }}>›</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

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
              accessibilityRole="button"
            >
              <Text style={{ fontFamily: fonts.sansM, fontSize: 14, color: tokens.text }}>{t('training.noWorkouts')}</Text>
              <Text style={{ fontFamily: fonts.sans, fontSize: 12, color: tokens.textMute }}>{t('training.noWorkoutsDesc')}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* AI Plan card */}
        <View>
          <SectionLabel title={t('training.aiPlan')} />
          <TouchableOpacity
            onPress={isGuest ? undefined : () => router.push('/plans/generate')}
            disabled={isGuest}
            style={{
              backgroundColor: tokens.surface1,
              padding: 16,
              borderWidth: 1,
              borderStyle: 'dashed',
              borderColor: isGuest ? tokens.border : tokens.accent,
              gap: 8,
              opacity: isGuest ? 0.4 : 1,
            }}
            accessibilityLabel={t('training.aiCardTitle')}
            accessibilityRole="button"
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Text style={{ fontFamily: fonts.jp, fontSize: 24, color: tokens.accent, opacity: 0.6 }}>鍛</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: fonts.sansB, fontSize: 14, color: tokens.text, textTransform: 'uppercase' }}>
                  {t('training.aiCardTitle')}
                </Text>
                <Text style={{ fontFamily: fonts.sans, fontSize: 12, color: tokens.textMute }}>
                  {t('training.aiCardDesc')}
                </Text>
              </View>
            </View>
            <Text style={{ fontFamily: fonts.sansB, fontSize: 12, color: tokens.accent, textAlign: 'right' }}>
              {t('training.aiCardCta')}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
