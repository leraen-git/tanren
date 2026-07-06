import { Alert } from 'react-native'
import { router } from 'expo-router'
import i18next from 'i18next'
import { useNotificationSettingsStore } from '@/stores/notificationSettingsStore'
import {
  getPermissionStatus,
  requestPermission,
} from '@/services/notificationPermissions'
import {
  rescheduleWorkoutNotifications,
  rescheduleMealNotifications,
} from '@/services/notificationScheduler'

type PromptType = 'workout' | 'diet'

export function promptReminders(type: PromptType, planDays?: number[]) {
  const t = i18next.t.bind(i18next)
  const lang = (i18next.language === 'fr' ? 'fr' : 'en') as 'en' | 'fr'
  const message = type === 'workout'
    ? t('ai.reminderPromptWorkout')
    : t('ai.reminderPromptDiet')

  Alert.alert(
    t('ai.reminderPromptTitle'),
    message,
    [
      { text: t('ai.reminderPromptLater'), style: 'cancel' },
      {
        text: t('ai.reminderPromptYes'),
        onPress: () => enableReminders(type, lang, planDays),
      },
    ],
  )
}

async function enableReminders(type: PromptType, lang: 'en' | 'fr', planDays?: number[]) {
  const status = await getPermissionStatus()
  if (status !== 'granted') {
    const result = await requestPermission()
    if (result !== 'granted') return
  }

  const store = useNotificationSettingsStore.getState()

  if (type === 'workout') {
    const days = planDays?.length ? planDays : store.workoutDays
    store.updateWorkout({ workoutEnabled: true, workoutDays: days })
    rescheduleWorkoutNotifications({ ...store, workoutEnabled: true, workoutDays: days }, undefined, lang)
  } else {
    store.updateMeal('breakfast', { enabled: true })
    store.updateMeal('lunch', { enabled: true })
    store.updateMeal('dinner', { enabled: true })
    const updatedMeals = {
      ...store.meals,
      breakfast: { ...store.meals.breakfast, enabled: true },
      lunch: { ...store.meals.lunch, enabled: true },
      dinner: { ...store.meals.dinner, enabled: true },
    }
    rescheduleMealNotifications({ ...store, meals: updatedMeals }, lang)
  }
}
