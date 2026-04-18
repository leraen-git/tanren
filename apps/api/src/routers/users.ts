import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure } from '../trpc.js'
import { users } from '../db/schema.js'
import { encryptUserFields, decryptUserFields } from '../db/encryption.js'

export const usersRouter = router({
  me: protectedProcedure.query(async ({ ctx }) => {
    const [user] = await ctx.db
      .select()
      .from(users)
      .where(eq(users.id, ctx.userId))
      .limit(1)
    if (!user) throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' })
    return decryptUserFields(user)
  }),

  updateMe: protectedProcedure
    .input(
      z.object({
        name: z.string().optional(),
        email: z.string().email().optional(),
        level: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']).optional(),
        goal: z.enum(['WEIGHT_LOSS', 'MUSCLE_GAIN', 'MAINTENANCE']).optional(),
        weeklyTarget: z.number().int().min(1).max(7).optional(),
        heightCm: z.number().min(50).max(300).nullable().optional(),
        weightKg: z.number().min(20).max(500).nullable().optional(),
        gender: z.enum(['male', 'female']).nullable().optional(),
        onboardingDone: z.boolean().optional(),
        avatarUrl: z.string().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { name, email, ...rest } = input
      const encryptedPii = encryptUserFields({ name, email })
      const [updated] = await ctx.db
        .update(users)
        .set({ ...rest, ...encryptedPii, updatedAt: new Date() })
        .where(eq(users.id, ctx.userId))
        .returning()
      if (!updated) throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' })
      return decryptUserFields(updated)
    }),

  deleteMe: protectedProcedure.mutation(async ({ ctx }) => {
    const [user] = await ctx.db
      .select()
      .from(users)
      .where(eq(users.id, ctx.userId))
      .limit(1)
    if (!user) return { success: true }

    ctx.req.log.warn(
      { event: 'account_delete', userId: user.id },
      'User account deleted',
    )

    // All child records cascade via DB FK ON DELETE CASCADE
    await ctx.db.delete(users).where(eq(users.id, user.id))
    return { success: true }
  }),
})
