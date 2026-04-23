import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { mmkvStateStorage } from '@/lib/storage'

export type BiologicalSex = 'MALE' | 'FEMALE'
export type Pace = 'STEADY' | 'FAST'
export type GoalMode = 'WEIGHT' | 'FEEL'
export type JobType = 'DESK' | 'STANDING' | 'MANUAL'
export type ExerciseFrequency = '0-1' | '2-3' | '4+'
export type StressLevel = 'LOW' | 'MODERATE' | 'HIGH'
export type AlcoholBracket = '0' | '1-5' | '6+'
export type CookingStyle = 'HOME_COOKING' | 'QUICK_SIMPLE' | 'MEAL_PREP'
export type SnackMotivation = 'HUNGER' | 'BOREDOM' | 'HABIT'
export type SnackPreference = 'SWEET' | 'SAVOURY' | 'BOTH'
export type NightSnacking = 'NEVER' | 'SOMETIMES' | 'OFTEN'

export interface IntakeDraftV2 {
  // Step 1
  age: string
  biologicalSex: BiologicalSex
  heightCm: string
  currentWeightKg: string
  goalMode: GoalMode
  goalWeightKg: string
  goalFeel: string
  pace: Pace
  // Step 2
  jobType: JobType
  exerciseFrequency: ExerciseFrequency
  exerciseType: string
  sleepHours: string
  stressLevel: StressLevel
  alcoholBracket: AlcoholBracket
  // Step 3
  top5Meals: string
  hatedFoods: string
  restrictions: string[]
  cookingStyle: CookingStyle
  adventurousness: number
  // Step 4
  currentSnacks: string
  snackMotivation: SnackMotivation
  snackPreference: SnackPreference
  nightSnacking: NightSnacking
}

interface IntakeDraftV2State {
  draft: IntakeDraftV2
  update: (fields: Partial<IntakeDraftV2>) => void
  reset: () => void
}

const defaults: IntakeDraftV2 = {
  age: '',
  biologicalSex: 'MALE',
  heightCm: '',
  currentWeightKg: '',
  goalMode: 'WEIGHT',
  goalWeightKg: '',
  goalFeel: '',
  pace: 'STEADY',
  jobType: 'DESK',
  exerciseFrequency: '2-3',
  exerciseType: '',
  sleepHours: '7',
  stressLevel: 'MODERATE',
  alcoholBracket: '0',
  top5Meals: '',
  hatedFoods: '',
  restrictions: [],
  cookingStyle: 'QUICK_SIMPLE',
  adventurousness: 5,
  currentSnacks: '',
  snackMotivation: 'HUNGER',
  snackPreference: 'BOTH',
  nightSnacking: 'NEVER',
}

export const useIntakeDraftV2Store = create<IntakeDraftV2State>()(
  persist(
    (set) => ({
      draft: { ...defaults },
      update: (fields) => set((s) => ({ draft: { ...s.draft, ...fields } })),
      reset: () => set({ draft: { ...defaults } }),
    }),
    {
      name: 'tanren-intake-v2',
      storage: createJSONStorage(() => mmkvStateStorage),
      partialize: (state) => ({ draft: state.draft }),
    },
  ),
)
