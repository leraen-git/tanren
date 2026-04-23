const MEAL_ORDER: Record<string, number> = {
  breakfast: 0,
  lunch: 1,
  snack: 2,
  dinner: 3,
  dessert: 4,
}

const SNACK_AM_KEYWORDS = ['mid-morning', 'mid morning', 'morning snack', 'pre-workout', 'pre workout', 'pre-lunch', 'mid-matin']
const SNACK_PM_KEYWORDS = ['afternoon', 'après-midi', 'evening snack', 'pre-dinner', 'post-workout', 'post workout', 'post-lunch']
const SNACK_KEYWORDS = [...SNACK_AM_KEYWORDS, ...SNACK_PM_KEYWORDS, 'snack', 'collation']

function getSnackSortOrder(name: string): number {
  const lower = name.toLowerCase()
  if (SNACK_AM_KEYWORDS.some((k) => lower.includes(k))) return 0.5
  return 2
}

export function sortMeals<T extends { type: string; name: string }>(meals: T[]): T[] {
  const typeCounts: Record<string, number> = {}
  for (const m of meals) typeCounts[m.type] = (typeCounts[m.type] ?? 0) + 1

  const normalized = meals.map((m) => {
    if ((typeCounts[m.type] ?? 0) > 1) {
      const lower = m.name.toLowerCase()
      if (SNACK_KEYWORDS.some((k) => lower.includes(k))) return { ...m, type: 'snack' }
    }
    return m
  })

  return normalized.sort((a, b) => {
    const aOrd = a.type === 'snack' ? getSnackSortOrder(a.name) : (MEAL_ORDER[a.type] ?? 9)
    const bOrd = b.type === 'snack' ? getSnackSortOrder(b.name) : (MEAL_ORDER[b.type] ?? 9)
    return aOrd - bOrd
  })
}
