/**
 * ADMIN ROUTER — every procedure MUST:
 *   1. Use `adminProcedure` (not `publicProcedure` or `protectedProcedure`)
 *   2. Call `recordAdminAction()` before returning, for every mutation
 *   3. Refuse to operate on the admin themselves where it would be self-destructive
 */

import { z } from 'zod'
import { router, adminProcedure } from '../../trpc.js'
import { db } from '../../db/index.js'
import { users, workoutSessions, aiGenerationLog } from '../../db/schema.js'
import { eq, isNull, isNotNull, and, sql, desc, or } from 'drizzle-orm'
import { decryptUserFields, encryptUserFields } from '../../db/encryption.js'
import { deterministicHash } from '../../services/cryptoService.js'
import { recordAdminAction } from '../../services/auditLog.js'
import { TRPCError } from '@trpc/server'

export const adminUsersRouter = router({
  list: adminProcedure
    .input(
      z.object({
        cursor: z.string().optional(),
        limit: z.number().min(1).max(50).default(20),
        includeDeleted: z.boolean().default(false),
      }),
    )
    .query(async ({ input }) => {
      const conditions = input.includeDeleted ? undefined : isNull(users.deletedAt)

      const rows = await db
        .select({
          id: users.id,
          email: users.email,
          name: users.name,
          role: users.role,
          authProvider: users.authProvider,
          createdAt: users.createdAt,
          deletedAt: users.deletedAt,
          aiQuotaOverrides: users.aiQuotaOverrides,
        })
        .from(users)
        .where(conditions)
        .orderBy(desc(users.createdAt))
        .limit(input.limit + 1)

      const hasMore = rows.length > input.limit
      const items = rows.slice(0, input.limit).map((r) => decryptUserFields(r))

      return {
        items,
        nextCursor: hasMore ? items[items.length - 1]!.id : null,
      }
    }),

  search: adminProcedure
    .input(z.object({ query: z.string().min(1).max(200) }))
    .query(async ({ input }) => {
      const emailHash = deterministicHash(input.query.toLowerCase().trim())

      const rows = await db
        .select({
          id: users.id,
          email: users.email,
          name: users.name,
          role: users.role,
          authProvider: users.authProvider,
          createdAt: users.createdAt,
          deletedAt: users.deletedAt,
          aiQuotaOverrides: users.aiQuotaOverrides,
        })
        .from(users)
        .where(or(eq(users.emailHash, emailHash), sql`${users.name} ILIKE ${'%' + input.query + '%'}`))
        .limit(20)

      return rows.map((r) => decryptUserFields(r))
    }),

  get: adminProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input }) => {
      const [found] = await db.select().from(users).where(eq(users.id, input.userId)).limit(1)
      if (!found) throw new TRPCError({ code: 'NOT_FOUND' })

      const [sessionCount, lastSession, aiGenCount] = await Promise.all([
        db
          .select({ c: sql<number>`count(*)::int` })
          .from(workoutSessions)
          .where(eq(workoutSessions.userId, input.userId))
          .then((r) => r[0]?.c ?? 0),
        db
          .select({ startedAt: workoutSessions.startedAt })
          .from(workoutSessions)
          .where(eq(workoutSessions.userId, input.userId))
          .orderBy(desc(workoutSessions.startedAt))
          .limit(1)
          .then((r) => r[0]?.startedAt ?? null),
        db
          .select({ c: sql<number>`count(*)::int` })
          .from(aiGenerationLog)
          .where(eq(aiGenerationLog.userId, input.userId))
          .then((r) => r[0]?.c ?? 0),
      ])

      return {
        user: decryptUserFields(found),
        stats: {
          sessionCount,
          lastSessionAt: lastSession,
          aiGenerationCount: aiGenCount,
        },
      }
    }),

  softDelete: adminProcedure
    .input(
      z.object({
        userId: z.string(),
        reason: z.string().min(1).max(500),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      if (input.userId === ctx.user.id) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Tu ne peux pas supprimer ton propre compte admin via cette route.',
        })
      }

      const [target] = await db.select().from(users).where(eq(users.id, input.userId)).limit(1)
      if (!target) throw new TRPCError({ code: 'NOT_FOUND' })
      if (target.deletedAt) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Ce compte est déjà supprimé.' })

      const originalEmail = decryptUserFields({ email: target.email }).email
      const redacted = encryptUserFields({ email: `deleted-${input.userId}@tanren.deleted`, name: 'Compte supprimé' })

      await db
        .update(users)
        .set({
          deletedAt: new Date(),
          email: redacted.email!,
          emailHash: redacted.emailHash!,
          name: redacted.name!,
          avatarUrl: null,
        })
        .where(eq(users.id, input.userId))

      await recordAdminAction({
        adminUserId: ctx.user.id,
        action: 'user_soft_deleted',
        targetUserId: input.userId,
        payload: { reason: input.reason, originalEmail },
        request: ctx.req,
      })

      return { success: true }
    }),

  restore: adminProcedure
    .input(
      z.object({
        userId: z.string(),
        newEmail: z.string().email(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const [target] = await db.select().from(users).where(eq(users.id, input.userId)).limit(1)
      if (!target) throw new TRPCError({ code: 'NOT_FOUND' })
      if (!target.deletedAt) throw new TRPCError({ code: 'BAD_REQUEST', message: "Ce compte n'est pas supprimé." })

      const newHash = deterministicHash(input.newEmail)
      const [existing] = await db
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.emailHash, newHash), isNull(users.deletedAt)))
        .limit(1)
      if (existing) throw new TRPCError({ code: 'CONFLICT', message: 'Cet email est déjà utilisé.' })

      const encrypted = encryptUserFields({ email: input.newEmail })

      await db
        .update(users)
        .set({
          deletedAt: null,
          email: encrypted.email!,
          emailHash: encrypted.emailHash!,
        })
        .where(eq(users.id, input.userId))

      await recordAdminAction({
        adminUserId: ctx.user.id,
        action: 'user_restored',
        targetUserId: input.userId,
        payload: { restoredEmail: input.newEmail },
        request: ctx.req,
      })

      return { success: true }
    }),

  setQuotaOverrides: adminProcedure
    .input(
      z.object({
        userId: z.string(),
        overrides: z.object({
          unlimited: z.boolean().optional(),
          workoutsPerMonth: z.number().int().min(0).optional(),
          nutritionPerMonth: z.number().int().min(0).optional(),
          expiresAt: z.string().datetime().nullable().optional(),
        }),
        reason: z.string().min(1).max(500),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const [target] = await db.select({ id: users.id, aiQuotaOverrides: users.aiQuotaOverrides }).from(users).where(eq(users.id, input.userId)).limit(1)
      if (!target) throw new TRPCError({ code: 'NOT_FOUND' })

      await db.update(users).set({ aiQuotaOverrides: input.overrides }).where(eq(users.id, input.userId))

      await recordAdminAction({
        adminUserId: ctx.user.id,
        action: 'ai_quota_overridden',
        targetUserId: input.userId,
        payload: { previous: target.aiQuotaOverrides, new: input.overrides, reason: input.reason },
        request: ctx.req,
      })

      return { success: true }
    }),
})
