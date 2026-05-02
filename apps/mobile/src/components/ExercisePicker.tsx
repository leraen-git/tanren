import React, { useState, useMemo, useEffect } from 'react'
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Modal,
  Image,
  Pressable,
  Dimensions,
} from 'react-native'
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context'
import { useTheme } from '@/theme/ThemeContext'
import { useTranslation } from 'react-i18next'
import { useExercises, translateMuscleGroup, translateDifficulty } from '@/hooks/useExercises'

const MUSCLE_GROUPS = ['Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Quadriceps', 'Hamstrings', 'Glutes', 'Calves', 'Core', 'Full Body', 'Cardio']

export type PickedExercise = { id: string; name: string; muscleGroups: string[] }

type Props = {
  visible: boolean
  mode: 'single' | 'multi'
  excludeIds?: string[]
  preselectedMuscles?: string[]
  onClose: () => void
  onConfirm: (exercises: PickedExercise[]) => void
}

export function ExercisePicker({ visible, mode, excludeIds = [], preselectedMuscles = [], onClose, onConfirm }: Props) {
  const { tokens, fonts, label } = useTheme()
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  const [activeFilters, setActiveFilters] = useState<string[]>([])
  const [selected, setSelected] = useState<PickedExercise[]>([])
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const { data: allExercises } = useExercises()

  useEffect(() => {
    if (visible) {
      setSelected([])
      setSearch('')
      setActiveFilters(preselectedMuscles.length > 0 ? [...preselectedMuscles] : [])
    }
  }, [visible])

  const orderedMuscles = useMemo(() => {
    const rest = MUSCLE_GROUPS.filter((m) => !preselectedMuscles.includes(m))
    return [...preselectedMuscles, ...rest]
  }, [preselectedMuscles])

  const filtered = useMemo(() => {
    if (!allExercises) return []
    return allExercises.filter((ex) => {
      if (excludeIds.includes(ex.id)) return false
      const matchSearch = ex.name.toLowerCase().includes(search.toLowerCase())
      const matchMuscle = activeFilters.length === 0 || ex.muscleGroups.some((mg) => activeFilters.includes(mg))
      return matchSearch && matchMuscle
    })
  }, [allExercises, search, activeFilters, excludeIds])

  const toggleFilter = (mg: string) => {
    setActiveFilters((prev) =>
      prev.includes(mg) ? prev.filter((f) => f !== mg) : [...prev, mg],
    )
  }

  const toggleSelect = (ex: PickedExercise) => {
    if (mode === 'single') {
      onConfirm([ex])
      return
    }
    setSelected((prev) => {
      const exists = prev.some((e) => e.id === ex.id)
      return exists ? prev.filter((e) => e.id !== ex.id) : [...prev, ex]
    })
  }

  const isSelected = (id: string) => selected.some((e) => e.id === id)

  const handleConfirm = () => {
    onConfirm(selected)
    setSelected([])
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <SafeAreaProvider>
      <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: tokens.bg }}>
        {/* Header */}
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          padding: 16,
          gap: 12,
          borderBottomWidth: 1,
          borderBottomColor: tokens.border,
        }}>
          <TouchableOpacity onPress={onClose} accessibilityLabel={t('exercisePicker.close')} accessibilityRole="button">
            <Text style={{ ...label.md, color: tokens.accent }}>
              {t('exercisePicker.close')}
            </Text>
          </TouchableOpacity>
          <Text numberOfLines={1} style={{ fontFamily: fonts.sansX, fontSize: 17, color: tokens.text, textTransform: 'uppercase', flex: 1 }}>
            {t('exercisePicker.title')}
          </Text>
          {mode === 'multi' && selected.length > 0 && (
            <TouchableOpacity
              onPress={handleConfirm}
              style={{ backgroundColor: tokens.accent, paddingHorizontal: 12, paddingVertical: 6 }}
              accessibilityLabel={t('exercisePicker.addCount', { count: selected.length })}
              accessibilityRole="button"
            >
              <Text style={{ fontFamily: fonts.sansB, fontSize: 10, color: '#FFFFFF', letterSpacing: 1 }}>
                {t('exercisePicker.addCount', { count: selected.length })}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Search + filter */}
        <View style={{ padding: 16, paddingBottom: 8, gap: 8 }}>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={t('exercisePicker.searchPlaceholder')}
            placeholderTextColor={tokens.textGhost}
            style={{
              fontFamily: fonts.sans,
              fontSize: 14,
              color: tokens.text,
              borderBottomWidth: 1,
              borderBottomColor: tokens.border,
              paddingVertical: 8,
            }}
            accessibilityLabel={t('exercisePicker.searchPlaceholder')}
            autoFocus
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', gap: 4 }}>
              <TouchableOpacity
                onPress={() => setActiveFilters([])}
                style={{
                  paddingVertical: 4,
                  paddingHorizontal: 10,
                  borderWidth: 1,
                  borderColor: activeFilters.length === 0 ? tokens.accent : tokens.border,
                  backgroundColor: activeFilters.length === 0 ? tokens.accent : 'transparent',
                }}
                accessibilityLabel={t('exercisePicker.all')}
                accessibilityRole="button"
              >
                <Text style={{
                  fontFamily: fonts.sansB,
                  fontSize: 9,
                  letterSpacing: 1.4,
                  color: activeFilters.length === 0 ? '#FFFFFF' : tokens.textMute,
                  textTransform: 'uppercase',
                }}>
                  {t('exercisePicker.all')}
                </Text>
              </TouchableOpacity>
              {orderedMuscles.map((mg) => {
                const isActive = activeFilters.includes(mg)
                const label = translateMuscleGroup(mg, t)
                return (
                  <TouchableOpacity
                    key={mg}
                    onPress={() => toggleFilter(mg)}
                    style={{
                      paddingVertical: 4,
                      paddingHorizontal: 10,
                      borderWidth: 1,
                      borderColor: isActive ? tokens.accent : tokens.border,
                      backgroundColor: isActive ? tokens.accent : 'transparent',
                    }}
                    accessibilityLabel={label}
                    accessibilityRole="button"
                  >
                    <Text style={{
                      fontFamily: fonts.sansB,
                      fontSize: 9,
                      letterSpacing: 1.4,
                      color: isActive ? '#FFFFFF' : tokens.textMute,
                      textTransform: 'uppercase',
                    }}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          </ScrollView>
        </View>

        {/* Exercise list */}
        <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}>
          {filtered.map((ex) => {
            const ticked = isSelected(ex.id)
            return (
              <TouchableOpacity
                key={ex.id}
                onPress={() => toggleSelect({ id: ex.id, name: ex.name, muscleGroups: ex.muscleGroups })}
                onLongPress={() => ex.imageUrl ? setPreviewImage(ex.imageUrl) : undefined}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 10,
                  borderBottomWidth: 1,
                  borderBottomColor: tokens.border,
                  borderLeftWidth: ticked ? 3 : 0,
                  borderLeftColor: tokens.accent,
                  paddingLeft: ticked ? 10 : 0,
                }}
                accessibilityLabel={`${ticked ? 'Deselect' : 'Select'} ${ex.name}`}
                accessibilityRole="button"
              >
                {ex.imageUrl && (
                  <Image
                    source={{ uri: ex.imageUrl }}
                    style={{ width: 48, height: 48, marginRight: 12 }}
                    resizeMode="cover"
                  />
                )}
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: fonts.sansB, fontSize: 13, color: tokens.text, textTransform: 'uppercase' }}>
                    {ex.name}
                  </Text>
                  <Text style={{ fontFamily: fonts.sans, fontSize: 11, color: tokens.textMute }}>
                    {ex.muscleGroups.map((mg) => translateMuscleGroup(mg, t)).join(' / ')} / {translateDifficulty(ex.difficulty, t)}
                  </Text>
                </View>
                <View style={{
                  width: 24,
                  height: 24,
                  borderWidth: 1,
                  borderColor: ticked ? tokens.accent : tokens.border,
                  backgroundColor: ticked ? tokens.accent : 'transparent',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  {ticked && (
                    <Text style={{ fontFamily: fonts.sansB, fontSize: 14, color: '#FFFFFF' }}>✓</Text>
                  )}
                </View>
              </TouchableOpacity>
            )
          })}
        </ScrollView>

        {/* Image preview modal */}
        {previewImage && (
          <Modal visible transparent animationType="fade" onRequestClose={() => setPreviewImage(null)}>
            <Pressable
              onPress={() => setPreviewImage(null)}
              style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', alignItems: 'center', justifyContent: 'center' }}
            >
              <Image
                source={{ uri: previewImage }}
                style={{ width: Dimensions.get('window').width - 48, height: Dimensions.get('window').width - 48 }}
                resizeMode="contain"
              />
              <Text style={{ fontFamily: fonts.sans, fontSize: 12, color: '#AAAAAA', marginTop: 16 }}>
                {t('exercisePicker.tapToClose')}
              </Text>
            </Pressable>
          </Modal>
        )}

        {/* Bottom confirm (multi mode only) */}
        {mode === 'multi' && selected.length > 0 && (
          <View style={{
            padding: 16,
            borderTopWidth: 1,
            borderTopColor: tokens.border,
            backgroundColor: tokens.bg,
          }}>
            <TouchableOpacity
              onPress={handleConfirm}
              style={{
                backgroundColor: tokens.accent,
                height: 48,
                alignItems: 'center',
                justifyContent: 'center',
              }}
              accessibilityLabel={t('exercisePicker.addCount', { count: selected.length })}
              accessibilityRole="button"
            >
              <Text style={{ fontFamily: fonts.sansX, fontSize: 14, color: '#FFFFFF', textTransform: 'uppercase', letterSpacing: 1 }}>
                {t('exercisePicker.addCount', { count: selected.length })}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  )
}
