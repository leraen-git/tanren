import React, { useState } from 'react'
import { View, Text, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, router } from 'expo-router'
import { useTheme } from '@/theme/ThemeContext'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { PillFilter } from '@/components/PillFilter'
import { LineChart } from '@/components/LineChart'
import { SkeletonCard } from '@/components/SkeletonCard'
import { ProgressBar } from '@/components/ProgressBar'
import { trpc } from '@/lib/trpc'
import { getTrend, getCoachingTip } from '@tanren/shared'

const METRIC_OPTIONS = ['Max weight', 'Volume', 'Reps']

export default function ExerciseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { colors, typography, spacing } = useTheme()
  const [metric, setMetric] = useState('Max weight')

  const { data: exercise, isLoading: exLoading } = trpc.exercises.byId.useQuery({ id })
  const { data: progressData, isLoading: progLoading } = trpc.progress.exercise.useQuery({ exerciseId: id })
  const { data: records } = trpc.progress.records.useQuery()

  const exerciseRecords = records?.filter((r) => r.exerciseId === id) ?? []
  const currentMax = exerciseRecords[0]?.weight ?? 0

  // Build chart data from progress sessions
  const chartData = (progressData ?? []).slice(-12).map((s, i) => ({
    label: `S${i + 1}`,
    value: currentMax, // simplified — real impl would join session sets
  }))

  const last5 = chartData.slice(-5).map((d) => d.value)
  const trend = getTrend(last5)
  const tip = getCoachingTip(exercise?.name ?? '', trend, currentMax)

  const isLoading = exLoading || progLoading

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ padding: spacing.base, gap: spacing.base }}>
        <Button label="← Back" variant="ghost" onPress={() => router.back()} style={{ alignSelf: 'flex-start' }} />

        {isLoading && (
          <>
            <SkeletonCard height={40} />
            <SkeletonCard height={160} />
          </>
        )}

        {exercise && (
          <>
            <View>
              <Text style={{ fontFamily: typography.family.extraBold, fontSize: typography.size['2xl'], color: colors.textPrimary }}>
                {exercise.name}
              </Text>
              <Text style={{ fontFamily: typography.family.regular, fontSize: typography.size.base, color: colors.textMuted, marginTop: spacing.xs }}>
                {exercise.muscleGroups.join(' · ')} · {exercise.difficulty}
              </Text>
            </View>

            {exercise.description.length > 0 && (
              <Card accessibilityLabel="Exercise description">
                <Text style={{ fontFamily: typography.family.regular, color: colors.textPrimary }}>
                  {exercise.description}
                </Text>
              </Card>
            )}

            {/* Metric toggle */}
            <PillFilter options={METRIC_OPTIONS} selected={metric} onSelect={setMetric} />

            {/* Progression chart */}
            <Card accessibilityLabel="Progression chart">
              <Text style={{ fontFamily: typography.family.bold, color: colors.textPrimary, marginBottom: spacing.sm }}>
                Progression
              </Text>
              <LineChart data={chartData} height={140} width={320} />
            </Card>

            {/* Personal records */}
            {exerciseRecords.length > 0 && (
              <>
                <Text style={{ fontFamily: typography.family.bold, fontSize: typography.size.xl, color: colors.textPrimary }}>
                  Personal records
                </Text>
                {exerciseRecords.slice(0, 5).map((r) => (
                  <Card key={r.id} accessibilityLabel={`Record: ${r.weight}kg × ${r.reps} reps`}>
                    <Text style={{ fontFamily: typography.family.semiBold, color: colors.textPrimary }}>
                      ★ {r.weight}kg × {r.reps} reps
                    </Text>
                    <Text style={{ fontFamily: typography.family.regular, fontSize: typography.size.base, color: colors.textMuted }}>
                      {new Date(r.achievedAt).toLocaleDateString()}
                    </Text>
                  </Card>
                ))}
              </>
            )}

            {/* Goal progress */}
            {currentMax > 0 && (
              <Card accessibilityLabel="Goal progress">
                <Text style={{ fontFamily: typography.family.bold, color: colors.textPrimary, marginBottom: spacing.sm }}>
                  Goal progress
                </Text>
                <ProgressBar
                  start={0}
                  current={currentMax}
                  target={Math.round(currentMax * 1.1)}
                  label="+10% target"
                />
              </Card>
            )}

            {/* Coaching tip */}
            <Card
              style={{ borderLeftWidth: 3, borderLeftColor: colors.primary }}
              accessibilityLabel="Coaching tip"
            >
              <Text style={{ fontFamily: typography.family.semiBold, fontSize: typography.size.base, color: colors.textMuted, marginBottom: spacing.xs }}>
                Coach says
              </Text>
              <Text style={{ fontFamily: typography.family.regular, color: colors.textPrimary }}>
                {tip}
              </Text>
            </Card>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
