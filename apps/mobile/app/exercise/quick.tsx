import React, { useState, useMemo } from 'react'
import {
  View, Text, TextInput, ScrollView, TouchableOpacity, Modal,
  Alert,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { useTheme } from '@/theme/ThemeContext'
import { Screen } from '@/components/Screen'
import { useActiveSessionStore } from '@/stores/activeSessionStore'
import { useExercises, translateMuscleGroup, translateDifficulty, translateEquipment, type Exercise } from '@/hooks/useExercises'

const MUSCLE_GROUPS = [
  'All', 'Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps',
  'Quadriceps', 'Hamstrings', 'Glutes', 'Calves', 'Core', 'Full Body',
]

const DIFF_COLORS: Record<string, { bg: string; text: string }> = {
  BEGINNER: { bg: '#1A7F2C20', text: '#2BAE43' },
  INTERMEDIATE: { bg: '#D98E0020', text: '#E8A900' },
  ADVANCED: { bg: '#E8192C20', text: '#FF2D3F' },
}

type SetConfig = { reps: string; weight: string; rest: string }

function ConfigModal({
  exercise,
  onStart,
  onClose,
}: {
  exercise: Exercise
  onStart: (sets: SetConfig[]) => void
  onClose: () => void
}) {
  const { tokens, fonts } = useTheme()
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  const [numSets, setNumSets] = useState(3)
  const [sets, setSets] = useState<SetConfig[]>([
    { reps: '10', weight: '0', rest: '90' },
    { reps: '10', weight: '0', rest: '90' },
    { reps: '10', weight: '0', rest: '90' },
  ])

  const updateSets = (count: number) => {
    setNumSets(count)
    setSets((prev) => {
      if (count > prev.length) {
        const last = prev[prev.length - 1] ?? { reps: '10', weight: '0', rest: '90' }
        return [...prev, ...Array.from({ length: count - prev.length }, () => ({ ...last }))]
      }
      return prev.slice(0, count)
    })
  }

  const updateSet = (i: number, field: keyof SetConfig, val: string) => {
    setSets((prev) => prev.map((s, idx) => idx === i ? { ...s, [field]: val } : s))
  }

  return (
    <Modal visible animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: tokens.bg, paddingTop: insets.top, paddingBottom: insets.bottom }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16, gap: 12, borderBottomWidth: 1, borderBottomColor: tokens.border }}>
          <TouchableOpacity onPress={onClose} accessibilityLabel={t('quick.close')} accessibilityRole="button" style={{ paddingTop: 2 }}>
            <Text style={{ fontFamily: fonts.sansB, fontSize: 10, color: tokens.accent, textTransform: 'uppercase', letterSpacing: 2 }}>
              {t('quick.close').toUpperCase()}
            </Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: fonts.sansX, fontSize: 17, color: tokens.text, textTransform: 'uppercase' }} numberOfLines={2}>
              {exercise.name}
            </Text>
            <Text style={{ fontFamily: fonts.sans, fontSize: 12, color: tokens.textMute, marginTop: 2 }}>
              {exercise.muscleGroups.map((mg) => translateMuscleGroup(mg, t)).join(' / ')}
            </Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }} keyboardShouldPersistTaps="handled">
          <View style={{ gap: 6 }}>
            <Text style={{ fontFamily: fonts.sansB, fontSize: 9, color: tokens.textMute, textTransform: 'uppercase', letterSpacing: 2 }}>
              {t('quick.numSets').toUpperCase()}
            </Text>
            <View style={{ flexDirection: 'row', gap: 4 }}>
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <TouchableOpacity
                  key={n}
                  onPress={() => updateSets(n)}
                  style={{
                    flex: 1, paddingVertical: 10,
                    borderWidth: 1,
                    borderColor: numSets === n ? tokens.accent : tokens.border,
                    backgroundColor: numSets === n ? tokens.accent : 'transparent',
                    alignItems: 'center',
                  }}
                  accessibilityLabel={`${n} sets`}
                  accessibilityRole="button"
                >
                  <Text style={{
                    fontFamily: fonts.monoB, fontSize: 14,
                    color: numSets === n ? '#FFFFFF' : tokens.textMute,
                  }}>{n}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 6, paddingHorizontal: 4 }}>
            <Text style={{ width: 32, fontFamily: fonts.sansB, fontSize: 8, color: tokens.textMute, textAlign: 'center', textTransform: 'uppercase', letterSpacing: 1 }}>
              {t('quick.set').toUpperCase()}
            </Text>
            <Text style={{ flex: 1, fontFamily: fonts.sansB, fontSize: 8, color: tokens.textMute, textAlign: 'center', textTransform: 'uppercase', letterSpacing: 1 }}>
              {t('quick.reps').toUpperCase()}
            </Text>
            <Text style={{ flex: 1, fontFamily: fonts.sansB, fontSize: 8, color: tokens.textMute, textAlign: 'center', textTransform: 'uppercase', letterSpacing: 1 }}>
              {t('quick.kg').toUpperCase()}
            </Text>
            <Text style={{ flex: 1, fontFamily: fonts.sansB, fontSize: 8, color: tokens.textMute, textAlign: 'center', textTransform: 'uppercase', letterSpacing: 1 }}>
              {t('quick.restSec').toUpperCase()}
            </Text>
          </View>

          {sets.map((s, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={{ width: 28, height: 28, borderWidth: 1, borderColor: tokens.accent, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontFamily: fonts.sansB, fontSize: 11, color: tokens.accent }}>{i + 1}</Text>
              </View>
              {(['reps', 'weight', 'rest'] as const).map((field) => (
                <TextInput
                  key={field}
                  value={s[field]}
                  onChangeText={(v) => updateSet(i, field, v)}
                  keyboardType={field === 'weight' ? 'decimal-pad' : 'number-pad'}
                  style={{
                    flex: 1,
                    borderBottomWidth: 1,
                    borderBottomColor: tokens.border,
                    paddingVertical: 6,
                    color: tokens.text,
                    fontFamily: fonts.monoB,
                    fontSize: 14,
                    textAlign: 'center',
                  }}
                  accessibilityLabel={`${t('quick.set')} ${i + 1} ${field}`}
                />
              ))}
            </View>
          ))}
        </ScrollView>

        <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 }}>
          <TouchableOpacity
            onPress={() => onStart(sets)}
            style={{ backgroundColor: tokens.accent, height: 48, alignItems: 'center', justifyContent: 'center' }}
            accessibilityLabel={t('quick.startExercise')} accessibilityRole="button"
          >
            <Text style={{ fontFamily: fonts.sansX, fontSize: 14, color: '#FFFFFF', textTransform: 'uppercase', letterSpacing: 1 }}>
              {t('quick.startExercise').toUpperCase()}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

export default function QuickExerciseScreen() {
  const { tokens, fonts } = useTheme()
  const [search, setSearch] = useState('')
  const [muscle, setMuscle] = useState('All')
  const [selected, setSelected] = useState<Exercise | null>(null)
  const { t } = useTranslation()
  const { data: exercises, isLoading } = useExercises()
  const startSession = useActiveSessionStore((s) => s.startSession)

  const filtered = useMemo(() => {
    if (!exercises) return []
    return exercises.filter((e) => {
      const matchSearch = e.name.toLowerCase().includes(search.toLowerCase())
      const matchMuscle = muscle === 'All' || e.muscleGroups.includes(muscle)
      return matchSearch && matchMuscle
    })
  }, [exercises, search, muscle])

  const handleStart = (sets: SetConfig[]) => {
    if (!selected) return
    const sessionSets = sets.map((s) => ({
      reps: parseInt(s.reps) || 10,
      weight: parseFloat(s.weight) || 0,
      restSeconds: parseInt(s.rest) || 90,
      isCompleted: false,
    }))
    startSession(
      { id: selected.id, name: selected.name },
      [{
        exerciseId: selected.id,
        exerciseName: selected.name,
        defaultSets: sets.length,
        defaultReps: parseInt(sets[0]?.reps ?? '10') || 10,
        defaultWeight: parseFloat(sets[0]?.weight ?? '0') || 0,
        defaultRestSeconds: parseInt(sets[0]?.rest ?? '90') || 90,
        sets: sessionSets,
      }],
      true,
    )
    setSelected(null)
    router.push('/workout/active')
  }

  return (
    <Screen showKanji kanjiChar="鍛">
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 }}>
        <TouchableOpacity onPress={() => router.back()} accessibilityLabel={t('common.back')} accessibilityRole="button">
          <Text style={{ fontFamily: fonts.sansB, fontSize: 10, color: tokens.accent, textTransform: 'uppercase', letterSpacing: 2 }}>
            {t('common.back').toUpperCase()}
          </Text>
        </TouchableOpacity>
        <Text style={{ fontFamily: fonts.sansX, fontSize: 17, color: tokens.text, textTransform: 'uppercase', flex: 1 }}>
          {t('quick.title')}
        </Text>
      </View>

      {/* Search + filter */}
      <View style={{ paddingHorizontal: 16, gap: 8, paddingBottom: 8 }}>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder={t('quick.search')}
          placeholderTextColor={tokens.textGhost}
          style={{
            fontFamily: fonts.sans,
            fontSize: 14,
            color: tokens.text,
            borderBottomWidth: 1,
            borderBottomColor: tokens.border,
            paddingVertical: 8,
          }}
          accessibilityLabel={t('quick.search')}
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', gap: 4 }}>
            {MUSCLE_GROUPS.map((mg) => {
              const label = mg === 'All' ? t('muscleGroups.all') : translateMuscleGroup(mg, t)
              const active = muscle === mg
              return (
                <TouchableOpacity
                  key={mg}
                  onPress={() => setMuscle(mg)}
                  style={{
                    paddingVertical: 4, paddingHorizontal: 10,
                    borderWidth: 1,
                    borderColor: active ? tokens.accent : tokens.border,
                    backgroundColor: active ? tokens.accent : 'transparent',
                  }}
                  accessibilityLabel={label} accessibilityRole="button"
                >
                  <Text style={{
                    fontFamily: fonts.sansB,
                    fontSize: 9,
                    letterSpacing: 1.4,
                    color: active ? '#FFFFFF' : tokens.textMute,
                    textTransform: 'uppercase',
                  }}>{label}</Text>
                </TouchableOpacity>
              )
            })}
          </View>
        </ScrollView>

        {/* Exercise count */}
        <Text style={{
          fontFamily: fonts.sans, fontSize: 12, color: tokens.textMute,
          marginTop: 4,
        }}>
          {t('quick.count', { count: filtered.length })}
        </Text>
      </View>

      {/* List */}
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}>
        {isLoading && [1,2,3,4,5].map((i) => (
          <View key={i} style={{ height: 64, borderBottomWidth: 1, borderBottomColor: tokens.border }} />
        ))}
        {filtered.map((ex) => {
          const diffColor = (DIFF_COLORS[ex.difficulty] ?? DIFF_COLORS.INTERMEDIATE)!
          return (
            <TouchableOpacity
              key={ex.id}
              onPress={() => setSelected(ex)}
              style={{
                paddingVertical: 12,
                borderBottomWidth: 1,
                borderBottomColor: tokens.border,
                gap: 4,
              }}
              accessibilityLabel={ex.name} accessibilityRole="button"
            >
              {/* Top row: name + difficulty badge */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <Text style={{
                  fontFamily: fonts.sansB, fontSize: 14, color: tokens.text,
                  textTransform: 'uppercase', flex: 1,
                }} numberOfLines={2}>
                  {ex.name}
                </Text>
                <View style={{
                  backgroundColor: diffColor.bg,
                  paddingHorizontal: 8, paddingVertical: 3,
                }}>
                  <Text style={{
                    fontFamily: fonts.sansB, fontSize: 9, letterSpacing: 1,
                    color: diffColor.text, textTransform: 'uppercase',
                  }}>
                    {translateDifficulty(ex.difficulty, t)}
                  </Text>
                </View>
              </View>
              {/* Meta row: primary muscle (bold) + equipment */}
              <Text style={{ fontFamily: fonts.sans, fontSize: 12, color: tokens.textMute }}>
                <Text style={{ fontFamily: fonts.sansB }}>{translateMuscleGroup(ex.muscleGroups[0] ?? '', t)}</Text>
                {ex.equipment.length > 0 ? ` · ${ex.equipment.map((eq) => translateEquipment(eq, t)).join(', ')}` : ''}
              </Text>
            </TouchableOpacity>
          )
        })}
      </ScrollView>

      {selected && (
        <ConfigModal
          exercise={selected}
          onStart={handleStart}
          onClose={() => setSelected(null)}
        />
      )}
    </Screen>
  )
}
