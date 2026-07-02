import { useEffect, useRef } from 'react'
import { AppState, Platform, type AppStateStatus } from 'react-native'
import { useActivePlan } from '@/data/useActivePlan'
import { useDietPlan } from '@/data/useDietPlan'
import { syncWidget } from '@/lib/widgetBridge'
import { FLAGS } from '@/lib/flags'

export function WidgetSyncWatcher() {
  if (Platform.OS !== 'ios' || !FLAGS.WIDGET_ENABLED) return null
  return <WidgetSyncInner />
}

function WidgetSyncInner() {
  const { data: activePlan } = useActivePlan()
  const { data: dietPlan } = useDietPlan()
  const lastHash = useRef('')

  const nextWorkout = activePlan?.stats?.nextWorkout ?? null
  const dietDays = (dietPlan as any)?.days ?? null

  useEffect(() => {
    const hash = JSON.stringify({ n: nextWorkout?.workoutName, d: nextWorkout?.dayOfWeek, dm: dietDays?.length })
    if (hash === lastHash.current) return
    lastHash.current = hash
    syncWidget(nextWorkout as any, dietDays)
  }, [nextWorkout, dietDays])

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') {
        syncWidget(nextWorkout as any, dietDays)
      }
    })
    return () => sub.remove()
  }, [nextWorkout, dietDays])

  return null
}
