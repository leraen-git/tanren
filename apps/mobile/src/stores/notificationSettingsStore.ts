import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import * as SecureStore from 'expo-secure-store'

// expo-secure-store adapter for Zustand persist
const secureStorage = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
}

export interface MealSlot {
  enabled: boolean
  time: string // 'HH:MM'
}

export interface NotificationSettings {
  // Workout
  workoutEnabled: boolean
  workoutTime: string        // 'HH:MM'
  workoutOffset: 0 | 15 | 30 // minutes before
  workoutDays: number[]       // 0=Sun … 6=Sat

  // Meals
  meals: {
    breakfast: MealSlot
    lunch: MealSlot
    snack: MealSlot
    dinner: MealSlot
  }

  // Hydration
  hydrationEnabled: boolean
  hydrationInterval: 60 | 90 | 120 // minutes
  hydrationActiveFrom: string // 'HH:MM'
  hydrationActiveTo: string   // 'HH:MM'
}

interface NotificationSettingsState extends NotificationSettings {
  updateWorkout: (patch: Partial<Pick<NotificationSettings, 'workoutEnabled' | 'workoutTime' | 'workoutOffset' | 'workoutDays'>>) => void
  updateMeal: (slot: keyof NotificationSettings['meals'], patch: Partial<MealSlot>) => void
  updateHydration: (patch: Partial<Pick<NotificationSettings, 'hydrationEnabled' | 'hydrationInterval' | 'hydrationActiveFrom' | 'hydrationActiveTo'>>) => void
  // Merge preferences loaded from the API (on first launch / cross-device)
  mergeFromServer: (prefs: Partial<NotificationSettings>) => void
}

const defaults: NotificationSettings = {
  workoutEnabled: false,
  workoutTime: '18:00',
  workoutOffset: 30,
  workoutDays: [1, 3, 5], // Mon, Wed, Fri

  meals: {
    breakfast: { enabled: false, time: '08:00' },
    lunch:     { enabled: false, time: '12:30' },
    snack:     { enabled: false, time: '16:00' },
    dinner:    { enabled: false, time: '20:00' },
  },

  hydrationEnabled: false,
  hydrationInterval: 90,
  hydrationActiveFrom: '07:00',
  hydrationActiveTo: '22:00',
}

export const useNotificationSettingsStore = create<NotificationSettingsState>()(
  persist(
    (set) => ({
      ...defaults,

      updateWorkout: (patch) => set((s) => ({ ...s, ...patch })),

      updateMeal: (slot, patch) =>
        set((s) => ({
          meals: { ...s.meals, [slot]: { ...s.meals[slot], ...patch } },
        })),

      updateHydration: (patch) => set((s) => ({ ...s, ...patch })),

      mergeFromServer: (prefs) =>
        set((s) => ({
          workoutEnabled:    prefs.workoutEnabled    ?? s.workoutEnabled,
          workoutTime:       prefs.workoutTime       ?? s.workoutTime,
          workoutOffset:     prefs.workoutOffset     ?? s.workoutOffset,
          workoutDays:       prefs.workoutDays       ?? s.workoutDays,
          hydrationEnabled:  prefs.hydrationEnabled  ?? s.hydrationEnabled,
          hydrationInterval: prefs.hydrationInterval ?? s.hydrationInterval,
          hydrationActiveFrom: prefs.hydrationActiveFrom ?? s.hydrationActiveFrom,
          hydrationActiveTo:   prefs.hydrationActiveTo   ?? s.hydrationActiveTo,
          meals: prefs.meals
            ? {
                breakfast: { ...s.meals.breakfast, ...prefs.meals.breakfast },
                lunch:     { ...s.meals.lunch,     ...prefs.meals.lunch },
                snack:     { ...s.meals.snack,     ...prefs.meals.snack },
                dinner:    { ...s.meals.dinner,    ...prefs.meals.dinner },
              }
            : s.meals,
        })),
    }),
    {
      name: 'notification-settings',
      storage: createJSONStorage(() => secureStorage),
    },
  ),
)
