import { create } from 'zustand'

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
  finishSession: () => void
}

export const useActiveSessionStore = create<ActiveSessionState>((set) => ({
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
      // Advance currentSetIndex to next incomplete set
      const nextSetIndex = exercises[exerciseIndex]?.sets.findIndex((st, i) => i > setIndex && !st.isCompleted) ?? -1
      return {
        exercises,
        currentSetIndex: nextSetIndex >= 0 ? nextSetIndex : setIndex,
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

  finishSession: () =>
    set({
      currentWorkout: null,
      isQuickSession: false,
      exercises: [],
      currentExerciseIndex: 0,
      currentSetIndex: 0,
      startedAt: null,
    }),
}))
