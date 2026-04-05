import { z } from 'zod'
import { eq, inArray } from 'drizzle-orm'
import { router, protectedProcedure, publicProcedure } from '../trpc.js'
import { users, personalRecords, workoutSessions, sessionExercises, exerciseSets, workoutPlans, workoutTemplates, workoutExercises, programEnrollments } from '../db/schema.js'

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

      await ctx.db.transaction(async (tx) => {
        // Collect session IDs
        const userSessions = await tx.select({ id: workoutSessions.id }).from(workoutSessions).where(eq(workoutSessions.userId, user.id))
        const sessionIds = userSessions.map((s) => s.id)

        if (sessionIds.length > 0) {
          // Collect session exercise IDs
          const sessExs = await tx.select({ id: sessionExercises.id }).from(sessionExercises).where(inArray(sessionExercises.workoutSessionId, sessionIds))
          const sessExIds = sessExs.map((e) => e.id)
          if (sessExIds.length > 0) {
            await tx.delete(exerciseSets).where(inArray(exerciseSets.sessionExerciseId, sessExIds))
          }
          await tx.delete(sessionExercises).where(inArray(sessionExercises.workoutSessionId, sessionIds))
        }

        await tx.delete(personalRecords).where(eq(personalRecords.userId, user.id))
        await tx.delete(workoutSessions).where(eq(workoutSessions.userId, user.id))
        // workout_plan_days cascade from workout_plans
        await tx.delete(workoutPlans).where(eq(workoutPlans.userId, user.id))

        const templates = await tx.select({ id: workoutTemplates.id }).from(workoutTemplates).where(eq(workoutTemplates.userId, user.id))
        const templateIds = templates.map((t) => t.id)
        if (templateIds.length > 0) {
          await tx.delete(workoutExercises).where(inArray(workoutExercises.workoutTemplateId, templateIds))
        }
        await tx.delete(workoutTemplates).where(eq(workoutTemplates.userId, user.id))
        await tx.delete(programEnrollments).where(eq(programEnrollments.userId, user.id))
        await tx.delete(users).where(eq(users.id, user.id))
      })

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
