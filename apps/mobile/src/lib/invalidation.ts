import { trpc } from './trpc'

export function useInvalidateUserProfile() {
  const utils = trpc.useUtils()
  return () => {
    utils.auth.me.invalidate()
    utils.plans.active.invalidate()
  }
}

export function useInvalidateWeight() {
  const utils = trpc.useUtils()
  return () => {
    utils.auth.me.invalidate()
    utils.weight.list.invalidate()
  }
}

export function useInvalidateActivePlan() {
  const utils = trpc.useUtils()
  return () => {
    utils.plans.active.invalidate()
    utils.plans.list.invalidate()
  }
}

export function useInvalidateWorkouts() {
  const utils = trpc.useUtils()
  return () => {
    utils.workouts.list.invalidate()
    utils.plans.active.invalidate()
  }
}

export function useInvalidateSessions() {
  const utils = trpc.useUtils()
  return () => {
    utils.sessions.history.invalidate()
    utils.plans.active.invalidate()
    utils.progress.records.invalidate()
  }
}

export function useInvalidateDiet() {
  const utils = trpc.useUtils()
  return () => {
    utils.diet.getMyPlanV2.invalidate()
  }
}
