import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure } from '../trpc.js'
import { exercises, users } from '../db/schema.js'

export const exercisesRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.select().from(exercises)
  }),

  byId: protectedProcedure
    .input(z.object({ id: z.string().max(200) }))
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
        name: z.string().min(1).max(100),
        muscleGroups: z.array(z.string().max(50)).max(20).default([]),
        equipment: z.array(z.string().max(50)).max(20).default([]),
        description: z.string().max(2000).default(''),
        difficulty: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']).default('BEGINNER'),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [user] = await ctx.db.select().from(users).where(eq(users.id, ctx.userId)).limit(1)
      if (!user) throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' })
      const [created] = await ctx.db
        .insert(exercises)
        .values({ name: input.name, description: input.description, muscleGroups: input.muscleGroups, equipment: input.equipment, difficulty: input.difficulty, isCustom: true, userId: user.id })
        .returning()
      return created
    }),
})
