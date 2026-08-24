import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { mmkvStateStorage } from '@/lib/storage'
import { computeNextStep, getGroupBounds } from '@/lib/superset'

export interface SetConfig {
  reps: number
  weight: number
  restSeconds: number
  isCompleted: boolean
  completedAt?: Date
}

export interface SessionExercise {
  exerciseId: string
  exerciseName: string
  defaultSets: number
  defaultReps: number
  defaultWeight: number
  defaultRestSeconds: number
  lastWeight?: number
  lastReps?: number
  prWeight?: number
  prReps?: number
  previousVolume?: number
  videoUrl?: string | null
  supersetGroupId?: string | null
  sets: SetConfig[]
}

interface ActiveSessionState {
  currentWorkout: { id: string; name: string } | null
  isQuickSession: boolean
  exercises: SessionExercise[]
  currentExerciseIndex: number
  currentSetIndex: number
  startedAt: Date | null

  startSession: (workout: { id: string; name: string }, exercises: SessionExercise[], isQuick?: boolean) => void
  nextExercise: () => void
  prevExercise: () => void
  completeSet: (exerciseIndex: number, setIndex: number) => void
  updateSet: (exerciseIndex: number, setIndex: number, data: Partial<SetConfig>) => void
  addExercise: (exercise: Omit<SessionExercise, 'sets'> & { sets?: SetConfig[] }) => void
  addSupersetExercise: (anchorIndex: number, exercise: Omit<SessionExercise, 'sets'> & { sets?: SetConfig[] }) => void
  jumpToExercise: (index: number) => void
  finishSession: () => void
}

export const useActiveSessionStore = create<ActiveSessionState>()(
  persist((set) => ({
  currentWorkout: null,
  isQuickSession: false,
  exercises: [],
  currentExerciseIndex: 0,
  currentSetIndex: 0,
  startedAt: null,

  startSession: (workout, exercises, isQuick = false) =>
    set({
      currentWorkout: workout,
      isQuickSession: isQuick,
      exercises: exercises.map((ex) => ({
        ...ex,
        sets: ex.sets.map((s) => ({ ...s, isCompleted: false })),
      })),
      currentExerciseIndex: 0,
      currentSetIndex: 0,
      startedAt: new Date(),
    }),

  nextExercise: () =>
    set((s) => ({
      currentExerciseIndex: Math.min(s.exercises.length - 1, s.currentExerciseIndex + 1),
      currentSetIndex: 0,
    })),

  prevExercise: () =>
    set((s) => ({
      currentExerciseIndex: Math.max(0, s.currentExerciseIndex - 1),
      currentSetIndex: 0,
    })),

  completeSet: (exerciseIndex, setIndex) =>
    set((s) => {
      const exercises = s.exercises.map((ex, eIdx) => {
        if (eIdx !== exerciseIndex) return ex
        const sets = ex.sets.map((st, sIdx) => {
          if (sIdx !== setIndex) return st
          return { ...st, isCompleted: true, completedAt: new Date() }
        })
        return { ...ex, sets }
      })
      const nextStep = computeNextStep(exercises, exerciseIndex, setIndex)
      if (nextStep) {
        return {
          exercises,
          currentExerciseIndex: nextStep.exerciseIndex,
          currentSetIndex: nextStep.setIndex,
        }
      }
      return {
        exercises,
        currentSetIndex: setIndex,
      }
    }),

  updateSet: (exerciseIndex, setIndex, data) =>
    set((s) => ({
      exercises: s.exercises.map((ex, eIdx) => {
        if (eIdx !== exerciseIndex) return ex
        return {
          ...ex,
          sets: ex.sets.map((st, sIdx) => (sIdx === setIndex ? { ...st, ...data } : st)),
        }
      }),
    })),

  addExercise: (exercise) =>
    set((s) => ({
      exercises: [
        ...s.exercises,
        {
          ...exercise,
          sets: (exercise.sets ?? Array.from({ length: exercise.defaultSets }, () => ({
            reps: exercise.defaultReps,
            weight: exercise.defaultWeight,
            restSeconds: exercise.defaultRestSeconds,
            isCompleted: false,
          }))),
        },
      ],
      currentExerciseIndex: s.exercises.length,
      currentSetIndex: 0,
    })),

  addSupersetExercise: (anchorIndex, exercise) =>
    set((s) => {
      const anchor = s.exercises[anchorIndex]
      if (!anchor) return s
      const groupId = anchor.supersetGroupId || `ss-${Date.now()}`
      const newExercises = [...s.exercises]
      // Tag the anchor if it doesn't have a group yet
      if (!anchor.supersetGroupId) {
        newExercises[anchorIndex] = { ...anchor, supersetGroupId: groupId }
      }
      // Find the end of the current group to insert after it
      let insertAt = anchorIndex + 1
      while (insertAt < newExercises.length && newExercises[insertAt]!.supersetGroupId === groupId) {
        insertAt++
      }
      const newEx: SessionExercise = {
        ...exercise,
        supersetGroupId: groupId,
        sets: exercise.sets ?? Array.from({ length: anchor.sets.length }, () => ({
          reps: exercise.defaultReps,
          weight: exercise.defaultWeight,
          restSeconds: 15,
          isCompleted: false,
        })),
      }
      newExercises.splice(insertAt, 0, newEx)
      return {
        exercises: newExercises,
        currentExerciseIndex: insertAt,
        currentSetIndex: 0,
      }
    }),

  jumpToExercise: (index) =>
    set({ currentExerciseIndex: index, currentSetIndex: 0 }),

  finishSession: () =>
    set({
      currentWorkout: null,
      isQuickSession: false,
      exercises: [],
      currentExerciseIndex: 0,
      currentSetIndex: 0,
      startedAt: null,
    }),
}), {
    name: 'active-session-v2',
    storage: createJSONStorage(() => mmkvStateStorage),
    partialize: (state) => ({
      currentWorkout: state.currentWorkout,
      exercises: state.exercises,
      currentExerciseIndex: state.currentExerciseIndex,
      currentSetIndex: state.currentSetIndex,
      startedAt: state.startedAt?.toISOString() ?? null,
      isQuickSession: state.isQuickSession,
    }),
    onRehydrateStorage: () => (state) => {
      if (state?.startedAt && typeof state.startedAt === 'string') {
        (state as any).startedAt = new Date(state.startedAt as any)
      }
    },
  }),
)
