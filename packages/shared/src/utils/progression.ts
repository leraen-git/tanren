import type { ExerciseStatus, Trend } from '../types.js'
import { PROGRESSION_THRESHOLD } from '../constants.js'

// ─── Volume calculations ──────────────────────────────────────────────────────

export function calcSetVolume(reps: number, weight: number): number {
  return reps * weight
}

export function calcExerciseVolume(sets: Array<{ reps: number; weight: number; isCompleted: boolean }>): number {
  return sets
    .filter((s) => s.isCompleted)
    .reduce((sum, s) => sum + calcSetVolume(s.reps, s.weight), 0)
}

export function calcSessionVolume(
  exercises: Array<{ sets: Array<{ reps: number; weight: number; isCompleted: boolean }> }>,
): number {
  return exercises.reduce((sum, e) => sum + calcExerciseVolume(e.sets), 0)
}

// ─── Progression delta ────────────────────────────────────────────────────────

export function calcDelta(current: number, previous: number): number {
  if (previous === 0) return 0
  return (current - previous) / previous
}

export function getExerciseStatus(delta: number): ExerciseStatus {
  if (delta > PROGRESSION_THRESHOLD) return 'improved'
  if (delta < -PROGRESSION_THRESHOLD) return 'declined'
  return 'stable'
}

// ─── Coaching rule engine ─────────────────────────────────────────────────────

export function getTrend(last5sessions: number[]): Trend {
  if (last5sessions.length < 3) return 'plateauing'
  const recent = last5sessions.slice(-3)
  const allImproving = recent.every((v, i) => i === 0 || v > (recent[i - 1] ?? 0))
  const allDeclining = recent.every((v, i) => i === 0 || v < (recent[i - 1] ?? 0))
  if (allImproving) return 'improving'
  if (allDeclining) return 'declining'
  return 'plateauing'
}

export function getCoachingTip(
  exerciseName: string,
  trend: Trend,
  currentMax: number,
): string {
  switch (trend) {
    case 'improving':
      return `Great progress on ${exerciseName}! Consider adding ${currentMax < 100 ? 2.5 : 5}kg next session.`
    case 'plateauing':
      return `You've plateaued on ${exerciseName}. Try a deload week or switch to a variation.`
    case 'declining':
      return `Performance on ${exerciseName} has dropped. Check your recovery, sleep, and nutrition.`
  }
}
