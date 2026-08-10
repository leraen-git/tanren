import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { mmkvStateStorage } from '../lib/storage'
import * as Crypto from 'expo-crypto'

export type ExerciseEntry = {
  exerciseId: string
  exerciseName: string
  muscleGroups: string[]
  sets: number
  reps: number
  weight: number
  restSeconds: number
  supersetGroupId?: string | null
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
  linkSuperset: (index: number) => void
  unlinkExercise: (index: number) => void
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
      removeExercise: (index) => set((s) => {
        const removed = s.exercises[index]
        const filtered = s.exercises.filter((_, i) => i !== index)
        if (removed?.supersetGroupId) {
          const remaining = filtered.filter((e) => e.supersetGroupId === removed.supersetGroupId)
          if (remaining.length === 1) {
            return { exercises: filtered.map((e) => e.supersetGroupId === removed.supersetGroupId ? { ...e, supersetGroupId: null, restSeconds: 90 } : e) }
          }
          if (remaining.length > 1) {
            const lastIdx = filtered.reduce((last, e, i) => e.supersetGroupId === removed.supersetGroupId ? i : last, -1)
            return { exercises: filtered.map((e, i) => {
              if (e.supersetGroupId !== removed.supersetGroupId) return e
              if (i === lastIdx && e.restSeconds === 15) return { ...e, restSeconds: 90 }
              return e
            })}
          }
        }
        return { exercises: filtered }
      }),
      reorderExercises: (newOrder) => {
        const result: ExerciseEntry[] = []
        const seen = new Set<string>()
        for (const ex of newOrder) {
          const gid = ex.supersetGroupId
          if (!gid) { result.push(ex); continue }
          if (seen.has(gid)) continue
          seen.add(gid)
          const members = newOrder.filter((e) => e.supersetGroupId === gid)
          result.push(...members)
        }
        set({ exercises: result })
      },
      linkSuperset: (index) => set((s) => {
        if (index >= s.exercises.length - 1) return s
        const current = s.exercises[index]!
        const next = s.exercises[index + 1]!
        const nextGid = next.supersetGroupId
        const currentGid = current.supersetGroupId
        const gid = nextGid ?? currentGid ?? Crypto.randomUUID()
        const exercises = s.exercises.map((ex, i) => {
          if (i === index) return { ...ex, supersetGroupId: gid, restSeconds: 15 }
          if (i === index + 1) return { ...ex, supersetGroupId: gid }
          return ex
        })
        // Ensure the last member of the group has round rest
        const groupMembers = exercises.filter((e) => e.supersetGroupId === gid)
        const lastMemberIdx = exercises.reduce((last, e, i) => e.supersetGroupId === gid ? i : last, -1)
        if (lastMemberIdx >= 0 && exercises[lastMemberIdx]!.restSeconds === 15) {
          exercises[lastMemberIdx] = { ...exercises[lastMemberIdx]!, restSeconds: 90 }
        }
        // Non-last members default to 15s transition
        for (let i = 0; i < exercises.length; i++) {
          if (exercises[i]!.supersetGroupId === gid && i !== lastMemberIdx && exercises[i]!.restSeconds === 90) {
            exercises[i] = { ...exercises[i]!, restSeconds: 15 }
          }
        }
        return { exercises }
      }),
      unlinkExercise: (index) => set((s) => {
        const ex = s.exercises[index]
        if (!ex?.supersetGroupId) return s
        const gid = ex.supersetGroupId
        const exercises = s.exercises.map((e, i) => i === index ? { ...e, supersetGroupId: null, restSeconds: 90 } : e)
        const remaining = exercises.filter((e) => e.supersetGroupId === gid)
        if (remaining.length === 1) {
          return { exercises: exercises.map((e) => e.supersetGroupId === gid ? { ...e, supersetGroupId: null, restSeconds: 90 } : e) }
        }
        // Fix last member rest
        const lastIdx = exercises.reduce((last, e, i) => e.supersetGroupId === gid ? i : last, -1)
        if (lastIdx >= 0 && exercises[lastIdx]!.restSeconds === 15) {
          exercises[lastIdx] = { ...exercises[lastIdx]!, restSeconds: 90 }
        }
        return { exercises }
      }),
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
