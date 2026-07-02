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
          kcalLabel: `${meal.kcal} kcal`,
          mealType: MEAL_TYPE_FR[meal.mealType] ?? meal.mealType,
        }
      }
    }
  }

  return { nextSession, nextMeal, updatedAt: new Date().toISOString() }
}

export async function syncWidget(
  nextWorkout: NextWorkout | null | undefined,
  dietDays: DietDay[] | null | undefined,
): Promise<void> {
  if (Platform.OS !== 'ios' || !FLAGS.WIDGET_ENABLED) return

  try {
    const { setWidgetData, reloadWidgets } = await import(
      '../../modules/widget-bridge/src/index'
    )
    const payload = buildWidgetPayload(nextWorkout, dietDays)
    setWidgetData(JSON.stringify(payload))
    reloadWidgets()
  } catch {}
}
