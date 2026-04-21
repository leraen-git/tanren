import React, { useState } from 'react'
import { View, Text, TextInput, ScrollView, TouchableOpacity, Image } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useTheme } from '@/theme/ThemeContext'
import { SkeletonCard } from '@/components/SkeletonCard'
import { MUSCLE_GROUPS } from '@tanren/shared'
import { useTranslation } from 'react-i18next'
import { useExercises, translateMuscleGroup, translateDifficulty } from '@/hooks/useExercises'

export default function ExerciseLibraryScreen() {
  const { tokens, fonts } = useTheme()
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  const [muscleFilter, setMuscleFilter] = useState('All')
  const { data: exercises, isLoading } = useExercises()

  const filtered = exercises?.filter((e) => {
    const matchesSearch = e.name.toLowerCase().includes(search.toLowerCase())
    const matchesMuscle = muscleFilter === 'All' || e.muscleGroups.includes(muscleFilter)
    return matchesSearch && matchesMuscle
  })

  const allFilters = ['All', ...MUSCLE_GROUPS] as string[]

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: tokens.bg }}>
      {/* Header */}
      <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
        <TouchableOpacity onPress={() => router.back()} accessibilityLabel={t('common.back')} accessibilityRole="button" style={{ marginBottom: 8 }}>
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
        <Text style={{
          fontFamily: fonts.sansX,
          fontSize: 24,
          color: tokens.text,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        }}>
          {t('exercise.library')}
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20, gap: 12 }}>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder={t('exercise.searchPlaceholder')}
          placeholderTextColor={tokens.textGhost}
          style={{
            borderBottomWidth: 1,
            borderBottomColor: tokens.border,
            paddingVertical: 12,
            color: tokens.text,
            fontFamily: fonts.sans,
            fontSize: 14,
          }}
          accessibilityLabel={t('exercise.searchPlaceholder')}
        />

        {/* Muscle group filter chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {allFilters.map((mg) => {
            const selected = muscleFilter === mg
            const label = mg === 'All' ? t('muscleGroups.all') : translateMuscleGroup(mg, t)
            return (
              <TouchableOpacity
                key={mg}
                onPress={() => setMuscleFilter(mg)}
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

        {isLoading && [1, 2, 3, 4, 5].map((i) => <SkeletonCard key={i} height={70} />)}

        {filtered?.map((exercise) => (
          <TouchableOpacity
            key={exercise.id}
            onPress={() => router.push(`/exercise/${exercise.id}`)}
            activeOpacity={0.7}
            accessibilityLabel={exercise.name}
            accessibilityRole="button"
            style={{
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderBottomColor: tokens.border,
              flexDirection: 'row',
              gap: 12,
            }}
          >
            {exercise.imageUrl && (
              <Image
                source={{ uri: exercise.imageUrl }}
                style={{ width: 64, height: 64 }}
                resizeMode="cover"
              />
            )}
            <View style={{ flex: 1, justifyContent: 'center' }}>
              <Text style={{ fontFamily: fonts.sansM, fontSize: 14, color: tokens.text }}>
                {exercise.name}
              </Text>
              <Text style={{ fontFamily: fonts.sans, fontSize: 12, color: tokens.textMute, marginTop: 2 }}>
                {exercise.muscleGroups.map((mg) => translateMuscleGroup(mg, t)).join(' · ')} · {translateDifficulty(exercise.difficulty, t)}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  )
}
