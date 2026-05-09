import { db } from '../db/index.js'
import { adminAuditLog } from '../db/schema.js'
import type { FastifyRequest } from 'fastify'

type AuditAction =
  | 'role_changed'
  | 'user_soft_deleted'
  | 'user_restored'
  | 'ai_quota_overridden'
  | 'ai_quota_reset'
  | 'feature_flag_overridden'
  | 'llm_model_changed'

export async function recordAdminAction(input: {
  adminUserId: string
  action: AuditAction
  targetUserId?: string | null
  payload?: Record<string, unknown>
  request?: FastifyRequest
}): Promise<void> {
  await db.insert(adminAuditLog).values({
    adminUserId: input.adminUserId,
    action: input.action,
    targetUserId: input.targetUserId ?? null,
    payload: input.payload ?? {},
    ipAddress: input.request?.ip ?? null,
    userAgent: input.request?.headers['user-agent'] ?? null,
  })
}
