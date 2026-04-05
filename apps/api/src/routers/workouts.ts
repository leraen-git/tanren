import { z } from 'zod'
import { eq, and, desc } from 'drizzle-orm'
import { router, protectedProcedure } from '../trpc.js'
import { workoutTemplates, workoutExercises, exercises, users, workoutSessions, sessionExercises, exerciseSets } from '../db/schema.js'

export const workoutsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const [user] = await ctx.db.select().from(users).where(eq(users.clerkId, ctx.userId)).limit(1)
    if (!user) throw new Error('User not found')
    return ctx.db.select().from(workoutTemplates).where(eq(workoutTemplates.userId, user.id))
  }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        muscleGroups: z.array(z.string()).default([]),
        estimatedDuration: z.number().int().default(60),
        exercises: z.array(z.object({
          exerciseId: z.string(),
          order: z.number().int().default(0),
          defaultSets: z.number().int().default(3),
          defaultReps: z.number().int().default(10),
          defaultWeight: z.number().default(0),
          defaultRestSeconds: z.number().int().default(90),
        })).default([]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [user] = await ctx.db.select().from(users).where(eq(users.clerkId, ctx.userId)).limit(1)
      if (!user) throw new Error('User not found')
      const { exercises: exInput, ...templateData } = input
      const [created] = await ctx.db
        .insert(workoutTemplates)
        .values({ ...templateData, userId: user.id })
        .returning()
      if (exInput.length > 0) {
        await ctx.db.insert(workoutExercises).values(
          exInput.map((ex, i) => ({
            workoutTemplateId: created!.id,
            exerciseId: ex.exerciseId,
            order: ex.order ?? i,
            defaultSets: ex.defaultSets,
            defaultReps: ex.defaultReps,
            defaultWeight: ex.defaultWeight,
            defaultRestSeconds: ex.defaultRestSeconds,
          })),
        )
      }
      return created
    }),

  byId: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const [user] = await ctx.db.select().from(users).where(eq(users.clerkId, ctx.userId)).limit(1)
      if (!user) throw new Error('User not found')
      const [workout] = await ctx.db
        .select()
        .from(workoutTemplates)
        .where(and(eq(workoutTemplates.id, input.id), eq(workoutTemplates.userId, user.id)))
        .limit(1)
      if (!workout) throw new Error('Workout not found')
      const exercises = await ctx.db
        .select()
        .from(workoutExercises)
        .where(eq(workoutExercises.workoutTemplateId, input.id))
      return { ...workout, exercises }
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        muscleGroups: z.array(z.string()).optional(),
        estimatedDuration: z.number().int().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [user] = await ctx.db.select().from(users).where(eq(users.clerkId, ctx.userId)).limit(1)
      if (!user) throw new Error('User not found')
      const { id, ...data } = input
      const [updated] = await ctx.db
        .update(workoutTemplates)
        .set(data)
        .where(and(eq(workoutTemplates.id, id), eq(workoutTemplates.userId, user.id)))
        .returning()
      return updated
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const [user] = await ctx.db.select().from(users).where(eq(users.clerkId, ctx.userId)).limit(1)
      if (!user) throw new Error('User not found')
      await ctx.db
        .delete(workoutTemplates)
        .where(and(eq(workoutTemplates.id, input.id), eq(workoutTemplates.userId, user.id)))
      return { success: true }
    }),

  // Full workout detail: exercises + names + previous session weights per exercise
  detail: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const [user] = await ctx.db.select().from(users).where(eq(users.clerkId, ctx.userId)).limit(1)
      if (!user) throw new Error('User not found')

      const [template] = await ctx.db
        .select()
        .from(workoutTemplates)
        .where(and(eq(workoutTemplates.id, input.id), eq(workoutTemplates.userId, user.id)))
        .limit(1)
      if (!template) throw new Error('Workout not found')

      const workoutExs = await ctx.db
        .select({
          id: workoutExercises.id,
          exerciseId: workoutExercises.exerciseId,
          order: workoutExercises.order,
          defaultSets: workoutExercises.defaultSets,
          defaultReps: workoutExercises.defaultReps,
          defaultWeight: workoutExercises.defaultWeight,
          defaultRestSeconds: workoutExercises.defaultRestSeconds,
          notes: workoutExercises.notes,
          exerciseName: exercises.name,
          muscleGroups: exercises.muscleGroups,
          difficulty: exercises.difficulty,
        })
        .from(workoutExercises)
        .innerJoin(exercises, eq(workoutExercises.exerciseId, exercises.id))
        .where(eq(workoutExercises.workoutTemplateId, input.id))
        .orderBy(workoutExercises.order)

      // Find the most recent completed session for this template
      const [lastSession] = await ctx.db
        .select()
        .from(workoutSessions)
        .where(and(
          eq(workoutSessions.userId, user.id),
          eq(workoutSessions.workoutTemplateId, input.id),
        ))
        .orderBy(desc(workoutSessions.startedAt))
        .limit(1)

      // Get previous sets per exercise from that session
      const previousSets: Record<string, { reps: number; weight: number }[]> = {}
      if (lastSession) {
        const lastSessionExs = await ctx.db
          .select()
          .from(sessionExercises)
          .where(eq(sessionExercises.workoutSessionId, lastSession.id))

        for (const se of lastSessionExs) {
          const sets = await ctx.db
            .select()
            .from(exerciseSets)
            .where(eq(exerciseSets.sessionExerciseId, se.id))
            .orderBy(exerciseSets.setNumber)
          previousSets[se.exerciseId] = sets.map((s) => ({ reps: s.reps, weight: s.weight }))
        }
      }

      return {
        ...template,
        exercises: workoutExs.map((ex) => ({
          ...ex,
          previousSets: previousSets[ex.exerciseId] ?? [],
        })),
      }
    }),
})
