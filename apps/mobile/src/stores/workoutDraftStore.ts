import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { mmkvStateStorage } from '../lib/storage'

export type ExerciseEntry = {
  exerciseId: string
  exerciseName: string
  muscleGroups: string[]
  sets: number
  reps: number
  weight: number
  restSeconds: number
}

type WorkoutDraft = {
  name: string
  muscleGroups: string[]
  durationMin: number
  exercises: ExerciseEntry[]
  createdAt: string
}

type Store = WorkoutDraft & {
  setName: (s: string) => void
  toggleMuscle: (m: string) => void
  setDuration: (n: number) => void
  addExercises: (items: ExerciseEntry[]) => void
  updateExercise: (index: number, patch: Partial<ExerciseEntry>) => void
  removeExercise: (index: number) => void
  reorderExercises: (newOrder: ExerciseEntry[]) => void
  hydrate: (data: Partial<WorkoutDraft>) => void
  reset: () => void
  isExpired: () => boolean
}

const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000

const initial: WorkoutDraft = {
  name: '',
  muscleGroups: [],
  durationMin: 60,
  exercises: [],
  createdAt: new Date().toISOString(),
}

export const useWorkoutDraftStore = create<Store>()(
  persist(
    (set, get) => ({
      ...initial,
      setName: (name) => set({ name }),
      toggleMuscle: (m) => set((s) => ({
        muscleGroups: s.muscleGroups.includes(m)
          ? s.muscleGroups.filter((x) => x !== m)
          : [...s.muscleGroups, m],
      })),
      setDuration: (durationMin) => set({ durationMin }),
      addExercises: (items) => set((s) => ({
        exercises: [...s.exercises, ...items],
      })),
      updateExercise: (index, patch) => set((s) => ({
        exercises: s.exercises.map((ex, i) => i === index ? { ...ex, ...patch } : ex),
      })),
      removeExercise: (index) => set((s) => ({
        exercises: s.exercises.filter((_, i) => i !== index),
      })),
      reorderExercises: (newOrder) => set({ exercises: newOrder }),
      hydrate: (data) => set({ ...data, createdAt: new Date().toISOString() }),
      reset: () => set({ ...initial, createdAt: new Date().toISOString() }),
      isExpired: () => {
        const created = new Date(get().createdAt).getTime()
        return Date.now() - created > SEVEN_DAYS
      },
    }),
    {
      name: 'workout-draft',
      storage: createJSONStorage(() => mmkvStateStorage),
    },
  ),
)
