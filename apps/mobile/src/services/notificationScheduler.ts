import * as Notifications from 'expo-notifications'
import { getPermissionStatus } from './notificationPermissions'
import type { NotificationSettings } from '@/stores/notificationSettingsStore'

// ─── Hydration message pool ───────────────────────────────────────────────────

const HYDRATION_MESSAGES_EN = [
  'Drink some water 💧',
  'Stay hydrated 💦',
  'Time for a glass of water 🚰',
  'Hydration check — drink up! 💧',
  'Your body is 60% water. Top it up! 💦',
  'Quick water break 🚰',
  "Don't forget to drink water 💧",
  'Small sips, big wins 💦',
]

const HYDRATION_MESSAGES_FR = [
  'Bois de l\'eau 💧',
  'Reste hydraté 💦',
  'Pause hydratation 🚰',
  'Vérification hydratation — bois ! 💧',
  'Ton corps est à 60% d\'eau. Recharge ! 💦',
  'Petite pause eau 🚰',
  "N'oublie pas de boire 💧",
  'Quelques gorgées, grands bénéfices 💦',
]

// Pick a message seeded by index so it rotates predictably across the day
function hydrationMessage(index: number, lang: 'en' | 'fr' = 'en'): string {
  const pool = lang === 'fr' ? HYDRATION_MESSAGES_FR : HYDRATION_MESSAGES_EN
  return pool[index % pool.length]!
}

// ─── Time helpers ─────────────────────────────────────────────────────────────

function parseTime(hhmm: string): { hour: number; minute: number } {
  const [h, m] = hhmm.split(':').map(Number)
  return { hour: h ?? 0, minute: m ?? 0 }
}

function subtractMinutes(hhmm: string, minutes: number): { hour: number; minute: number } {
  const total = parseTime(hhmm)
  const totalMins = total.hour * 60 + total.minute - minutes
  const normalized = ((totalMins % 1440) + 1440) % 1440 // wrap around midnight
  return { hour: Math.floor(normalized / 60), minute: normalized % 60 }
}

// ─── Cancel helpers ───────────────────────────────────────────────────────────

async function cancelByPrefix(prefix: string): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync()
  const toCancel = scheduled
    .filter((n) => n.identifier.startsWith(prefix))
    .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier))
  await Promise.all(toCancel)
}

// ─── Workout reminders ────────────────────────────────────────────────────────

export interface WorkoutPlanDay {
  dayOfWeek: number // 0=Sun … 6=Sat
  workoutName: string
}

export async function rescheduleWorkoutNotifications(
  settings: NotificationSettings,
  planDays?: WorkoutPlanDay[],
  lang: 'en' | 'fr' = 'en',
): Promise<void> {
  await cancelByPrefix('workout-')

  if (!settings.workoutEnabled) return
  if ((await getPermissionStatus()) !== 'granted') return

  const planMap = new Map(planDays?.map((d) => [d.dayOfWeek, d.workoutName]) ?? [])
  const MAX = 64

  let count = 0
  for (const day of settings.workoutDays) {
    if (count >= MAX) break
    const { hour, minute } = subtractMinutes(settings.workoutTime, settings.workoutOffset)
    const workoutName = planMap.get(day)

    let offsetLabel: string
    if (settings.workoutOffset === 0) {
      offsetLabel = lang === 'fr' ? 'commence maintenant' : 'starts now'
    } else {
      offsetLabel = lang === 'fr'
        ? `dans ${settings.workoutOffset} min`
        : `in ${settings.workoutOffset} min`
    }

    const title = lang === 'fr' ? 'Rappel entraînement' : 'Workout reminder'
    const body = workoutName
      ? `${workoutName} ${offsetLabel} 💪`
      : lang === 'fr' ? "C'est l'heure de t'entraîner 💪" : "Time to hit the gym 💪"

    // Expo weekday: 1=Sunday, 2=Monday, …, 7=Saturday
    const weekday = day === 0 ? 1 : day + 1

    await Notifications.scheduleNotificationAsync({
      identifier: `workout-${day}`,
      content: {
        title,
        body,
        data: { screen: 'workout' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday,
        hour,
        minute,
        repeats: true,
      } as any,
    })
    count++
  }
}

// ─── Meal reminders ───────────────────────────────────────────────────────────

const MEAL_CONTENT: Record<string, { title: string; body: string; bodyFr: string }> = {
  breakfast: { title: 'Breakfast time 🍳',  body: 'Time for breakfast 🍳',  bodyFr: 'C\'est l\'heure du petit-déj 🍳' },
  lunch:     { title: 'Lunch time 🥗',      body: 'Lunch time 🥗',          bodyFr: 'C\'est l\'heure du déjeuner 🥗' },
  snack:     { title: 'Snack time 🍎',      body: 'Time for a snack 🍎',    bodyFr: 'Heure de la collation 🍎' },
  dinner:    { title: 'Dinner time 🍽️',    body: 'Time for dinner 🍽️',    bodyFr: 'C\'est l\'heure du dîner 🍽️' },
}

export async function rescheduleMealNotifications(settings: NotificationSettings): Promise<void> {
  await cancelByPrefix('meal-')

  if ((await getPermissionStatus()) !== 'granted') return

  const slots = Object.entries(settings.meals) as [keyof typeof settings.meals, typeof settings.meals.breakfast][]

  for (const [slot, cfg] of slots) {
    if (!cfg.enabled) continue
    const content = MEAL_CONTENT[slot]!
    const { hour, minute } = parseTime(cfg.time)

    await Notifications.scheduleNotificationAsync({
      identifier: `meal-${slot}`,
      content: {
        title: content.title,
        body: content.body,
        data: { screen: 'diet', mealSlot: slot },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
        repeats: true,
      } as any,
    })
  }
}

// ─── Hydration reminders ──────────────────────────────────────────────────────

export async function rescheduleHydrationNotifications(settings: NotificationSettings): Promise<void> {
  await cancelByPrefix('hydration-')

  if (!settings.hydrationEnabled) return
  if ((await getPermissionStatus()) !== 'granted') return

  const from = parseTime(settings.hydrationActiveFrom)
  const to = parseTime(settings.hydrationActiveTo)
  const fromMins = from.hour * 60 + from.minute
  const toMins = to.hour * 60 + to.minute

  if (fromMins >= toMins) return // invalid range

  const MAX = 64
  let index = 0
  let current = fromMins

  while (current <= toMins && index < MAX) {
    const hour = Math.floor(current / 60)
    const minute = current % 60

    await Notifications.scheduleNotificationAsync({
      identifier: `hydration-${index}`,
      content: {
        title: 'Hydration 💧',
        body: hydrationMessage(index),
        data: { screen: 'home' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
        repeats: true,
      } as any,
    })

    current += settings.hydrationInterval
    index++
  }
}

// ─── Reschedule all ───────────────────────────────────────────────────────────

export async function rescheduleAll(
  settings: NotificationSettings,
  planDays?: WorkoutPlanDay[],
  lang: 'en' | 'fr' = 'en',
): Promise<void> {
  await Promise.all([
    rescheduleWorkoutNotifications(settings, planDays, lang),
    rescheduleMealNotifications(settings),
    rescheduleHydrationNotifications(settings),
  ])
}
