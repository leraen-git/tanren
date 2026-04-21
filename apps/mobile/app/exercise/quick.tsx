import React, { useState, useMemo } from 'react'
import {
  View, Text, TextInput, ScrollView, TouchableOpacity, Modal,
  Alert, ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { useTheme } from '@/theme/ThemeContext'
import { useActiveSessionStore } from '@/stores/activeSessionStore'
import { useExercises, translateMuscleGroup, translateDifficulty, type Exercise } from '@/hooks/useExercises'

const MUSCLE_GROUPS = [
  'All', 'Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps',
  'Quadriceps', 'Hamstrings', 'Glutes', 'Calves', 'Core', 'Full Body',
]

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
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: tokens.bg }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16, gap: 12, borderBottomWidth: 1, borderBottomColor: tokens.border }}>
          <TouchableOpacity onPress={onClose} accessibilityLabel="Close" accessibilityRole="button" style={{ paddingTop: 2 }}>
            <Text style={{ fontFamily: fonts.sansB, fontSize: 10, color: tokens.accent, textTransform: 'uppercase', letterSpacing: 2 }}>CLOSE</Text>
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
          {/* Number of sets */}
          <View style={{ gap: 6 }}>
            <Text style={{ fontFamily: fonts.sansB, fontSize: 9, color: tokens.textMute, textTransform: 'uppercase', letterSpacing: 2 }}>
              NUMBER OF SETS
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

          {/* Column headers */}
          <View style={{ flexDirection: 'row', gap: 6, paddingHorizontal: 4 }}>
            <Text style={{ width: 32, fontFamily: fonts.sansB, fontSize: 8, color: tokens.textMute, textAlign: 'center', textTransform: 'uppercase', letterSpacing: 1 }}>SET</Text>
            <Text style={{ flex: 1, fontFamily: fonts.sansB, fontSize: 8, color: tokens.textMute, textAlign: 'center', textTransform: 'uppercase', letterSpacing: 1 }}>REPS</Text>
            <Text style={{ flex: 1, fontFamily: fonts.sansB, fontSize: 8, color: tokens.textMute, textAlign: 'center', textTransform: 'uppercase', letterSpacing: 1 }}>KG</Text>
            <Text style={{ flex: 1, fontFamily: fonts.sansB, fontSize: 8, color: tokens.textMute, textAlign: 'center', textTransform: 'uppercase', letterSpacing: 1 }}>REST (s)</Text>
          </View>

          {/* Sets */}
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
                  accessibilityLabel={`Set ${i + 1} ${field}`}
                />
              ))}
            </View>
          ))}
        </ScrollView>

        <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 }}>
          <TouchableOpacity
            onPress={() => onStart(sets)}
            style={{ backgroundColor: tokens.accent, height: 48, alignItems: 'center', justifyContent: 'center' }}
            accessibilityLabel="Start exercise" accessibilityRole="button"
          >
            <Text style={{ fontFamily: fonts.sansX, fontSize: 14, color: '#FFFFFF', textTransform: 'uppercase', letterSpacing: 1 }}>
              START EXERCISE
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
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
    <SafeAreaView style={{ flex: 1, backgroundColor: tokens.bg }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 }}>
        <TouchableOpacity onPress={() => router.back()} accessibilityLabel="Go back" accessibilityRole="button">
          <Text style={{ fontFamily: fonts.sansB, fontSize: 10, color: tokens.accent, textTransform: 'uppercase', letterSpacing: 2 }}>
            {'< BACK'}
          </Text>
        </TouchableOpacity>
        <Text style={{ fontFamily: fonts.sansX, fontSize: 17, color: tokens.text, textTransform: 'uppercase', flex: 1 }}>
          Pick an exercise
        </Text>
      </View>

      {/* Search + filter */}
      <View style={{ paddingHorizontal: 16, gap: 8, paddingBottom: 8 }}>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search exercises..."
          placeholderTextColor={tokens.textGhost}
          style={{
            fontFamily: fonts.sans,
            fontSize: 14,
            color: tokens.text,
            borderBottomWidth: 1,
            borderBottomColor: tokens.border,
            paddingVertical: 8,
          }}
          accessibilityLabel="Search exercises"
          autoFocus
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', gap: 4 }}>
            {MUSCLE_GROUPS.map((mg) => {
              const label = translateMuscleGroup(mg, t)
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
      </View>

      {/* List */}
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}>
        {isLoading && [1,2,3,4,5].map((i) => (
          <View key={i} style={{ height: 56, borderBottomWidth: 1, borderBottomColor: tokens.border }} />
        ))}
        {filtered.map((ex) => (
          <TouchableOpacity
            key={ex.id}
            onPress={() => setSelected(ex)}
            style={{
              paddingVertical: 10,
              borderBottomWidth: 1,
              borderBottomColor: tokens.border,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
            accessibilityLabel={`Select ${ex.name}`} accessibilityRole="button"
          >
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: fonts.sansB, fontSize: 13, color: tokens.text, textTransform: 'uppercase' }}>
                {ex.name}
              </Text>
              <Text style={{ fontFamily: fonts.sans, fontSize: 11, color: tokens.textMute }}>
                {ex.muscleGroups.map((mg) => translateMuscleGroup(mg, t)).join(' / ')} / {translateDifficulty(ex.difficulty, t)}
              </Text>
            </View>
            <Text style={{ fontFamily: fonts.sansB, fontSize: 14, color: tokens.accent }}>-{'>'}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {selected && (
        <ConfigModal
          exercise={selected}
          onStart={handleStart}
          onClose={() => setSelected(null)}
        />
      )}
    </SafeAreaView>
  )
}
