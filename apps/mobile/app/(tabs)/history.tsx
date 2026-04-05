import { SafeAreaView } from 'react-native-safe-area-context'
import React, { useState, useMemo } from 'react'
import { View, Text, ScrollView, TouchableOpacity } from 'react-native'
import { useTheme } from '@/theme/ThemeContext'
import { Card } from '@/components/Card'
import { trpc } from '@/lib/trpc'
import { colors as tokenColors } from '@/theme/tokens'

const DATE_FILTERS = [
  { label: '1w', days: 7 },
  { label: '1m', days: 30 },
  { label: '3m', days: 90 },
  { label: 'All', days: null },
]

const MUSCLE_GROUPS = [
  'All', 'Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps',
  'Quadriceps', 'Hamstrings', 'Glutes', 'Calves', 'Core', 'Full Body',
]

function formatDuration(seconds: number): string {
  const m = Math.round(seconds / 60)
  if (m < 60) return `${m}min`
  return `${Math.floor(m / 60)}h ${m % 60}min`
}

function formatDate(date: string | Date): string {
  const d = new Date(date)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return d.toLocaleDateString(undefined, { weekday: 'long' })
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: diffDays > 365 ? 'numeric' : undefined })
}

function formatTime(date: string | Date): string {
  return new Date(date).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

export default function HistoryScreen() {
  const { colors, typography, spacing, radius } = useTheme()
  const [dateFilter, setDateFilter] = useState('All')
  const [muscleFilter, setMuscleFilter] = useState('All')

  const { data: sessions } = trpc.sessions.history.useQuery({ limit: 100 })

  const filtered = useMemo(() => {
    if (!sessions) return []
    const dateCutoff = DATE_FILTERS.find((f) => f.label === dateFilter)?.days
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
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xl }}>
        {/* Header */}
        <View style={{ paddingHorizontal: spacing.base, paddingTop: spacing.base, paddingBottom: spacing.sm }}>
          <Text style={{ fontFamily: typography.family.extraBold, fontSize: typography.size['2xl'], color: colors.textPrimary }}>
            History
          </Text>
        </View>

        {/* Date filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.base, gap: spacing.sm, paddingBottom: spacing.sm }}>
          {DATE_FILTERS.map(({ label }) => {
            const selected = dateFilter === label
            return (
              <TouchableOpacity
                key={label}
                onPress={() => setDateFilter(label)}
                style={{
                  paddingVertical: spacing.xs,
                  paddingHorizontal: spacing.md,
                  borderRadius: radius.pill,
                  backgroundColor: selected ? colors.primary : colors.surface2,
                }}
                accessibilityLabel={`Filter by ${label}`}
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
          {MUSCLE_GROUPS.map((mg) => {
            const selected = muscleFilter === mg
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
                accessibilityLabel={`Filter by ${mg}`}
                accessibilityRole="button"
              >
                <Text style={{
                  fontFamily: selected ? typography.family.semiBold : typography.family.regular,
                  fontSize: typography.size.base,
                  color: selected ? colors.primary : colors.textMuted,
                }}>
                  {mg}
                </Text>
              </TouchableOpacity>
            )
          })}
        </ScrollView>

        {/* Summary row */}
        {filtered.length > 0 && (
          <View style={{ flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.base, marginBottom: spacing.base }}>
            {[
              { label: 'Sessions', value: String(filtered.length) },
              { label: 'Volume', value: totalVolume >= 1000 ? `${(totalVolume / 1000).toFixed(1)}t` : `${Math.round(totalVolume)}kg` },
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
              No sessions found.
            </Text>
          )}
          {filtered.map((s) => (
            <Card key={s.id} accessibilityLabel={`Session: ${s.workoutName ?? 'Workout'}`}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ flex: 1, gap: 4 }}>
                  {/* Name */}
                  <Text style={{ fontFamily: typography.family.bold, fontSize: typography.size.body, color: colors.textPrimary }}>
                    {s.workoutName ?? 'Workout'}
                  </Text>
                  {/* Date + time */}
                  <Text style={{ fontFamily: typography.family.regular, fontSize: typography.size.base, color: colors.textMuted }}>
                    {formatDate(s.startedAt)} · {formatTime(s.startedAt)}
                  </Text>
                  {/* Stats */}
                  <Text style={{ fontFamily: typography.family.regular, fontSize: typography.size.base, color: colors.textMuted }}>
                    {formatDuration(s.durationSeconds)}
                    {(s.totalVolume ?? 0) > 0 ? ` · ${(s.totalVolume! / 1000).toFixed(1)}t` : ''}
                  </Text>
                  {/* Muscle group tags */}
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
                            {mg}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
                {/* Status badge */}
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
                    {s.completedAt ? 'Done ✓' : 'Incomplete'}
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
