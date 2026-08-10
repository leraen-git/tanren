import type { SetConfig, SessionExercise } from '@/stores/activeSessionStore'

export function getGroupBounds(exercises: SessionExercise[], idx: number) {
  const gid = exercises[idx]?.supersetGroupId ?? null
  if (!gid) return { start: idx, end: idx }
  let start = idx
  let end = idx
  while (start - 1 >= 0 && exercises[start - 1]!.supersetGroupId === gid) start--
  while (end + 1 < exercises.length && exercises[end + 1]!.supersetGroupId === gid) end++
  return { start, end }
}

export type Step = { exerciseIndex: number; setIndex: number }

export function computeNextStep(
  exercises: SessionExercise[],
  exIdx: number,
  setIdx: number,
): Step | null {
  const { start, end } = getGroupBounds(exercises, exIdx)

  // Standalone — preserve existing behavior exactly
  if (start === end) {
    const ex = exercises[exIdx]!
    const next = ex.sets.findIndex((s, i) => i > setIdx && !s.isCompleted)
    if (next !== -1) return { exerciseIndex: exIdx, setIndex: next }
    const anyIncomplete = ex.sets.findIndex((s) => !s.isCompleted)
    if (anyIncomplete !== -1) return { exerciseIndex: exIdx, setIndex: anyIncomplete }
    return null
  }

  // Superset: round = setIdx (set index within a member)
  const round = setIdx

  // 1) Next member in the same round
  for (let m = exIdx + 1; m <= end; m++) {
    if (exercises[m]!.sets[round] && !exercises[m]!.sets[round]!.isCompleted)
      return { exerciseIndex: m, setIndex: round }
  }

  // 2) Next round, first available member
  const maxRounds = Math.max(...exercises.slice(start, end + 1).map((e) => e.sets.length))
  for (let r = round + 1; r < maxRounds; r++) {
    for (let m = start; m <= end; m++) {
      if (exercises[m]!.sets[r] && !exercises[m]!.sets[r]!.isCompleted)
        return { exerciseIndex: m, setIndex: r }
    }
  }

  // 3) Group complete
  return null
}

export function isLastMemberOfRound(
  exercises: SessionExercise[],
  exIdx: number,
  setIdx: number,
): boolean {
  const { start, end } = getGroupBounds(exercises, exIdx)
  if (start === end) return false
  for (let m = exIdx + 1; m <= end; m++) {
    if (exercises[m]!.sets[setIdx] && !exercises[m]!.sets[setIdx]!.isCompleted) return false
  }
  return true
}

export function getSupersetRoundInfo(
  exercises: SessionExercise[],
  exIdx: number,
  setIdx: number,
): { currentRound: number; totalRounds: number } | null {
  const { start, end } = getGroupBounds(exercises, exIdx)
  if (start === end) return null
  const maxRounds = Math.max(...exercises.slice(start, end + 1).map((e) => e.sets.length))
  return { currentRound: setIdx + 1, totalRounds: maxRounds }
}

export function getRestTimerLabel(
  exercises: SessionExercise[],
  exIdx: number,
  setIdx: number,
): { label: string; isRoundRest: boolean } {
  const { start, end } = getGroupBounds(exercises, exIdx)
  const currentEx = exercises[exIdx]!

  if (start === end) {
    return { label: currentEx.exerciseName, isRoundRest: false }
  }

  const lastMember = isLastMemberOfRound(exercises, exIdx, setIdx)
  if (lastMember) {
    return { label: 'SUPERSET · FIN DU TOUR', isRoundRest: true }
  }

  const nextStep = computeNextStep(exercises, exIdx, setIdx)
  if (nextStep) {
    const nextName = exercises[nextStep.exerciseIndex]!.exerciseName
    return { label: `TRANSITION → ${nextName}`, isRoundRest: false }
  }

  return { label: currentEx.exerciseName, isRoundRest: false }
}

export function getValidateButtonLabel(
  exercises: SessionExercise[],
  exIdx: number,
  setIdx: number,
  t: (key: string, opts?: Record<string, unknown>) => string,
): string {
  const { start, end } = getGroupBounds(exercises, exIdx)

  if (start === end) {
    return `${t('workout.validateSet')} ${setIdx + 1}`
  }

  const lastMember = isLastMemberOfRound(exercises, exIdx, setIdx)
  if (lastMember) {
    return t('workout.validateRoundRest')
  }

  const nextStep = computeNextStep(exercises, exIdx, setIdx)
  if (nextStep) {
    const nextName = exercises[nextStep.exerciseIndex]!.exerciseName
    return `${t('workout.validateTransition')} ${nextName}`
  }

  return `${t('workout.validateSet')} ${setIdx + 1}`
}
