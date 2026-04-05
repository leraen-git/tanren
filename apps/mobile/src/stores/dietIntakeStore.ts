import { create } from 'zustand'

export interface DietIntake {
  // Step 1 — Stats
  age: string
  sex: string
  goalWeight: string
  goalPace: 'steady' | 'fast'
  // Step 2 — Lifestyle
  jobType: string
  exerciseFrequency: string
  sleepHours: string
  stressLevel: 'low' | 'moderate' | 'high'
  alcoholPerWeek: string
  // Step 3 — Food preferences
  favoriteFoods: string[] // up to 5
  hatedFoods: string
  dietaryRestrictions: string
  cookingStyle: 'scratch' | 'quick' | 'batch'
  foodAdventure: number // 1-10
  // Step 4 — Snacks
  currentSnacks: string
  snackReason: 'hunger' | 'boredom' | 'habit'
  snackPreference: 'sweet' | 'savoury' | 'both'
  nightSnacking: boolean
}

interface DietIntakeState {
  intake: DietIntake
  update: (fields: Partial<DietIntake>) => void
  reset: () => void
}

const defaults: DietIntake = {
  age: '',
  sex: 'male',
  goalWeight: '',
  goalPace: 'steady',
  jobType: '',
  exerciseFrequency: '',
  sleepHours: '7',
  stressLevel: 'moderate',
  alcoholPerWeek: 'none',
  favoriteFoods: [],
  hatedFoods: '',
  dietaryRestrictions: '',
  cookingStyle: 'quick',
  foodAdventure: 6,
  currentSnacks: '',
  snackReason: 'hunger',
  snackPreference: 'both',
  nightSnacking: false,
}

export const useDietIntakeStore = create<DietIntakeState>((set) => ({
  intake: { ...defaults },
  update: (fields) => set((s) => ({ intake: { ...s.intake, ...fields } })),
  reset: () => set({ intake: { ...defaults } }),
}))
