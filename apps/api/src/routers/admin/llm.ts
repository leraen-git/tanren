import { z } from 'zod'
import { router, adminProcedure } from '../../trpc.js'
import { db } from '../../db/index.js'
import { users } from '../../db/schema.js'
import { eq } from 'drizzle-orm'
import { ALLOWED_MODELS, resolveModelForUser } from '../../services/llmRouter.js'
import { recordAdminAction } from '../../services/auditLog.js'

export const llmRouter = router({
  getMyPreference: adminProcedure.query(async ({ ctx }) => ({
    preferred: ctx.user.preferredLlmModel ?? null,
    effective: resolveModelForUser({
      role: ctx.user.role,
      preferredModel: ctx.user.preferredLlmModel,
    }),
    allowed: ALLOWED_MODELS.admin as readonly string[],
  })),

  setMyPreference: adminProcedure
    .input(
      z.object({
        model: z.enum(ALLOWED_MODELS.admin).nullable(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      await db.update(users).set({ preferredLlmModel: input.model }).where(eq(users.id, ctx.user.id))

      await recordAdminAction({
        adminUserId: ctx.user.id,
        action: 'llm_model_changed',
        targetUserId: ctx.user.id,
        payload: { newModel: input.model },
        request: ctx.req,
      })

      return { success: true }
    }),
})
