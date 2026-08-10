import { describe, it, expect } from 'vitest'
import { getGroupBounds, computeNextStep, isLastMemberOfRound, getSupersetRoundInfo } from './superset'
import type { SessionExercise } from '@/stores/activeSessionStore'

function makeExercise(id: string, setCount: number, supersetGroupId?: string | null): SessionExercise {
  return {
    exerciseId: id,
    exerciseName: id,
    defaultSets: setCount,
    defaultReps: 10,
    defaultWeight: 50,
    defaultRestSeconds: 90,
    supersetGroupId: supersetGroupId ?? null,
    sets: Array.from({ length: setCount }, () => ({
      reps: 10,
      weight: 50,
      restSeconds: supersetGroupId ? 15 : 90,
      isCompleted: false,
    })),
  }
}

describe('getGroupBounds', () => {
  it('returns same index for standalone', () => {
    const exercises = [makeExercise('A', 3), makeExercise('B', 3)]
    expect(getGroupBounds(exercises, 0)).toEqual({ start: 0, end: 0 })
    expect(getGroupBounds(exercises, 1)).toEqual({ start: 1, end: 1 })
  })

  it('returns group range for superset', () => {
    const exercises = [
      makeExercise('A', 3, 'g1'),
      makeExercise('B', 3, 'g1'),
      makeExercise('C', 3),
    ]
    expect(getGroupBounds(exercises, 0)).toEqual({ start: 0, end: 1 })
    expect(getGroupBounds(exercises, 1)).toEqual({ start: 0, end: 1 })
    expect(getGroupBounds(exercises, 2)).toEqual({ start: 2, end: 2 })
  })

  it('handles 3-member group', () => {
    const exercises = [
      makeExercise('A', 3, 'g1'),
      makeExercise('B', 3, 'g1'),
      makeExercise('C', 3, 'g1'),
    ]
    expect(getGroupBounds(exercises, 1)).toEqual({ start: 0, end: 2 })
  })
})

describe('computeNextStep — standalone', () => {
  it('advances to next incomplete set', () => {
    const exercises = [makeExercise('A', 3)]
    expect(computeNextStep(exercises, 0, 0)).toEqual({ exerciseIndex: 0, setIndex: 1 })
  })

  it('returns null when all sets done', () => {
    const exercises = [makeExercise('A', 3)]
    exercises[0]!.sets.forEach((s) => (s.isCompleted = true))
    expect(computeNextStep(exercises, 0, 2)).toBeNull()
  })

  it('skips already completed sets', () => {
    const exercises = [makeExercise('A', 3)]
    exercises[0]!.sets[1]!.isCompleted = true
    expect(computeNextStep(exercises, 0, 0)).toEqual({ exerciseIndex: 0, setIndex: 2 })
  })
})

describe('computeNextStep — 2-member superset', () => {
  it('goes A0 → B0 (same round, next member)', () => {
    const exercises = [
      makeExercise('A', 3, 'g1'),
      makeExercise('B', 3, 'g1'),
    ]
    expect(computeNextStep(exercises, 0, 0)).toEqual({ exerciseIndex: 1, setIndex: 0 })
  })

  it('goes B0 → A1 (end of round, next round)', () => {
    const exercises = [
      makeExercise('A', 3, 'g1'),
      makeExercise('B', 3, 'g1'),
    ]
    expect(computeNextStep(exercises, 1, 0)).toEqual({ exerciseIndex: 0, setIndex: 1 })
  })

  it('full flow: A0→B0→A1→B1→A2→B2→null', () => {
    const exercises = [
      makeExercise('A', 3, 'g1'),
      makeExercise('B', 3, 'g1'),
    ]
    const steps: Array<{ exerciseIndex: number; setIndex: number } | null> = []
    let step = computeNextStep(exercises, 0, 0)
    while (step) {
      exercises[step.exerciseIndex]!.sets[step.setIndex]!.isCompleted = true
      const prev = step
      step = computeNextStep(exercises, prev.exerciseIndex, prev.setIndex)
      steps.push(step)
    }
    expect(steps[steps.length - 1]).toBeNull()
  })
})

describe('computeNextStep — unequal sets', () => {
  it('skips member with fewer sets in later rounds', () => {
    const exercises = [
      makeExercise('A', 3, 'g1'),
      makeExercise('B', 2, 'g1'),
    ]
    // At B's last set (index 1), next round should go to A(2) since B has no set at index 2
    exercises[0]!.sets[0]!.isCompleted = true
    exercises[1]!.sets[0]!.isCompleted = true
    exercises[0]!.sets[1]!.isCompleted = true

    const step = computeNextStep(exercises, 1, 1)
    expect(step).toEqual({ exerciseIndex: 0, setIndex: 2 })
  })
})

describe('computeNextStep — 3-member group', () => {
  it('goes A0→B0→C0→A1→...', () => {
    const exercises = [
      makeExercise('A', 2, 'g1'),
      makeExercise('B', 2, 'g1'),
      makeExercise('C', 2, 'g1'),
    ]
    expect(computeNextStep(exercises, 0, 0)).toEqual({ exerciseIndex: 1, setIndex: 0 })
    expect(computeNextStep(exercises, 1, 0)).toEqual({ exerciseIndex: 2, setIndex: 0 })
    expect(computeNextStep(exercises, 2, 0)).toEqual({ exerciseIndex: 0, setIndex: 1 })
  })
})

describe('isLastMemberOfRound', () => {
  it('returns false for standalone', () => {
    const exercises = [makeExercise('A', 3)]
    expect(isLastMemberOfRound(exercises, 0, 0)).toBe(false)
  })

  it('returns false for first member', () => {
    const exercises = [
      makeExercise('A', 3, 'g1'),
      makeExercise('B', 3, 'g1'),
    ]
    expect(isLastMemberOfRound(exercises, 0, 0)).toBe(false)
  })

  it('returns true for last member', () => {
    const exercises = [
      makeExercise('A', 3, 'g1'),
      makeExercise('B', 3, 'g1'),
    ]
    expect(isLastMemberOfRound(exercises, 1, 0)).toBe(true)
  })
})

describe('getSupersetRoundInfo', () => {
  it('returns null for standalone', () => {
    const exercises = [makeExercise('A', 3)]
    expect(getSupersetRoundInfo(exercises, 0, 0)).toBeNull()
  })

  it('returns round info for superset', () => {
    const exercises = [
      makeExercise('A', 3, 'g1'),
      makeExercise('B', 3, 'g1'),
    ]
    expect(getSupersetRoundInfo(exercises, 0, 0)).toEqual({ currentRound: 1, totalRounds: 3 })
    expect(getSupersetRoundInfo(exercises, 1, 2)).toEqual({ currentRound: 3, totalRounds: 3 })
  })
})
