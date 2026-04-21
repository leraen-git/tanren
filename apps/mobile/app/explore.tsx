import React from 'react'
import { View, Text, ScrollView, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, type Href } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { useTheme } from '@/theme/ThemeContext'
import { trpc } from '@/lib/trpc'
import { useNotificationSettingsStore } from '@/stores/notificationSettingsStore'

interface FeatureItem {
  icon: string
  title: string
  desc: string
  route: Href
  isNew?: boolean
  used: boolean
  locked?: boolean
}

interface FeatureGroup {
  label: string
  items: FeatureItem[]
}

function FeatureRow({ item }: { item: FeatureItem }) {
  const { tokens, fonts } = useTheme()
  const { t } = useTranslation()

  return (
    <TouchableOpacity
      onPress={item.locked ? undefined : () => router.push(item.route)}
      disabled={item.locked}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 12,
        opacity: item.locked ? 0.4 : 1,
        borderBottomWidth: 1,
        borderBottomColor: tokens.border,
        gap: 12,
      }}
      accessibilityRole="button"
      accessibilityLabel={item.title}
    >
      <View style={{
        width: 36, height: 36,
        borderWidth: 1,
        borderColor: tokens.border,
        alignItems: 'center', justifyContent: 'center',
      }}>
        <Text style={{ fontFamily: fonts.sansB, fontSize: 9, color: tokens.textMute, letterSpacing: 0.5 }}>{item.icon}</Text>
      </View>

      <View style={{ flex: 1, gap: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={{
            fontFamily: fonts.sansB,
            fontSize: 13,
            color: tokens.text,
            textTransform: 'uppercase',
          }}>
            {item.title}
          </Text>
          {item.isNew && (
            <View style={{
              backgroundColor: tokens.accent,
              paddingHorizontal: 6, paddingVertical: 1,
            }}>
              <Text style={{
                fontFamily: fonts.sansB,
                fontSize: 8,
                color: '#FFFFFF',
                letterSpacing: 1,
              }}>
                {t('explore.new')}
              </Text>
            </View>
          )}
        </View>
        <Text style={{
          fontFamily: fonts.sans,
          fontSize: 12,
          color: tokens.textMute,
          lineHeight: 16,
        }}>
          {item.desc}
        </Text>
      </View>

      {!item.used ? (
        <View style={{
          borderWidth: 1,
          borderColor: tokens.accent,
          paddingHorizontal: 8,
          paddingVertical: 2,
        }}>
          <Text style={{
            fontFamily: fonts.sansB,
            fontSize: 8,
            color: tokens.accent,
            textTransform: 'uppercase',
            letterSpacing: 1,
          }}>
            {t('explore.tryIt')}
          </Text>
        </View>
      ) : (
        <Text style={{ color: tokens.textMute, fontFamily: fonts.sansB, fontSize: 14 }}>-{'>'}</Text>
      )}
    </TouchableOpacity>
  )
}

function GroupBlock({ group }: { group: FeatureGroup }) {
  const { tokens, fonts } = useTheme()
  return (
    <View>
      <Text style={{
        fontFamily: fonts.sansB,
        fontSize: 9,
        color: tokens.textMute,
        letterSpacing: 2,
        textTransform: 'uppercase',
        paddingHorizontal: 16,
        paddingTop: 24,
        paddingBottom: 8,
      }}>
        {group.label}
      </Text>
      <View style={{ backgroundColor: tokens.surface1, borderWidth: 1, borderColor: tokens.border, marginHorizontal: 16, overflow: 'hidden' }}>
        {group.items.map((item) => (
          <FeatureRow key={item.title} item={item} />
        ))}
      </View>
    </View>
  )
}

export default function ExploreScreen() {
  const { tokens, fonts } = useTheme()
  const { t } = useTranslation()

  const { data: user }       = trpc.users.me.useQuery()
  const isGuest = user?.authProvider === 'guest'
  const { data: sessions }   = trpc.sessions.history.useQuery({ limit: 5 })
  const { data: records }    = trpc.progress.records.useQuery()
  const { data: dietMeals }  = trpc.diet.todayMeals.useQuery()
  const { data: activePlan } = trpc.plans.active.useQuery()
  const notifSettings        = useNotificationSettingsStore()

  const hasSessions   = (sessions?.length ?? 0) > 0
  const hasRecords    = (records?.length ?? 0) > 0
  const hasDiet       = !!dietMeals
  const hasWorkoutPlan = !!activePlan
  const hasReminders  = notifSettings.workoutEnabled
    || Object.values(notifSettings.meals).some((m) => m.enabled)
    || notifSettings.hydrationEnabled

  const groups: FeatureGroup[] = [
    {
      label: t('explore.groupWorkouts'),
      items: [
        { icon: 'WK', title: t('explore.workoutBuilder'), desc: t('explore.workoutBuilderDesc'), route: '/(tabs)/workouts', used: hasSessions },
        { icon: '>', title: t('explore.activeSession'), desc: t('explore.activeSessionDesc'), route: '/(tabs)/workouts', used: hasSessions },
        { icon: 'T', title: t('explore.restTimer'), desc: t('explore.restTimerDesc'), route: '/(tabs)/workouts', used: hasSessions },
        { icon: 'PR', title: t('explore.personalRecords'), desc: t('explore.personalRecordsDesc'), route: '/(tabs)/history', used: hasRecords },
      ],
    },
    {
      label: t('explore.groupProgress'),
      items: [
        { icon: '/\\', title: t('explore.progressCharts'), desc: t('explore.progressChartsDesc'), route: '/(tabs)/history', used: hasSessions },
        { icon: 'ST', title: t('explore.streakStats'), desc: t('explore.streakStatsDesc'), route: '/(tabs)/history', used: hasSessions },
        { icon: 'RC', title: t('explore.sessionRecap'), desc: t('explore.sessionRecapDesc'), route: '/(tabs)/workouts', used: hasSessions },
      ],
    },
    {
      label: t('explore.groupPlans'),
      items: [
        { icon: 'AI', title: isGuest ? t('guest.aiLocked') : t('explore.aiWorkoutPlan'), desc: isGuest ? t('guest.aiLockedDesc') : t('explore.aiWorkoutPlanDesc'), route: '/plans/generate', isNew: !isGuest, used: hasWorkoutPlan, locked: isGuest },
        { icon: 'PG', title: t('explore.guidedPrograms'), desc: t('explore.guidedProgramsDesc'), route: '/(tabs)/workouts', used: false },
      ],
    },
    {
      label: t('explore.groupDiet'),
      items: [
        { icon: 'AI', title: isGuest ? t('guest.aiLocked') : t('explore.aiDietPlan'), desc: isGuest ? t('guest.aiLockedDesc') : t('explore.aiDietPlanDesc'), route: '/(tabs)/diet', isNew: !isGuest, used: hasDiet, locked: isGuest },
        { icon: 'MR', title: t('explore.mealRecipes'), desc: t('explore.mealRecipesDesc'), route: '/(tabs)/diet', used: hasDiet },
      ],
    },
    {
      label: t('explore.groupReminders'),
      items: [
        { icon: '--', title: t('explore.reminders'), desc: t('explore.remindersDesc'), route: '/settings/reminders', isNew: true, used: hasReminders },
      ],
    },
  ]

  const totalFeatures = groups.reduce((n, g) => n + g.items.length, 0)
  const usedFeatures  = groups.reduce((n, g) => n + g.items.filter((i) => i.used).length, 0)

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: tokens.bg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 }}>
        <TouchableOpacity
          onPress={() => router.back()}
          accessibilityLabel={t('common.back')}
          accessibilityRole="button"
        >
          <Text style={{ fontFamily: fonts.sansB, fontSize: 10, color: tokens.accent, textTransform: 'uppercase', letterSpacing: 2 }}>
            {'< BACK'}
          </Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: fonts.sansX, fontSize: 20, color: tokens.text, textTransform: 'uppercase' }}>
            {t('explore.title')}
          </Text>
          <Text style={{ fontFamily: fonts.sans, fontSize: 12, color: tokens.textMute }}>
            {t('explore.subtitle', { used: usedFeatures, total: totalFeatures })}
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {groups.map((group) => (
          <GroupBlock key={group.label} group={group} />
        ))}
      </ScrollView>
    </SafeAreaView>
  )
}
