import type { UserRole } from '../db/schema.js'

export const ALLOWED_MODELS = {
  user: ['claude-sonnet-4-6'] as const,
  admin: ['claude-opus-4-7', 'claude-sonnet-4-6', 'claude-haiku-4-5-20251001'] as const,
} as const

export type ModelChoice = (typeof ALLOWED_MODELS.user)[number] | (typeof ALLOWED_MODELS.admin)[number]

const DEFAULT_MODEL: ModelChoice = 'claude-sonnet-4-6'

export function resolveModelForUser(input: {
  role: UserRole
  preferredModel?: string | null
}): ModelChoice {
  const allowed = ALLOWED_MODELS[input.role] as readonly string[]

  if (input.preferredModel && allowed.includes(input.preferredModel)) {
    return input.preferredModel as ModelChoice
  }

  return DEFAULT_MODEL
}
