import React, { useState } from 'react'
import { View, Text, TextInput, ScrollView, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useTheme } from '@/theme/ThemeContext'
import { Card } from '@/components/Card'
import { SkeletonCard } from '@/components/SkeletonCard'
import { trpc } from '@/lib/trpc'
import { MUSCLE_GROUPS } from '@fittrack/shared'
import { useTranslation } from 'react-i18next'

const MG_KEY: Record<string, string> = {
  'Chest': 'chest', 'Back': 'back', 'Shoulders': 'shoulders', 'Biceps': 'biceps',
  'Triceps': 'triceps', 'Forearms': 'forearms', 'Core': 'core', 'Quadriceps': 'quadriceps',
  'Hamstrings': 'hamstrings', 'Glutes': 'glutes', 'Calves': 'calves', 'Full Body': 'fullBody',
}

export default function ExerciseLibraryScreen() {
  const { colors, typography, spacing, radius } = useTheme()
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  const [muscleFilter, setMuscleFilter] = useState('All')
  const { data: exercises, isLoading } = trpc.exercises.list.useQuery()

  const filtered = exercises?.filter((e) => {
    const matchesSearch = e.name.toLowerCase().includes(search.toLowerCase())
    const matchesMuscle = muscleFilter === 'All' || e.muscleGroups.includes(muscleFilter)
    return matchesSearch && matchesMuscle
  })

  const allFilters = ['All', ...MUSCLE_GROUPS] as string[]

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.base, paddingVertical: spacing.md, gap: spacing.md }}>
        <TouchableOpacity onPress={() => router.back()} accessibilityLabel={t('common.back')} accessibilityRole="button">
          <Text style={{ fontFamily: typography.family.bold, fontSize: typography.size.title, color: colors.primary }}>←</Text>
        </TouchableOpacity>
        <Text style={{ fontFamily: typography.family.extraBold, fontSize: typography.size['2xl'], color: colors.textPrimary, flex: 1 }}>
          {t('exercise.library')}
        </Text>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.base, paddingBottom: spacing.xl, gap: spacing.base }}>

        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder={t('exercise.searchPlaceholder')}
          placeholderTextColor={colors.textMuted}
          style={{
            backgroundColor: colors.surface,
            borderRadius: radius.md,
            padding: spacing.md,
            color: colors.textPrimary,
            fontFamily: typography.family.regular,
          }}
          accessibilityLabel={t('exercise.searchPlaceholder')}
        />

        {/* Muscle group filter pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
          {allFilters.map((mg) => {
            const selected = muscleFilter === mg
            const label = mg === 'All' ? t('muscleGroups.all') : t(`muscleGroups.${MG_KEY[mg] ?? mg.toLowerCase()}` as any)
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

        {isLoading && [1, 2, 3, 4, 5].map((i) => <SkeletonCard key={i} height={70} />)}

        {filtered?.map((exercise) => (
          <Card key={exercise.id} accessibilityLabel={exercise.name}>
            <Text style={{ fontFamily: typography.family.semiBold, color: colors.textPrimary }}>
              {exercise.name}
            </Text>
            <Text style={{ fontFamily: typography.family.regular, fontSize: typography.size.base, color: colors.textMuted }}>
              {exercise.muscleGroups.map((mg) => t(`muscleGroups.${MG_KEY[mg] ?? mg.toLowerCase()}` as any)).join(' · ')} · {exercise.difficulty}
            </Text>
          </Card>
        ))}
      </ScrollView>
    </SafeAreaView>
  )
}
