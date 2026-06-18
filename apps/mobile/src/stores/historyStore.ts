import { create } from 'zustand'
import type { HistoryPeriod } from '@tanren/shared'

type ViewMode = 'list' | 'stats'

interface HistoryState {
  viewMode: ViewMode
  period: HistoryPeriod
  muscleGroup: string | null
  setViewMode: (v: ViewMode) => void
  setPeriod: (p: HistoryPeriod) => void
  setMuscleGroup: (m: string | null) => void
  resetFilters: () => void
}

export const useHistoryStore = create<HistoryState>((set) => ({
  viewMode: 'list',
  period: '3m',
  muscleGroup: null,
  setViewMode: (viewMode) => set({ viewMode }),
  setPeriod: (period) => set({ period }),
  setMuscleGroup: (muscleGroup) => set({ muscleGroup }),
  resetFilters: () => set({ period: '3m', muscleGroup: null }),
}))
