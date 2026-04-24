import { trpc } from '../lib/trpc'

export function useActivePlan() {
  return trpc.plans.active.useQuery({ tzOffset: new Date().getTimezoneOffset() })
}

export type ActivePlan = NonNullable<ReturnType<typeof useActivePlan>['data']>
