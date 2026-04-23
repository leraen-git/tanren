import { and, eq } from 'drizzle-orm'
import { dietRegenCredits } from '../db/schema.js'
import type { DB } from '../db/index.js'

export function getCurrentISOWeek(): string {
  const now = new Date()
  const tmp = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  tmp.setUTCDate(tmp.getUTCDate() + 4 - (tmp.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1))
  const weekNum = Math.ceil(((tmp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return `${tmp.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`
}

export function getNextMondayDate(): Date {
  const now = new Date()
  const day = now.getUTCDay()
  const daysUntilMonday = day === 0 ? 1 : 8 - day
  const monday = new Date(now)
  monday.setUTCDate(now.getUTCDate() + daysUntilMonday)
  monday.setUTCHours(0, 0, 0, 0)
  return monday
}

export async function getRegenCreditsForCurrentWeek(db: DB, userId: string) {
  const currentWeek = getCurrentISOWeek()
  const credits = await db
    .select()
    .from(dietRegenCredits)
    .where(and(
      eq(dietRegenCredits.userId, userId),
      eq(dietRegenCredits.isoWeek, currentWeek),
    ))

  const resetDate = getNextMondayDate()
  return {
    used: credits.length,
    remaining: Math.max(0, 2 - credits.length),
    total: 2,
    resetDate: resetDate.toISOString(),
    resetDateLabel: resetDate.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }),
  }
}
