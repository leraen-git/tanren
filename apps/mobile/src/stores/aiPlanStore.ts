import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { mmkvStateStorage } from '@/lib/storage'

export interface GeneratedExercise {
  exerciseId: string
  exerciseName: string
  defaultSets: number
  defaultReps: number
  defaultWeight: number
  defaultRestSeconds: number
  supersetGroupId?: string | null
}

export interface GeneratedDay {
  dayOfWeek: number
  workoutName: string
  muscleGroups: string[]
  estimatedDuration: number
  exercises: GeneratedExercise[]
}

export interface GeneratedPlan {
  name: string
  days: GeneratedDay[]
}

interface ConversationMessage {
  role: 'user' | 'assistant'
  content: string
}

interface AIPlanState {
  proposedPlan: GeneratedPlan | null
  conversationHistory: ConversationMessage[]
  lastPrompt: string
  pendingPrompt: string

  setPendingPrompt: (prompt: string) => void
  setProposedPlan: (plan: GeneratedPlan, userPrompt: string, assistantMessage: string) => void
  updateProposedPlan: (plan: GeneratedPlan) => void
  reset: () => void
}

export const useAIPlanStore = create<AIPlanState>()(
  persist((set) => ({
  proposedPlan: null,
  conversationHistory: [],
  lastPrompt: '',
  pendingPrompt: '',

  setPendingPrompt: (prompt) => set({ pendingPrompt: prompt }),
  updateProposedPlan: (plan) => set({ proposedPlan: plan }),

  setProposedPlan: (plan, userPrompt, assistantMessage) =>
    set((s) => ({
      proposedPlan: plan,
      lastPrompt: userPrompt,
      pendingPrompt: '',
      conversationHistory: [
        ...s.conversationHistory,
        { role: 'user', content: userPrompt },
        { role: 'assistant', content: assistantMessage },
      ],
    })),

  reset: () => set({ proposedPlan: null, conversationHistory: [], lastPrompt: '', pendingPrompt: '' }),
}), {
    name: 'tanren-ai-plan',
    storage: createJSONStorage(() => mmkvStateStorage),
    partialize: (state) => ({
      proposedPlan: state.proposedPlan,
      conversationHistory: state.conversationHistory,
      lastPrompt: state.lastPrompt,
    }),
  }),
)
