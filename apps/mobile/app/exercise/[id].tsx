import React, { useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, Linking } from 'react-native'
import { Image } from 'expo-image'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, router } from 'expo-router'
import { useTheme } from '@/theme/ThemeContext'
import { Button } from '@/components/Button'
import { LineChart } from '@/components/LineChart'
import { SkeletonCard } from '@/components/SkeletonCard'
import { ProgressBar } from '@/components/ProgressBar'
import { trpc } from '@/lib/trpc'
import { getTrend, getCoachingTip } from '@tanren/shared'
import { useTranslation } from 'react-i18next'
import { useExercises, translateMuscleGroup, translateDifficulty } from '@/hooks/useExercises'

const METRIC_OPTIONS = ['Max weight', 'Volume', 'Reps']

export default function ExerciseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { tokens, fonts, label } = useTheme()
  const { t } = useTranslation()
  const [metric, setMetric] = useState('Max weight')

  const { data: allExercises, isLoading: exLoading } = useExercises()
  const exercise = allExercises?.find((e) => e.id === id)
  const { data: progressData, isLoading: progLoading } = trpc.progress.exercise.useQuery({ exerciseId: id })
  const { data: records } = trpc.progress.records.useQuery()

  const exerciseRecords = records?.filter((r) => r.exerciseId === id) ?? []
  const currentMax = exerciseRecords[0]?.weight ?? 0

  const chartData = (progressData ?? []).slice(-12).map((s, i) => ({
    label: `S${i + 1}`,
    value: currentMax,
  }))

  const last5 = chartData.slice(-5).map((d) => d.value)
  const trend = getTrend(last5)
  const tip = getCoachingTip(exercise?.name ?? '', trend, currentMax)

  const isLoading = exLoading || progLoading

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: tokens.bg }}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
        {/* Back link */}
        <TouchableOpacity onPress={() => router.back()} accessibilityLabel={t('common.back')} accessibilityRole="button">
          <Text style={{
            fontFamily: fonts.sansM,
            fontSize: 12,
            color: tokens.textMute,
            textTransform: 'uppercase',
            letterSpacing: 1,
          }}>
            {'‹ '}{t('common.back')}
          </Text>
        </TouchableOpacity>

        {isLoading && (
          <>
            <SkeletonCard height={40} />
            <SkeletonCard height={160} />
          </>
        )}

        {exercise && (
          <>
            <View>
              <Text style={{
                fontFamily: fonts.sansX,
                fontSize: 24,
                color: tokens.text,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
              }}>
                {exercise.name}
              </Text>
              <Text style={{ fontFamily: fonts.sans, fontSize: 12, color: tokens.textMute, marginTop: 4 }}>
                {exercise.muscleGroups.map((mg) => translateMuscleGroup(mg, t)).join(' · ')} · {translateDifficulty(exercise.difficulty, t)}
              </Text>
            </View>

            {exercise.description.length > 0 && (
              <View style={{ borderWidth: 1, borderColor: tokens.border, padding: 16 }}>
                <Text style={{ fontFamily: fonts.sans, color: tokens.text }}>
                  {exercise.description}
                </Text>
              </View>
            )}

            {exercise.videoUrl && exercise.imageUrl && (
              <TouchableOpacity
                onPress={() => {
                  const watchUrl = exercise.videoUrl!.replace('/embed/', '/watch?v=').split('?')[0] ?? ''
                  Linking.openURL(watchUrl)
                }}
                accessibilityLabel={t('exercise.watchVideo')}
                accessibilityRole="button"
                activeOpacity={0.8}
              >
                <View style={{ borderWidth: 1, borderColor: tokens.border }}>
                  <Text style={{ ...label.md, color: tokens.textMute,
                    padding: 16,
                    paddingBottom: 8 }}>
                    {t('exercise.demonstration')}
                  </Text>
                  <View style={{ overflow: 'hidden' }}>
                    <Image
                      source={{ uri: exercise.imageUrl }}
                      style={{ width: '100%', height: 180 }}
                      resizeMode="cover"
                    />
                    <View style={{
                      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                      justifyContent: 'center', alignItems: 'center',
                      backgroundColor: 'rgba(0,0,0,0.3)',
                    }}>
                      <View style={{
                        width: 48, height: 48,
                        backgroundColor: tokens.accent,
                        justifyContent: 'center', alignItems: 'center',
                      }}>
                        <Text style={{ color: '#FFFFFF', fontSize: 20, marginLeft: 3 }}>▶</Text>
                      </View>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            )}

            {/* Metric toggle */}
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {METRIC_OPTIONS.map((opt) => {
                const active = metric === opt
                return (
                  <TouchableOpacity
                    key={opt}
                    onPress={() => setMetric(opt)}
                    style={{
                      flex: 1,
                      paddingVertical: 8,
                      backgroundColor: active ? tokens.accent : 'transparent',
                      borderWidth: 1,
                      borderColor: active ? tokens.accent : tokens.borderStrong,
                      alignItems: 'center',
                    }}
                    accessibilityLabel={opt}
                    accessibilityRole="button"
                  >
                    <Text style={{
                      fontFamily: fonts.sansB,
                      fontSize: 10,
                      letterSpacing: 1.4,
                      textTransform: 'uppercase',
                      color: active ? '#FFFFFF' : tokens.textMute,
                    }}>
                      {opt}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>

            {/* Progression chart */}
            <View style={{ borderWidth: 1, borderColor: tokens.border, padding: 16 }}>
              <Text style={{ ...label.md, color: tokens.textMute,
                marginBottom: 8 }}>
                Progression
              </Text>
              <LineChart data={chartData} height={140} width={320} />
            </View>

            {/* Personal records */}
            {exerciseRecords.length > 0 && (
              <View>
                <Text style={{ ...label.md, color: tokens.textMute,
                  marginBottom: 12 }}>
                  {t('history.records')}
                </Text>
                {exerciseRecords.slice(0, 5).map((r) => (
                  <View
                    key={r.id}
                    style={{
                      paddingVertical: 10,
                      borderTopWidth: 1,
                      borderTopColor: tokens.border,
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ fontFamily: fonts.sansB, fontSize: 14, color: tokens.accent }}>
                      {r.weight} kg x {r.reps}
                    </Text>
                    <Text style={{ fontFamily: fonts.mono, fontSize: 11, color: tokens.textMute }}>
                      {new Date(r.achievedAt).toLocaleDateString()}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Goal progress */}
            {currentMax > 0 && (
              <View style={{ borderWidth: 1, borderColor: tokens.border, padding: 16 }}>
                <Text style={{ ...label.md, color: tokens.textMute,
                  marginBottom: 8 }}>
                  {t('exercise.goalProgress')}
                </Text>
                <ProgressBar
                  start={0}
                  current={currentMax}
                  target={Math.round(currentMax * 1.1)}
                  label="+10%"
                />
              </View>
            )}

            {/* Coaching tip */}
            <View style={{
              borderWidth: 1,
              borderColor: tokens.border,
              borderLeftWidth: 3,
              borderLeftColor: tokens.accent,
              padding: 16,
            }}>
              <Text style={{ ...label.sm, color: tokens.textMute,
                marginBottom: 4 }}>
                Coach
              </Text>
              <Text style={{ fontFamily: fonts.sans, fontSize: 12, color: tokens.text }}>
                {tip}
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
