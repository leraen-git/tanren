import React, { useMemo, useCallback } from 'react'
import { View, Text, SectionList, TouchableOpacity, RefreshControl } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useTheme } from '@/theme/ThemeContext'
import { useHistoryList, useHistoryStats } from '@/data/useHistory'
import { useTranslation } from 'react-i18next'
import { useGuestBannerVisible } from '@/contexts/GuestBannerContext'
import { useHistoryStore } from '@/stores/historyStore'
import { groupSessionsByTime } from '@/utils/historyGrouping'
import { MUSCLE_GROUPS } from '@tanren/shared'
import type { HeatmapCell, WeeklyVolume } from '@tanren/shared'
import { formatVolume } from '@/utils/format'
import { translateMuscleGroup } from '@/hooks/useExercises'
import { Ionicons } from '@expo/vector-icons'

import { ViewToggle } from '@/components/ViewToggle'
import { FiltersRow } from '@/components/FiltersRow'
import { SectionHeaderTemporal } from '@/components/SectionHeaderTemporal'
import { SessionCard } from '@/components/SessionCard'
import { HistoryHeatmap } from '@/components/HistoryHeatmap'
import { WeeklyVolumeChart } from '@/components/WeeklyVolumeChart'
import { PRRecordItem } from '@/components/PRRecordItem'
import { EmptyStateGlobal, EmptyStateFiltered } from '@/components/EmptyStateHistory'

const PERIOD_OPTIONS = [
  { value: '1w' as const, label: '' },
  { value: '1m' as const, label: '' },
  { value: '3m' as const, label: '' },
  { value: '1y' as const, label: '' },
]

export default function HistoryScreen() {
  const { tokens, fonts, label: labelPreset } = useTheme()
  const { t, i18n } = useTranslation()
  const bannerVisible = useGuestBannerVisible()
  const { viewMode, setViewMode, period, setPeriod, muscleGroup, setMuscleGroup, resetFilters } = useHistoryStore()

  const periodOptions = useMemo(() => PERIOD_OPTIONS.map((p) => ({ ...p, label: t(`history.filter_${p.value}`) })), [t])
  const muscleOptions = useMemo(() => [
    { value: '__all__', label: t('history.muscleAll') },
    ...MUSCLE_GROUPS.map((mg) => ({ value: mg, label: translateMuscleGroup(mg, t) })),
  ], [t])

  const { data: listData, isLoading: listLoading, refetch: refetchList } = useHistoryList(
    { period, muscleGroup: muscleGroup ?? undefined, limit: 50 },
    { enabled: viewMode === 'list' },
  )

  const { data: statsData, isLoading: statsLoading, refetch: refetchStats } = useHistoryStats(
    { period },
    { enabled: viewMode === 'stats' },
  )

  const locale = (i18n.language === 'fr' ? 'fr' : 'en') as 'fr' | 'en'
  const grouped = useMemo(() => {
    if (!listData?.sessions) return []
    return groupSessionsByTime(listData.sessions, locale)
  }, [listData?.sessions, locale])

  const sections = useMemo(() => grouped.map((g) => ({
    key: g.key,
    label: g.label,
    count: g.count,
    data: g.sessions,
  })), [grouped])

  const isEmpty = !listLoading && (listData?.sessions?.length ?? 0) === 0
  const isFilteredEmpty = isEmpty && (period !== '1m' || muscleGroup !== null)
  const isGlobalEmpty = isEmpty && period === '1m' && muscleGroup === null

  const onRefresh = useCallback(() => {
    if (viewMode === 'list') refetchList()
    else refetchStats()
  }, [viewMode, refetchList, refetchStats])

  // Global empty: no filters, no sessions ever
  if (isGlobalEmpty && viewMode === 'list') {
    return (
      <SafeAreaView edges={bannerVisible ? [] : ['top']} style={{ flex: 1, backgroundColor: tokens.bg }}>
        <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ fontFamily: fonts.sansX, fontSize: 24, color: tokens.text, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            {t('history.screenTitle')}
          </Text>
        </View>
        <EmptyStateGlobal onStartSession={() => router.push('/(tabs)/training')} />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView edges={bannerVisible ? [] : ['top']} style={{ flex: 1, backgroundColor: tokens.bg }}>
      {/* Header */}
      <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ fontFamily: fonts.sansX, fontSize: 24, color: tokens.text, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          {t('history.screenTitle')}
        </Text>
        <TouchableOpacity
          onPress={() => router.push('/history/search')}
          accessibilityLabel={t('history.searchTitle')}
          accessibilityRole="button"
        >
          <Ionicons name="search-outline" size={22} color={tokens.text} />
        </TouchableOpacity>
      </View>

      {/* View toggle */}
      <View style={{ paddingHorizontal: 16, marginBottom: 8 }}>
        <ViewToggle
          value={viewMode}
          onChange={setViewMode}
          labels={[t('history.viewList'), t('history.viewStats')]}
        />
      </View>

      {/* Filters */}
      <View style={{ marginBottom: 4 }}>
        <FiltersRow options={periodOptions} value={period} onChange={setPeriod} accentSelected fullWidth />
      </View>
      {viewMode === 'list' && (
        <FiltersRow
          options={muscleOptions}
          value={muscleGroup ?? '__all__'}
          onChange={(v) => setMuscleGroup(v === '__all__' ? null : v)}
        />
      )}

      {viewMode === 'list' ? (
        <>
          {/* Summary strip */}
          {listData && listData.summary.count > 0 && (
            <View style={{
              flexDirection: 'row',
              marginHorizontal: 16,
              marginVertical: 16,
            }}>
              {[
                { label: t('history.sessions'), value: String(listData.summary.count) },
                { label: t('history.volume'), value: formatVolume(listData.summary.totalVolume) },
              ].map(({ label, value }, i) => (
                <View key={label} style={{
                  flex: 1,
                  paddingVertical: 14,
                  paddingHorizontal: 12,
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: tokens.border,
                  marginLeft: i > 0 ? -1 : 0,
                }}>
                  <Text style={{ fontFamily: fonts.sansX, fontSize: 22, color: tokens.text, marginBottom: 4 }}>{value}</Text>
                  <Text style={{ ...labelPreset.md, color: tokens.textMute }}>
                    {label}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {isFilteredEmpty ? (
            <EmptyStateFiltered onReset={resetFilters} />
          ) : (
            <SectionList
              sections={sections}
              keyExtractor={(item) => item.id}
              renderSectionHeader={({ section }) => (
                <SectionHeaderTemporal label={section.label} count={section.count} />
              )}
              renderItem={({ item }) => (
                <SessionCard
                  session={item}
                  onPress={() => router.push(`/session/${item.id}`)}
                />
              )}
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20, gap: 6 }}
              stickySectionHeadersEnabled={false}
              refreshControl={<RefreshControl refreshing={false} onRefresh={onRefresh} tintColor={tokens.accent} />}
            />
          )}
        </>
      ) : (
        <StatsView
          data={statsData as StatsData | undefined}
          loading={statsLoading}
          onRefresh={onRefresh}
        />
      )}
    </SafeAreaView>
  )
}

interface StatsData {
  period: string
  totalVolume: number
  previousPeriodVolume: number
  trendPercent: number
  heatmap: { cells: HeatmapCell[]; startDate: string; endDate: string; maxVolume: number }
  weeklyVolume: WeeklyVolume[]
  recentPRs: Array<{
    sessionId: string
    exerciseId: string
    exerciseName: string
    reps: number
    weight: number
    achievedAt: string
  }>
}

function StatsView({ data, loading, onRefresh }: {
  data: StatsData | undefined
  loading: boolean
  onRefresh: () => void
}) {
  const { tokens, fonts, label: labelPreset } = useTheme()
  const { t } = useTranslation()

  if (loading || !data) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontFamily: fonts.sans, fontSize: 14, color: tokens.textMute }}>{t('common.loading')}</Text>
      </View>
    )
  }

  const trendColor = data.trendPercent > 0 ? tokens.green : data.trendPercent < 0 ? tokens.accent : tokens.textMute
  const trendKey = data.trendPercent > 0 ? 'statsTrendUp' : data.trendPercent < 0 ? 'statsTrendDown' : 'statsTrendFlat'
  const trendPct = Math.abs(data.trendPercent).toFixed(1)

  return (
    <SectionList
      sections={[{ key: 'stats', data: ['content'] }]}
      keyExtractor={() => 'stats-content'}
      renderSectionHeader={() => null}
      renderItem={() => (
        <View style={{ paddingHorizontal: 16, gap: 24, paddingTop: 16, paddingBottom: 40 }}>
          {/* Total volume */}
          <View>
            <Text style={{ ...labelPreset.md, color: tokens.textMute }}>
              {t('history.statsVolumeTotal')}
            </Text>
            <Text style={{ fontFamily: fonts.sansX, fontSize: 38, color: tokens.text, marginTop: 4 }}>
              {formatVolume(data.totalVolume)}
            </Text>
            {data.previousPeriodVolume > 0 && (
              <Text style={{ fontFamily: fonts.sansM, fontSize: 12, color: trendColor, marginTop: 2 }}>
                {t(`history.${trendKey}`, { pct: trendPct })}
              </Text>
            )}
          </View>

          {/* Heatmap */}
          <View>
            <Text style={{ ...labelPreset.md, color: tokens.textMute, marginBottom: 8 }}>
              {t('history.statsActivity')}
            </Text>
            <HistoryHeatmap cells={data.heatmap.cells} startDate={data.heatmap.startDate} />
          </View>

          {/* Weekly volume */}
          {data.weeklyVolume.length > 0 && (
            <View>
              <Text style={{ ...labelPreset.md, color: tokens.textMute, marginBottom: 8 }}>
                {t('history.statsWeeklyVolume')}
              </Text>
              <WeeklyVolumeChart weeks={data.weeklyVolume} />
            </View>
          )}

          {/* Recent PRs */}
          {data.recentPRs.length > 0 && (
            <View>
              <Text style={{ ...labelPreset.md, color: tokens.textMute, marginBottom: 4 }}>
                {t('history.statsRecentPRs')}
              </Text>
              {data.recentPRs.map((pr) => (
                <PRRecordItem
                  key={`${pr.exerciseId}-${pr.achievedAt}`}
                  exerciseName={pr.exerciseName}
                  weight={pr.weight}
                  reps={pr.reps}
                  achievedAt={pr.achievedAt}
                  onPress={() => router.push(`/session/${pr.sessionId}`)}
                />
              ))}
            </View>
          )}
        </View>
      )}
      refreshControl={<RefreshControl refreshing={false} onRefresh={onRefresh} tintColor={tokens.accent} />}
    />
  )
}
