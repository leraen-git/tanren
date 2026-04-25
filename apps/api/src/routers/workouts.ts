import { z } from 'zod'
import { eq, and, desc, inArray, sql } from 'drizzle-orm'
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
        name: z.string().min(1).max(100),
        description: z.string().optional(),
        muscleGroups: z.array(z.string().max(50)).max(20).default([]),
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
        .values({ name: templateData.name, description: templateData.description, muscleGroups: templateData.muscleGroups, estimatedDuration: templateData.estimatedDuration, userId: user.id })
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
        muscleGroups: z.array(z.string().max(50)).max(20).optional(),
        estimatedDuration: z.number().int().optional(),
        exercises: z.array(z.object({
          exerciseId: z.string(),
          order: z.number().int().default(0),
          defaultSets: z.number().int().default(3),
          defaultReps: z.number().int().default(10),
          defaultWeight: z.number().default(0),
          defaultRestSeconds: z.number().int().default(90),
        })).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [user] = await ctx.db.select().from(users).where(eq(users.id, ctx.userId)).limit(1)
      if (!user) throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' })
      const { id, exercises: exInput, ...data } = input
      const [updated] = await ctx.db
        .update(workoutTemplates)
        .set(data)
        .where(and(eq(workoutTemplates.id, id), eq(workoutTemplates.userId, user.id)))
        .returning()
      if (!updated) throw new TRPCError({ code: 'NOT_FOUND', message: 'Workout not found' })
      if (exInput) {
        await ctx.db.delete(workoutExercises).where(eq(workoutExercises.workoutTemplateId, id))
        if (exInput.length > 0) {
          await ctx.db.insert(workoutExercises).values(
            exInput.map((ex, i) => ({
              workoutTemplateId: id,
              exerciseId: ex.exerciseId,
              order: ex.order ?? i,
              defaultSets: ex.defaultSets,
              defaultReps: ex.defaultReps,
              defaultWeight: ex.defaultWeight,
              defaultRestSeconds: ex.defaultRestSeconds,
            })),
          )
        }
      }
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
        orderedIds: z.array(z.string().max(50)).max(20),
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
          videoUrl: exercises.videoUrl,
        })
        .from(workoutExercises)
        .innerJoin(exercises, eq(workoutExercises.exerciseId, exercises.id))
        .where(eq(workoutExercises.workoutTemplateId, input.id))
        .orderBy(workoutExercises.order)

      // Batch: find previous sets for all exercises in 2 queries (not N×2)
      const exerciseIds = workoutExs.map(ex => ex.exerciseId)
      const previousSets: Record<string, { reps: number; weight: number }[]> = {}
      const prMap: Record<string, { weight: number; reps: number }> = {}

      if (exerciseIds.length > 0) {
        // 1) For each exerciseId, find the most recent sessionExercise row
        const latestSessionExs = await ctx.db
          .select({
            id: sessionExercises.id,
            exerciseId: sessionExercises.exerciseId,
            startedAt: workoutSessions.startedAt,
          })
          .from(sessionExercises)
          .innerJoin(workoutSessions, eq(sessionExercises.workoutSessionId, workoutSessions.id))
          .where(and(
            inArray(sessionExercises.exerciseId, exerciseIds),
            eq(workoutSessions.userId, user.id),
          ))
          .orderBy(desc(workoutSessions.startedAt))

        // Keep only the latest per exerciseId
        const latestByExercise = new Map<string, string>()
        for (const row of latestSessionExs) {
          if (!latestByExercise.has(row.exerciseId)) {
            latestByExercise.set(row.exerciseId, row.id)
          }
        }

        const sessExIds = [...latestByExercise.values()]
        if (sessExIds.length > 0) {
          const allPrevSets = await ctx.db
            .select({
              sessionExerciseId: exerciseSets.sessionExerciseId,
              reps: exerciseSets.reps,
              weight: exerciseSets.weight,
              setNumber: exerciseSets.setNumber,
            })
            .from(exerciseSets)
            .where(and(
              inArray(exerciseSets.sessionExerciseId, sessExIds),
              eq(exerciseSets.isCompleted, true),
            ))
            .orderBy(exerciseSets.setNumber)

          // Reverse lookup: sessionExerciseId → exerciseId
          const sessExToExercise = new Map<string, string>()
          for (const [exId, seId] of latestByExercise) {
            sessExToExercise.set(seId, exId)
          }

          for (const set of allPrevSets) {
            const exId = sessExToExercise.get(set.sessionExerciseId)
            if (!exId) continue
            const arr = previousSets[exId] ?? []
            arr.push({ reps: set.reps, weight: set.weight })
            previousSets[exId] = arr
          }
        }

        // 2) Batch PR lookup: best PR per exercise
        const allPRs = await ctx.db
          .select({
            exerciseId: personalRecords.exerciseId,
            weight: personalRecords.weight,
            reps: personalRecords.reps,
          })
          .from(personalRecords)
          .where(and(
            eq(personalRecords.userId, user.id),
            inArray(personalRecords.exerciseId, exerciseIds),
          ))
          .orderBy(desc(personalRecords.weight))

        for (const pr of allPRs) {
          if (!prMap[pr.exerciseId]) {
            prMap[pr.exerciseId] = { weight: pr.weight, reps: pr.reps }
          }
        }
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
