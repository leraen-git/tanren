import { create } from 'zustand'

type PendingWorkoutStore = {
  pendingForDay: number | null
  pendingWorkoutId: string | null
  setDay: (dayOfWeek: number) => void
  setPending: (dayOfWeek: number, workoutId: string) => void
  clear: () => void
}

export const usePendingWorkoutStore = create<PendingWorkoutStore>((set) => ({
  pendingForDay: null,
  pendingWorkoutId: null,
  setDay: (dayOfWeek) => set({ pendingForDay: dayOfWeek, pendingWorkoutId: null }),
  setPending: (dayOfWeek, workoutId) => set({ pendingForDay: dayOfWeek, pendingWorkoutId: workoutId }),
  clear: () => set({ pendingForDay: null, pendingWorkoutId: null }),
}))
