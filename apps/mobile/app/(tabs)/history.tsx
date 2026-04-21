import { SafeAreaView } from 'react-native-safe-area-context'
import { useGuestBannerVisible } from '@/contexts/GuestBannerContext'
import React, { useState, useMemo } from 'react'
import { View, Text, ScrollView, TouchableOpacity } from 'react-native'
import { useTheme } from '@/theme/ThemeContext'
import { trpc } from '@/lib/trpc'
import { useTranslation } from 'react-i18next'
import { MUSCLE_GROUPS } from '@tanren/shared'
import { formatVolume, formatDuration } from '@/utils/format'
import { translateMuscleGroup } from '@/hooks/useExercises'

const DATE_FILTERS = [
  { id: '1w', days: 7 },
  { id: '1m', days: 30 },
  { id: '3m', days: 90 },
  { id: 'all', days: null },
] as const

type FilterId = (typeof DATE_FILTERS)[number]['id']

function useFormatDate() {
  const { t } = useTranslation()
  return (date: string | Date): string => {
    const d = new Date(date)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24))
    if (diffDays === 0) return t('history.today')
    if (diffDays === 1) return t('history.yesterday')
    if (diffDays < 7) return d.toLocaleDateString('fr-FR', { weekday: 'long' })
    return d.toLocaleDateString('fr-FR', { month: 'short', day: 'numeric', year: diffDays > 365 ? 'numeric' : undefined })
  }
}

function formatTime(date: string | Date): string {
  return new Date(date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

export default function HistoryScreen() {
  const { tokens, fonts } = useTheme()
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
    <SafeAreaView edges={bannerVisible ? [] : ['top']} style={{ flex: 1, backgroundColor: tokens.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
        {/* Header */}
        <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 }}>
          <Text style={{
            fontFamily: fonts.sansX,
            fontSize: 24,
            color: tokens.text,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
          }}>
            {t('history.screenTitle')}
          </Text>
        </View>

        {/* Date filter chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingBottom: 8 }}>
          {DATE_FILTERS.map((f) => {
            const selected = dateFilter === f.id
            const label = t(`history.filter_${f.id}`)
            return (
              <TouchableOpacity
                key={f.id}
                onPress={() => setDateFilter(f.id)}
                style={{
                  paddingVertical: 4,
                  paddingHorizontal: 12,
                  backgroundColor: selected ? tokens.accent : 'transparent',
                  borderWidth: 1,
                  borderColor: selected ? tokens.accent : tokens.borderStrong,
                }}
                accessibilityLabel={label}
                accessibilityRole="button"
              >
                <Text style={{
                  fontFamily: fonts.sansB,
                  fontSize: 10,
                  letterSpacing: 1.4,
                  textTransform: 'uppercase',
                  color: selected ? '#FFFFFF' : tokens.textMute,
                }}>
                  {label}
                </Text>
              </TouchableOpacity>
            )
          })}
        </ScrollView>

        {/* Muscle group filter chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingBottom: 16 }}>
          {(['All', ...MUSCLE_GROUPS] as string[]).map((mg) => {
            const selected = muscleFilter === mg
            const label = mg === 'All' ? t('history.muscleAll') : translateMuscleGroup(mg, t)
            return (
              <TouchableOpacity
                key={mg}
                onPress={() => setMuscleFilter(mg)}
                style={{
                  paddingVertical: 4,
                  paddingHorizontal: 12,
                  backgroundColor: selected ? `${tokens.accent}22` : 'transparent',
                  borderWidth: 1,
                  borderColor: selected ? tokens.accent : tokens.border,
                }}
                accessibilityLabel={label}
                accessibilityRole="button"
              >
                <Text style={{
                  fontFamily: fonts.sansB,
                  fontSize: 10,
                  letterSpacing: 1.4,
                  textTransform: 'uppercase',
                  color: selected ? tokens.accent : tokens.textMute,
                }}>
                  {label}
                </Text>
              </TouchableOpacity>
            )
          })}
        </ScrollView>

        {/* Summary strip */}
        {filtered.length > 0 && (
          <View style={{
            flexDirection: 'row',
            marginHorizontal: 16,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: tokens.border,
          }}>
            {[
              { label: t('history.sessions'), value: String(filtered.length) },
              { label: t('history.volume'), value: formatVolume(totalVolume) },
            ].map(({ label, value }, i) => (
              <View key={label} style={{
                flex: 1,
                padding: 12,
                alignItems: 'center',
                borderLeftWidth: i > 0 ? 1 : 0,
                borderLeftColor: tokens.border,
              }}>
                <Text style={{ fontFamily: fonts.sansX, fontSize: 24, color: tokens.accent }}>{value}</Text>
                <Text style={{
                  fontFamily: fonts.sansB,
                  fontSize: 9,
                  letterSpacing: 2,
                  color: tokens.textMute,
                  textTransform: 'uppercase',
                  marginTop: 2,
                }}>
                  {label}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Session list */}
        <View style={{ paddingHorizontal: 16 }}>
          {filtered.length === 0 && (
            <Text style={{
              fontFamily: fonts.sans,
              fontSize: 14,
              color: tokens.textMute,
              textAlign: 'center',
              marginTop: 20,
            }}>
              {t('history.noSessions')}
            </Text>
          )}
          {filtered.map((s, idx) => (
            <View
              key={s.id}
              style={{
                paddingVertical: 14,
                borderTopWidth: idx === 0 ? 1 : 0,
                borderBottomWidth: 1,
                borderColor: tokens.border,
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
              }}
              accessibilityLabel={`${s.workoutName ?? t('history.defaultWorkout')}`}
            >
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={{ fontFamily: fonts.sansB, fontSize: 14, color: tokens.text }}>
                  {s.workoutName ?? t('history.defaultWorkout')}
                </Text>
                <Text style={{ fontFamily: fonts.sans, fontSize: 12, color: tokens.textMute }}>
                  {formatDate(s.startedAt)} · {formatTime(s.startedAt)}
                </Text>
                <Text style={{ fontFamily: fonts.mono, fontSize: 11, color: tokens.textDim }}>
                  {formatDuration(s.durationSeconds)}
                  {(s.totalVolume ?? 0) > 0 ? ` · ${formatVolume(s.totalVolume!)} kg` : ''}
                </Text>
                {s.muscleGroups && s.muscleGroups.length > 0 && (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 2 }}>
                    {s.muscleGroups.slice(0, 4).map((mg) => (
                      <View
                        key={mg}
                        style={{
                          borderWidth: 1,
                          borderColor: tokens.border,
                          paddingHorizontal: 6,
                          paddingVertical: 1,
                        }}
                      >
                        <Text style={{
                          fontFamily: fonts.sansB,
                          fontSize: 8,
                          letterSpacing: 1,
                          color: tokens.textGhost,
                          textTransform: 'uppercase',
                        }}>
                          {translateMuscleGroup(mg, t)}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
              <View style={{
                borderWidth: 1,
                borderColor: s.completedAt ? tokens.green : tokens.amber,
                paddingHorizontal: 8,
                paddingVertical: 2,
                marginLeft: 8,
              }}>
                <Text style={{
                  fontFamily: fonts.sansB,
                  fontSize: 8,
                  letterSpacing: 1,
                  textTransform: 'uppercase',
                  color: s.completedAt ? tokens.green : tokens.amber,
                }}>
                  {s.completedAt ? t('history.done') : t('history.incomplete')}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
