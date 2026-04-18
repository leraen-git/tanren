import { createStore } from 'zustand/vanilla'
import { useStore } from 'zustand'
import { playTimerChime } from '@/services/timerSoundService'

interface TimerState {
  isRunning: boolean
  secondsRemaining: number
  totalSeconds: number
  exerciseName: string
  start: (seconds: number, exerciseName: string) => void
  pause: () => void
  skip: () => void
  addSeconds: (seconds: number) => void
  reset: () => void
  tick: () => void
}

export const timerStore = createStore<TimerState>((set) => ({
  isRunning: false,
  secondsRemaining: 0,
  totalSeconds: 0,
  exerciseName: '',

  start: (seconds, exerciseName) =>
    set({ isRunning: true, secondsRemaining: seconds, totalSeconds: seconds, exerciseName }),

  pause: () => set((s) => ({ isRunning: !s.isRunning })),

  skip: () => set({ isRunning: false, secondsRemaining: 0 }),

  addSeconds: (seconds) =>
    set((s) => ({
      secondsRemaining: Math.max(0, s.secondsRemaining + seconds),
      totalSeconds: Math.max(0, s.totalSeconds + seconds),
    })),

  reset: () => set({ isRunning: false, secondsRemaining: 0, totalSeconds: 0, exerciseName: '' }),

  tick: () =>
    set((s) => {
      if (!s.isRunning || s.secondsRemaining <= 0) return { isRunning: false }
      const next = s.secondsRemaining - 1
      if (next <= 0) {
        playTimerChime()
        return { secondsRemaining: 0, isRunning: false }
      }
      return { secondsRemaining: next }
    }),
}))

export function useTimerStore<T>(selector: (s: TimerState) => T): T {
  return useStore(timerStore, selector)
}
