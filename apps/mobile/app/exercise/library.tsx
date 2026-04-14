import React, { useState } from 'react'
import { View, Text, TextInput, ScrollView, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useTheme } from '@/theme/ThemeContext'
import { Card } from '@/components/Card'
import { PillFilter } from '@/components/PillFilter'
import { SkeletonCard } from '@/components/SkeletonCard'
import { trpc } from '@/lib/trpc'
import { MUSCLE_GROUPS } from '@fittrack/shared'

const ALL_FILTERS = ['All', ...MUSCLE_GROUPS]

export default function ExerciseLibraryScreen() {
  const { colors, typography, spacing, radius } = useTheme()
  const [search, setSearch] = useState('')
  const [muscleFilter, setMuscleFilter] = useState('All')
  const { data: exercises, isLoading } = trpc.exercises.list.useQuery()

  const filtered = exercises?.filter((e) => {
    const matchesSearch = e.name.toLowerCase().includes(search.toLowerCase())
    const matchesMuscle = muscleFilter === 'All' || e.muscleGroups.includes(muscleFilter)
    return matchesSearch && matchesMuscle
  })

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.base, paddingVertical: spacing.md, gap: spacing.md }}>
        <TouchableOpacity onPress={() => router.back()} accessibilityLabel="Go back" accessibilityRole="button">
          <Text style={{ fontFamily: typography.family.bold, fontSize: typography.size.title, color: colors.primary }}>←</Text>
        </TouchableOpacity>
        <Text style={{ fontFamily: typography.family.extraBold, fontSize: typography.size['2xl'], color: colors.textPrimary, flex: 1 }}>
          Exercise Library
        </Text>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.base, paddingBottom: spacing.xl, gap: spacing.base }}>

        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search exercises..."
          placeholderTextColor={colors.textMuted}
          style={{
            backgroundColor: colors.surface,
            borderRadius: radius.md,
            padding: spacing.md,
            color: colors.textPrimary,
            fontFamily: typography.family.regular,
          }}
          accessibilityLabel="Search exercises"
        />

        <PillFilter options={ALL_FILTERS} selected={muscleFilter} onSelect={setMuscleFilter} />

        {isLoading && [1, 2, 3, 4, 5].map((i) => <SkeletonCard key={i} height={70} />)}

        {filtered?.map((exercise) => (
          <Card key={exercise.id} accessibilityLabel={`Exercise: ${exercise.name}`}>
            <Text style={{ fontFamily: typography.family.semiBold, color: colors.textPrimary }}>
              {exercise.name}
            </Text>
            <Text style={{ fontFamily: typography.family.regular, fontSize: typography.size.base, color: colors.textMuted }}>
              {exercise.muscleGroups.join(' · ')} · {exercise.difficulty}
            </Text>
          </Card>
        ))}
      </ScrollView>
    </SafeAreaView>
  )
}
