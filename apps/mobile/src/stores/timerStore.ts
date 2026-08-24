import { createStore } from 'zustand/vanilla'
import { useStore } from 'zustand'
import { Vibration } from 'react-native'
import { playTimerChime } from '@/services/timerSoundService'
import { scheduleRestEndNotification, cancelRestNotification } from '@/services/timerService'

interface TimerState {
  isRunning: boolean
  secondsRemaining: number
  totalSeconds: number
  exerciseName: string
  endsAt: number | null
  start: (seconds: number, exerciseName: string) => void
  pause: () => void
  skip: () => void
  addSeconds: (seconds: number) => void
  reset: () => void
  tick: () => void
  sync: () => void
}

function onTimerComplete() {
  playTimerChime()
  Vibration.vibrate([0, 400, 200, 400])
  cancelRestNotification()
}

export const timerStore = createStore<TimerState>((set) => ({
  isRunning: false,
  secondsRemaining: 0,
  totalSeconds: 0,
  exerciseName: '',
  endsAt: null,

  start: (seconds, exerciseName) => {
    scheduleRestEndNotification(seconds, exerciseName)
    set({
      isRunning: true,
      secondsRemaining: seconds,
      totalSeconds: seconds,
      exerciseName,
      endsAt: Date.now() + seconds * 1000,
    })
  },

  pause: () =>
    set((s) => {
      if (s.isRunning) {
        cancelRestNotification()
        return { isRunning: false, endsAt: null }
      }
      const remaining = s.secondsRemaining
      scheduleRestEndNotification(remaining, s.exerciseName)
      return {
        isRunning: true,
        endsAt: Date.now() + remaining * 1000,
      }
    }),

  skip: () => {
    cancelRestNotification()
    set({ isRunning: false, secondsRemaining: 0, endsAt: null })
  },

  addSeconds: (seconds) =>
    set((s) => {
      const newEndsAt = s.endsAt ? s.endsAt + seconds * 1000 : null
      const newRemaining = Math.max(0, s.secondsRemaining + seconds)
      if (newEndsAt && s.isRunning) {
        scheduleRestEndNotification(newRemaining, s.exerciseName)
      }
      return {
        secondsRemaining: newRemaining,
        totalSeconds: Math.max(0, s.totalSeconds + seconds),
        endsAt: newEndsAt,
      }
    }),

  reset: () => {
    cancelRestNotification()
    set({ isRunning: false, secondsRemaining: 0, totalSeconds: 0, exerciseName: '', endsAt: null })
  },

  tick: () =>
    set((s) => {
      if (!s.isRunning || !s.endsAt) return { isRunning: false }
      const remaining = Math.ceil((s.endsAt - Date.now()) / 1000)
      if (remaining <= 0) {
        onTimerComplete()
        return { secondsRemaining: 0, isRunning: false, endsAt: null }
      }
      return { secondsRemaining: remaining }
    }),

  sync: () =>
    set((s) => {
      if (!s.isRunning || !s.endsAt) return s
      cancelRestNotification()
      const remaining = Math.ceil((s.endsAt - Date.now()) / 1000)
      if (remaining <= 0) {
        onTimerComplete()
        return { secondsRemaining: 0, isRunning: false, endsAt: null }
      }
      return { secondsRemaining: remaining }
    }),
}))

export function useTimerStore<T>(selector: (s: TimerState) => T): T {
  return useStore(timerStore, selector)
}
