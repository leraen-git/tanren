import { Platform } from 'react-native'
import { FLAGS } from './flags'

const MEAL_HOURS: Record<string, number> = {
  breakfast: 8,
  lunch: 12,
  snack: 16,
  dinner: 20,
  dessert: 21,
}

type WidgetPayload = {
  nextSession: {
    title: string
    timeLabel: string
    muscleGroups: string | null
    templateId: string | null
  } | null
  nextMeal: {
    title: string
    kcalLabel: string
    mealType: string
    proteinG: number | null
    carbsG: number | null
    fatG: number | null
  } | null
  updatedAt?: string
}

type NextWorkout = {
  workoutName: string
  dayOfWeek: number
  workoutTemplateId?: string
  muscleGroups?: string[]
}

type DietMeal = {
  mealType: string
  name: string
  kcal: number
  proteinG?: number
  carbsG?: number
  fatG?: number
}

type DietDay = {
  dayNumber: number
  meals: DietMeal[]
}

const DAY_LABELS: Record<number, string> = {
  1: 'Lundi',
  2: 'Mardi',
  3: 'Mercredi',
  4: 'Jeudi',
  5: 'Vendredi',
  6: 'Samedi',
  7: 'Dimanche',
}

const MEAL_TYPE_FR: Record<string, string> = {
  breakfast: 'Petit-déj',
  lunch: 'Déjeuner',
  snack: 'Collation',
  dinner: 'Dîner',
  dessert: 'Dessert',
}

const MUSCLE_FR: Record<string, string> = {
  CHEST: 'Pecs',
  BACK: 'Dos',
  SHOULDERS: 'Épaules',
  BICEPS: 'Biceps',
  TRICEPS: 'Triceps',
  QUADRICEPS: 'Quadriceps',
  HAMSTRINGS: 'Ischio',
  GLUTES: 'Fessiers',
  CALVES: 'Mollets',
  CORE: 'Abdos',
  FULL_BODY: 'Full body',
}

function jsDowToUi(jsDow: number): number {
  return jsDow === 0 ? 7 : jsDow
}

function findNextMeal(meals: DietMeal[]): DietMeal | null {
  const hour = new Date().getHours()
  const sorted = [...meals].sort(
    (a, b) => (MEAL_HOURS[a.mealType] ?? 12) - (MEAL_HOURS[b.mealType] ?? 12),
  )
  const upcoming = sorted.find((m) => (MEAL_HOURS[m.mealType] ?? 12) > hour)
  return upcoming ?? sorted[0] ?? null
}

export function buildWidgetPayload(
  nextWorkout: NextWorkout | null | undefined,
  dietDays: DietDay[] | null | undefined,
): WidgetPayload {
  let nextSession: WidgetPayload['nextSession'] = null
  if (nextWorkout) {
    const todayUi = jsDowToUi(new Date().getDay())
    const isToday = nextWorkout.dayOfWeek === todayUi
    const timeLabel = isToday
      ? "Aujourd'hui"
      : DAY_LABELS[nextWorkout.dayOfWeek] ?? ''
    nextSession = {
      title: nextWorkout.workoutName,
      timeLabel,
      muscleGroups: nextWorkout.muscleGroups
        ?.map((g) => MUSCLE_FR[g] ?? g)
        .join(' · ') ?? null,
      templateId: nextWorkout.workoutTemplateId ?? null,
    }
  }

  let nextMeal: WidgetPayload['nextMeal'] = null
  if (dietDays?.length) {
    const todayUi = jsDowToUi(new Date().getDay())
    const todayDay = dietDays.find((d) => d.dayNumber === todayUi)
    if (todayDay?.meals?.length) {
      const meal = findNextMeal(todayDay.meals)
      if (meal) {
        nextMeal = {
          title: meal.name,
          kcalLabel: `${meal.kcal}`,
          mealType: MEAL_TYPE_FR[meal.mealType] ?? meal.mealType,
          proteinG: meal.proteinG ?? null,
          carbsG: meal.carbsG ?? null,
          fatG: meal.fatG ?? null,
        }
      }
    }
  }

  return { nextSession, nextMeal, updatedAt: new Date().toISOString() }
}

function formatMacrosLabel(p: number | null, c: number | null, f: number | null): string | null {
  if (p == null && c == null && f == null) return null
  return `P ${p ?? 0} · G ${c ?? 0} · L ${f ?? 0} g`
}

export async function syncWidget(
  nextWorkout: NextWorkout | null | undefined,
  dietDays: DietDay[] | null | undefined,
): Promise<void> {
  if (!FLAGS.WIDGET_ENABLED) return

  const payload = buildWidgetPayload(nextWorkout, dietDays)

  if (Platform.OS === 'ios') {
    try {
      const { requireNativeModule } = require('expo-modules-core')
      const ExtensionStorage = requireNativeModule('ExtensionStorage')
      ExtensionStorage.setObject('widgetPayload', payload, 'group.app.tanren.shared')
      ExtensionStorage.reloadWidget(null)
    } catch {}
  }

  if (Platform.OS === 'android') {
    try {
      const { storage } = require('./storage')
      const { WIDGET_PAYLOAD_KEY } = require('@/widgets/widgetPayload')
      const { renderWidgetByName } = require('@/widgets/renderWidget')
      const { requestWidgetUpdate } = require('react-native-android-widget')
      const { WIDGET_SESSION, WIDGET_MEAL, WIDGET_MEDIUM } = require('@/widgets/widgetPayload')

      const androidPayload = {
        session: payload.nextSession
          ? { title: payload.nextSession.title, dayLabel: payload.nextSession.timeLabel }
          : null,
        meal: payload.nextMeal
          ? {
              slot: payload.nextMeal.mealType,
              name: payload.nextMeal.title,
              kcalLabel: payload.nextMeal.kcalLabel,
              macrosLabel: formatMacrosLabel(
                payload.nextMeal.proteinG,
                payload.nextMeal.carbsG,
                payload.nextMeal.fatG,
              ) ?? '',
            }
          : null,
        updatedAt: payload.updatedAt ?? new Date().toISOString(),
      }

      storage.set(WIDGET_PAYLOAD_KEY, JSON.stringify(androidPayload))

      for (const widgetName of [WIDGET_SESSION, WIDGET_MEAL, WIDGET_MEDIUM]) {
        await requestWidgetUpdate({
          widgetName,
          renderWidget: () => renderWidgetByName(widgetName, androidPayload),
          widgetNotFound: () => {},
        }).catch(() => {})
      }
    } catch {}
  }
}
