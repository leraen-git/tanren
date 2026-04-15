import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure, publicProcedure } from '../trpc.js'
import { exercises, users } from '../db/schema.js'

export const exercisesRouter = router({
  list: publicProcedure.query(async ({ ctx }) => {
    return ctx.db.select().from(exercises)
  }),

  byId: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const [exercise] = await ctx.db
        .select()
        .from(exercises)
        .where(eq(exercises.id, input.id))
        .limit(1)
      if (!exercise) throw new TRPCError({ code: 'NOT_FOUND', message: 'Exercise not found' })
      return exercise
    }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        muscleGroups: z.array(z.string()).default([]),
        equipment: z.array(z.string()).default([]),
        description: z.string().default(''),
        difficulty: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']).default('BEGINNER'),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [user] = await ctx.db.select().from(users).where(eq(users.clerkId, ctx.userId)).limit(1)
      if (!user) throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' })
      const [created] = await ctx.db
        .insert(exercises)
        .values({ ...input, isCustom: true, userId: user.id })
        .returning()
      return created
    }),
})
