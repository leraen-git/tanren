export const FLAGS = {
  HEALTH_SYNC_ENABLED: false,
  AI_PLAN_GENERATOR: true,
  DIET_TAB: true,
  EXPORT_DATA: false,
} as const

export function useFeatureFlag(flag: keyof typeof FLAGS): boolean {
  return FLAGS[flag]
}
