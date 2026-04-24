import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { storage } from '@/lib/storage'
import { trpc } from '@/lib/trpc'

const CACHE_KEY = 'exercises_cache'
const CACHE_VERSION_KEY = 'exercises_cache_version'
const CURRENT_VERSION = '2'

interface RawExercise {
  id: string
  name: string
  nameFr: string | null
  muscleGroups: string[]
  equipment: string[]
  description: string
  descriptionFr: string | null
  videoUrl: string | null
  imageUrl: string | null
  difficulty: string
  isCustom: boolean
  userId: string | null
}

export interface Exercise {
  id: string
  name: string
  muscleGroups: string[]
  equipment: string[]
  description: string
  videoUrl: string | null
  imageUrl: string | null
  difficulty: string
  isCustom: boolean
  userId: string | null
}

const MUSCLE_GROUP_KEY_MAP: Record<string, string> = {
  'All': 'all',
  'Chest': 'chest',
  'Back': 'back',
  'Shoulders': 'shoulders',
  'Biceps': 'biceps',
  'Triceps': 'triceps',
  'Forearms': 'forearms',
  'Core': 'core',
  'Quadriceps': 'quadriceps',
  'Hamstrings': 'hamstrings',
  'Glutes': 'glutes',
  'Calves': 'calves',
  'Full Body': 'fullBody',
}

function translateExercise(raw: RawExercise, isFr: boolean): Exercise {
  return {
    id: raw.id,
    name: isFr && raw.nameFr ? raw.nameFr : raw.name,
    muscleGroups: raw.muscleGroups,
    equipment: raw.equipment,
    description: isFr && raw.descriptionFr ? raw.descriptionFr : raw.description,
    videoUrl: raw.videoUrl,
    imageUrl: raw.imageUrl,
    difficulty: raw.difficulty,
    isCustom: raw.isCustom,
    userId: raw.userId,
  }
}

export function translateMuscleGroup(group: string, t: (key: string) => string): string {
  const key = MUSCLE_GROUP_KEY_MAP[group]
  if (key) return t(`muscleGroups.${key}`)
  return group
}

export function translateDifficulty(difficulty: string, t: (key: string) => string): string {
  return t(`difficulty.${difficulty}`)
}

export function translateEquipment(equipment: string, t: (key: string) => string): string {
  const translated = t(`equipmentType.${equipment}`)
  return translated.startsWith('equipmentType.') ? equipment : translated
}

export function useExercises() {
  const { i18n } = useTranslation()
  const isFr = i18n.language === 'fr'
  const [cached, setCached] = useState<RawExercise[] | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const version = storage.getString(CACHE_VERSION_KEY)
    const data = storage.getString(CACHE_KEY)
    if (data && version === CURRENT_VERSION) {
      try {
        setCached(JSON.parse(data))
        setIsLoading(false)
      } catch {
        // corrupted cache, will fetch
      }
    }
  }, [])

  const { data: fetched } = trpc.exercises.list.useQuery(undefined, {
    staleTime: Infinity,
    gcTime: Infinity,
    enabled: cached === null,
  })

  useEffect(() => {
    if (fetched && fetched.length > 0) {
      setCached(fetched as RawExercise[])
      setIsLoading(false)
      storage.set(CACHE_KEY, JSON.stringify(fetched))
      storage.set(CACHE_VERSION_KEY, CURRENT_VERSION)
    }
  }, [fetched])

  const exercises = useMemo(() => {
    if (!cached) return undefined
    return cached.map((ex) => translateExercise(ex, isFr))
  }, [cached, isFr])

  const refresh = () => {
    storage.remove(CACHE_KEY)
    storage.remove(CACHE_VERSION_KEY)
    setCached(null)
    setIsLoading(true)
  }

  return { data: exercises, isLoading, refresh }
}
