import { create } from 'zustand'
import type { User } from '@tanren/shared'

type Theme = 'system' | 'light' | 'dark'
type WeightUnit = 'kg' | 'lbs'

interface UserState {
  profile: User | null
  theme: Theme
  weightUnit: WeightUnit
  setProfile: (user: User) => void
  toggleTheme: () => void
  setWeightUnit: (unit: WeightUnit) => void
}

export const useUserStore = create<UserState>((set) => ({
  profile: null,
  theme: 'system',
  weightUnit: 'kg',
  setProfile: (profile) => set({ profile }),
  toggleTheme: () =>
    set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),
  setWeightUnit: (weightUnit) => set({ weightUnit }),
}))
