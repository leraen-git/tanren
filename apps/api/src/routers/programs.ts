import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure, publicProcedure } from '../trpc.js'
import { programs, programEnrollments, users } from '../db/schema.js'

export const programsRouter = router({
  list: publicProcedure.query(async ({ ctx }) => {
    return ctx.db.select().from(programs)
  }),

  byId: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const [program] = await ctx.db
        .select()
        .from(programs)
        .where(eq(programs.id, input.id))
        .limit(1)
      if (!program) throw new TRPCError({ code: 'NOT_FOUND', message: 'Program not found' })
      return program
    }),

  enroll: protectedProcedure
    .input(z.object({ programId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const [user] = await ctx.db.select().from(users).where(eq(users.clerkId, ctx.userId)).limit(1)
      if (!user) throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' })
      const [enrollment] = await ctx.db
        .insert(programEnrollments)
        .values({ userId: user.id, programId: input.programId })
        .returning()
      return enrollment
    }),
})
