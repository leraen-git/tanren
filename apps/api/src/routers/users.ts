import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { router, protectedProcedure, publicProcedure } from '../trpc.js'
import { users } from '../db/schema.js'

export const usersRouter = router({
  sync: publicProcedure
    .input(
      z.object({
        clerkId: z.string(),
        name: z.string(),
        email: z.string().email(),
        avatarUrl: z.string().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db
        .select()
        .from(users)
        .where(eq(users.clerkId, input.clerkId))
        .limit(1)

      if (existing[0]) {
        const [updated] = await ctx.db
          .update(users)
          .set({ name: input.name, email: input.email, avatarUrl: input.avatarUrl ?? null, updatedAt: new Date() })
          .where(eq(users.clerkId, input.clerkId))
          .returning()
        return updated
      }

      const [created] = await ctx.db.insert(users).values({
        clerkId: input.clerkId,
        name: input.name,
        email: input.email,
        avatarUrl: input.avatarUrl ?? null,
      }).returning()
      return created
    }),

  me: protectedProcedure.query(async ({ ctx }) => {
    const [user] = await ctx.db
      .select()
      .from(users)
      .where(eq(users.clerkId, ctx.userId))
      .limit(1)
    if (user) return user
    // Auto-create user row if missing (e.g. after account deletion in dev)
    const [created] = await ctx.db.insert(users).values({
      clerkId: ctx.userId,
      name: 'New User',
      email: `${ctx.userId}@fittrack.app`,
    }).returning()
    return created!
  }),

  deleteMe: protectedProcedure
    .mutation(async ({ ctx }) => {
      const [user] = await ctx.db.select().from(users).where(eq(users.clerkId, ctx.userId)).limit(1)
      if (!user) return { success: true }

      ctx.req.log.warn(
        { event: 'account_delete', userId: user.id, clerkId: user.clerkId },
        'User account deleted',
      )

      // All child records cascade automatically via DB FK constraints.
      await ctx.db.delete(users).where(eq(users.id, user.id))
      return { success: true }
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
      const [updated] = await ctx.db
        .update(users)
        .set({ ...input, updatedAt: new Date() })
        .where(eq(users.clerkId, ctx.userId))
        .returning()
      return updated
    }),
})
