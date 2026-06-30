/**
 * ADMIN ROUTER — every procedure MUST:
 *   1. Use `adminProcedure` (not `publicProcedure` or `protectedProcedure`)
 *   2. Call `recordAdminAction()` before returning, for every mutation
 *   3. Refuse to operate on the admin themselves where it would be self-destructive
 *      (e.g., admin cannot demote themselves, soft-delete themselves)
 *
 * Violations of these rules are P0 bugs.
 */

import { router } from '../../trpc.js'
import { healthRouter } from './health.js'
import { statsRouter } from './stats.js'
import { adminUsersRouter } from './users.js'
import { auditRouter } from './audit.js'
import { llmRouter } from './llm.js'

export const adminRouter = router({
  health: healthRouter,
  stats: statsRouter,
  users: adminUsersRouter,
  audit: auditRouter,
  llm: llmRouter,
})
