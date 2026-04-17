import { SafeAreaView } from 'react-native-safe-area-context'
import { useGuestBannerVisible } from '@/contexts/GuestBannerContext'
import React, { useState, useMemo } from 'react'
import { View, Text, ScrollView, TouchableOpacity } from 'react-native'
import { useTheme } from '@/theme/ThemeContext'
import { Card } from '@/components/Card'
import { trpc } from '@/lib/trpc'
import { colors as tokenColors } from '@/theme/tokens'
import { useTranslation } from 'react-i18next'
import { MUSCLE_GROUPS } from '@tanren/shared'

// filter id → translation key
const DATE_FILTERS = [
  { id: '1w', days: 7 },
  { id: '1m', days: 30 },
  { id: '3m', days: 90 },
  { id: 'all', days: null },
] as const

type FilterId = (typeof DATE_FILTERS)[number]['id']

// muscle group string → translation key
const MG_KEY: Record<string, string> = {
  'Chest': 'chest', 'Back': 'back', 'Shoulders': 'shoulders', 'Biceps': 'biceps',
  'Triceps': 'triceps', 'Forearms': 'forearms', 'Core': 'core', 'Quadriceps': 'quadriceps',
  'Hamstrings': 'hamstrings', 'Glutes': 'glutes', 'Calves': 'calves', 'Full Body': 'fullBody',
}

function formatDuration(seconds: number): string {
  const m = Math.round(seconds / 60)
  if (m < 60) return `${m}min`
  return `${Math.floor(m / 60)}h ${m % 60}min`
}

function useFormatDate() {
  const { t } = useTranslation()
  return (date: string | Date): string => {
    const d = new Date(date)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24))
    if (diffDays === 0) return t('history.today')
    if (diffDays === 1) return t('history.yesterday')
    if (diffDays < 7) return d.toLocaleDateString(undefined, { weekday: 'long' })
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: diffDays > 365 ? 'numeric' : undefined })
  }
}

function formatTime(date: string | Date): string {
  return new Date(date).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

export default function HistoryScreen() {
  const { colors, typography, spacing, radius } = useTheme()
  const bannerVisible = useGuestBannerVisible()
  const { t } = useTranslation()
  const formatDate = useFormatDate()
  const [dateFilter, setDateFilter] = useState<FilterId>('all')
  const [muscleFilter, setMuscleFilter] = useState('All')

  const { data: sessions } = trpc.sessions.history.useQuery({ limit: 100 })

  const filtered = useMemo(() => {
    if (!sessions) return []
    const dateCutoff = DATE_FILTERS.find((f) => f.id === dateFilter)?.days
    return sessions.filter((s) => {
      if (dateCutoff !== null && dateCutoff !== undefined) {
        const age = (Date.now() - new Date(s.startedAt).getTime()) / (1000 * 60 * 60 * 24)
        if (age > dateCutoff) return false
      }
      if (muscleFilter !== 'All') {
        if (!s.muscleGroups?.includes(muscleFilter)) return false
      }
      return true
    })
  }, [sessions, dateFilter, muscleFilter])

  const totalVolume = filtered.reduce((sum, s) => sum + (s.totalVolume ?? 0), 0)

  return (
    <SafeAreaView edges={bannerVisible ? [] : ['top']} style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xl }}>
        {/* Header */}
        <View style={{ paddingHorizontal: spacing.base, paddingTop: spacing.base, paddingBottom: spacing.sm }}>
          <Text style={{ fontFamily: typography.family.extraBold, fontSize: typography.size['2xl'], color: colors.textPrimary }}>
            {t('history.screenTitle')}
          </Text>
        </View>

        {/* Date filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.base, gap: spacing.sm, paddingBottom: spacing.sm }}>
          {DATE_FILTERS.map((f) => {
            const selected = dateFilter === f.id
            const label = t(`history.filter_${f.id}` as any)
            return (
              <TouchableOpacity
                key={f.id}
                onPress={() => setDateFilter(f.id)}
                style={{
                  paddingVertical: spacing.xs,
                  paddingHorizontal: spacing.md,
                  borderRadius: radius.pill,
                  backgroundColor: selected ? colors.primary : colors.surface2,
                }}
                accessibilityLabel={label}
                accessibilityRole="button"
              >
                <Text style={{
                  fontFamily: selected ? typography.family.semiBold : typography.family.regular,
                  fontSize: typography.size.base,
                  color: selected ? tokenColors.white : colors.textMuted,
                }}>
                  {label}
                </Text>
              </TouchableOpacity>
            )
          })}
        </ScrollView>

        {/* Muscle group filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.base, gap: spacing.sm, paddingBottom: spacing.base }}>
          {(['All', ...MUSCLE_GROUPS] as string[]).map((mg) => {
            const selected = muscleFilter === mg
            const label = mg === 'All' ? t('history.muscleAll') : t(`muscleGroups.${MG_KEY[mg] ?? mg.toLowerCase()}` as any)
            return (
              <TouchableOpacity
                key={mg}
                onPress={() => setMuscleFilter(mg)}
                style={{
                  paddingVertical: spacing.xs,
                  paddingHorizontal: spacing.md,
                  borderRadius: radius.pill,
                  backgroundColor: selected ? `${colors.primary}22` : colors.surface,
                  borderWidth: 1,
                  borderColor: selected ? colors.primary : colors.surface2,
                }}
                accessibilityLabel={label}
                accessibilityRole="button"
              >
                <Text style={{
                  fontFamily: selected ? typography.family.semiBold : typography.family.regular,
                  fontSize: typography.size.base,
                  color: selected ? colors.primary : colors.textMuted,
                }}>
                  {label}
                </Text>
              </TouchableOpacity>
            )
          })}
        </ScrollView>

        {/* Summary row */}
        {filtered.length > 0 && (
          <View style={{ flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.base, marginBottom: spacing.base }}>
            {[
              { label: t('history.sessions'), value: String(filtered.length) },
              { label: t('history.volume'), value: totalVolume >= 1000 ? `${(totalVolume / 1000).toFixed(1)}t` : `${Math.round(totalVolume)}kg` },
            ].map(({ label, value }) => (
              <View key={label} style={{ flex: 1, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, alignItems: 'center' }}>
                <Text style={{ fontFamily: typography.family.extraBold, fontSize: typography.size['2xl'], color: colors.primary }}>{value}</Text>
                <Text style={{ fontFamily: typography.family.regular, fontSize: typography.size.xs, color: colors.textMuted }}>{label}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Session list */}
        <View style={{ paddingHorizontal: spacing.base, gap: spacing.sm }}>
          {filtered.length === 0 && (
            <Text style={{ fontFamily: typography.family.regular, fontSize: typography.size.body, color: colors.textMuted, textAlign: 'center', marginTop: spacing.xl }}>
              {t('history.noSessions')}
            </Text>
          )}
          {filtered.map((s) => (
            <Card key={s.id} accessibilityLabel={`${s.workoutName ?? t('history.defaultWorkout')}`}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={{ fontFamily: typography.family.bold, fontSize: typography.size.body, color: colors.textPrimary }}>
                    {s.workoutName ?? t('history.defaultWorkout')}
                  </Text>
                  <Text style={{ fontFamily: typography.family.regular, fontSize: typography.size.base, color: colors.textMuted }}>
                    {formatDate(s.startedAt)} · {formatTime(s.startedAt)}
                  </Text>
                  <Text style={{ fontFamily: typography.family.regular, fontSize: typography.size.base, color: colors.textMuted }}>
                    {formatDuration(s.durationSeconds)}
                    {(s.totalVolume ?? 0) > 0 ? ` · ${(s.totalVolume! / 1000).toFixed(1)}t` : ''}
                  </Text>
                  {s.muscleGroups && s.muscleGroups.length > 0 && (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: 2 }}>
                      {s.muscleGroups.slice(0, 4).map((mg) => (
                        <View
                          key={mg}
                          style={{
                            backgroundColor: colors.surface2,
                            borderRadius: radius.pill,
                            paddingHorizontal: spacing.sm,
                            paddingVertical: 2,
                          }}
                        >
                          <Text style={{ fontFamily: typography.family.regular, fontSize: typography.size.xs, color: colors.textMuted }}>
                            {t(`muscleGroups.${MG_KEY[mg] ?? mg.toLowerCase()}` as any)}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
                <View style={{
                  backgroundColor: s.completedAt ? `${colors.success}18` : `${colors.warning}18`,
                  borderRadius: radius.sm,
                  paddingHorizontal: spacing.sm,
                  paddingVertical: 3,
                  marginLeft: spacing.sm,
                }}>
                  <Text style={{
                    fontFamily: typography.family.semiBold,
                    fontSize: typography.size.xs,
                    color: s.completedAt ? colors.success : colors.warning,
                  }}>
                    {s.completedAt ? t('history.done') : t('history.incomplete')}
                  </Text>
                </View>
              </View>
            </Card>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
