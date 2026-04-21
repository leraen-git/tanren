import { z } from 'zod'
import { eq, and, desc } from 'drizzle-orm'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure } from '../trpc.js'
import { workoutTemplates, workoutExercises, exercises, users, workoutSessions, sessionExercises, exerciseSets, personalRecords } from '../db/schema.js'

export const workoutsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const [user] = await ctx.db.select().from(users).where(eq(users.id, ctx.userId)).limit(1)
    if (!user) throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' })
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
      const [user] = await ctx.db.select().from(users).where(eq(users.id, ctx.userId)).limit(1)
      if (!user) throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' })
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
      const [user] = await ctx.db.select().from(users).where(eq(users.id, ctx.userId)).limit(1)
      if (!user) throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' })
      const [workout] = await ctx.db
        .select()
        .from(workoutTemplates)
        .where(and(eq(workoutTemplates.id, input.id), eq(workoutTemplates.userId, user.id)))
        .limit(1)
      if (!workout) throw new TRPCError({ code: 'NOT_FOUND', message: 'Workout not found' })
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
      const [user] = await ctx.db.select().from(users).where(eq(users.id, ctx.userId)).limit(1)
      if (!user) throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' })
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
      const [user] = await ctx.db.select().from(users).where(eq(users.id, ctx.userId)).limit(1)
      if (!user) throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' })
      await ctx.db
        .delete(workoutTemplates)
        .where(and(eq(workoutTemplates.id, input.id), eq(workoutTemplates.userId, user.id)))
      return { success: true }
    }),

  reorderExercises: protectedProcedure
    .input(
      z.object({
        workoutTemplateId: z.string(),
        orderedIds: z.array(z.string()),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [user] = await ctx.db.select().from(users).where(eq(users.id, ctx.userId)).limit(1)
      if (!user) throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' })
      // Verify ownership
      const [template] = await ctx.db
        .select()
        .from(workoutTemplates)
        .where(and(eq(workoutTemplates.id, input.workoutTemplateId), eq(workoutTemplates.userId, user.id)))
        .limit(1)
      if (!template) throw new TRPCError({ code: 'NOT_FOUND', message: 'Workout not found' })
      // Update order for each exercise
      await Promise.all(
        input.orderedIds.map((exId, order) =>
          ctx.db
            .update(workoutExercises)
            .set({ order })
            .where(and(eq(workoutExercises.id, exId), eq(workoutExercises.workoutTemplateId, input.workoutTemplateId))),
        ),
      )
      return { success: true }
    }),

  // Full workout detail: exercises + names + previous session weights per exercise
  detail: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const [user] = await ctx.db.select().from(users).where(eq(users.id, ctx.userId)).limit(1)
      if (!user) throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' })

      const [template] = await ctx.db
        .select()
        .from(workoutTemplates)
        .where(and(eq(workoutTemplates.id, input.id), eq(workoutTemplates.userId, user.id)))
        .limit(1)
      if (!template) throw new TRPCError({ code: 'NOT_FOUND', message: 'Workout not found' })

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

      // For each exercise, find the last sets performed — across any session,
      // so weights carry over even when the user switches templates.
      const previousSets: Record<string, { reps: number; weight: number }[]> = {}
      for (const ex of workoutExs) {
        const [lastSessionEx] = await ctx.db
          .select({ id: sessionExercises.id })
          .from(sessionExercises)
          .innerJoin(workoutSessions, eq(sessionExercises.workoutSessionId, workoutSessions.id))
          .where(and(
            eq(sessionExercises.exerciseId, ex.exerciseId),
            eq(workoutSessions.userId, user.id),
          ))
          .orderBy(desc(workoutSessions.startedAt))
          .limit(1)

        if (lastSessionEx) {
          const sets = await ctx.db
            .select()
            .from(exerciseSets)
            .where(and(
              eq(exerciseSets.sessionExerciseId, lastSessionEx.id),
              eq(exerciseSets.isCompleted, true),
            ))
            .orderBy(exerciseSets.setNumber)
          if (sets.length > 0) {
            previousSets[ex.exerciseId] = sets.map((s) => ({ reps: s.reps, weight: s.weight }))
          }
        }
      }

      // Fetch current PR for each exercise
      const prMap: Record<string, { weight: number; reps: number }> = {}
      for (const ex of workoutExs) {
        const [pr] = await ctx.db
          .select({ weight: personalRecords.weight, reps: personalRecords.reps })
          .from(personalRecords)
          .where(and(eq(personalRecords.userId, user.id), eq(personalRecords.exerciseId, ex.exerciseId)))
          .orderBy(desc(personalRecords.weight))
          .limit(1)
        if (pr) prMap[ex.exerciseId] = pr
      }

      return {
        ...template,
        exercises: workoutExs.map((ex) => ({
          ...ex,
          previousSets: previousSets[ex.exerciseId] ?? [],
          prWeight: prMap[ex.exerciseId]?.weight ?? null,
          prReps: prMap[ex.exerciseId]?.reps ?? null,
        })),
      }
    }),
})
