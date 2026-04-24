import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { mmkvStateStorage } from '../lib/storage'

type PendingWorkoutStore = {
  pendingForDay: number | null
  pendingWorkoutId: string | null
  setDay: (dayOfWeek: number) => void
  setPending: (dayOfWeek: number, workoutId: string) => void
  clear: () => void
}

export const usePendingWorkoutStore = create<PendingWorkoutStore>()(
  persist(
    (set) => ({
      pendingForDay: null,
      pendingWorkoutId: null,
      setDay: (dayOfWeek) => set({ pendingForDay: dayOfWeek, pendingWorkoutId: null }),
      setPending: (dayOfWeek, workoutId) => set({ pendingForDay: dayOfWeek, pendingWorkoutId: workoutId }),
      clear: () => set({ pendingForDay: null, pendingWorkoutId: null }),
    }),
    {
      name: 'pending-workout',
      storage: createJSONStorage(() => mmkvStateStorage),
    },
  ),
)
