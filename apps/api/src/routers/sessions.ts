import { z } from 'zod'
import { eq, and, desc } from 'drizzle-orm'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure } from '../trpc.js'
import { workoutSessions, sessionExercises, exerciseSets, users, personalRecords, workoutTemplates, workoutExercises } from '../db/schema.js'

async function resolveUser(db: any, clerkId: string) {
  const [user] = await db.select().from(users).where(eq(users.clerkId, clerkId)).limit(1)
  if (!user) throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' })
  return user
}

export const sessionsRouter = router({
  start: protectedProcedure
    .input(z.object({ workoutTemplateId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const user = await resolveUser(ctx.db, ctx.userId)
      const [session] = await ctx.db
        .insert(workoutSessions)
        .values({ userId: user.id, workoutTemplateId: input.workoutTemplateId })
        .returning()
      return session
    }),

  complete: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        durationSeconds: z.number().int().min(0),
        totalVolume: z.number().min(0),
        notes: z.string().max(1000).optional(),
        perceivedExertion: z.number().int().min(1).max(10).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const user = await resolveUser(ctx.db, ctx.userId)
      const { id, ...data } = input

      // Verify the session belongs to the authenticated user
      const [existing] = await ctx.db
        .select({ id: workoutSessions.id })
        .from(workoutSessions)
        .where(and(eq(workoutSessions.id, id), eq(workoutSessions.userId, user.id)))
        .limit(1)

      if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'Session not found' })

      const [updated] = await ctx.db
        .update(workoutSessions)
        .set({ ...data, completedAt: new Date() })
        .where(and(eq(workoutSessions.id, id), eq(workoutSessions.userId, user.id)))
        .returning()
      return updated
    }),

  byId: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const user = await resolveUser(ctx.db, ctx.userId)

      // Ownership check: session must belong to the requesting user
      const [session] = await ctx.db
        .select()
        .from(workoutSessions)
        .where(and(eq(workoutSessions.id, input.id), eq(workoutSessions.userId, user.id)))
        .limit(1)

      if (!session) throw new TRPCError({ code: 'NOT_FOUND', message: 'Session not found' })

      const exercises = await ctx.db
        .select()
        .from(sessionExercises)
        .where(eq(sessionExercises.workoutSessionId, input.id))

      const sets =
        exercises.length > 0
          ? await ctx.db
              .select()
              .from(exerciseSets)
              .where(eq(exerciseSets.sessionExerciseId, exercises[0]!.id))
          : []

      return { ...session, exercises, sets }
    }),

  // Save a full session with all exercise sets in one call
  save: protectedProcedure
    .input(
      z.object({
        workoutTemplateId: z.string(),
        startedAt: z.string(),
        durationSeconds: z.number().int().min(0),
        notes: z.string().optional(),
        perceivedExertion: z.number().int().min(1).max(10).optional(),
        exercises: z.array(
          z.object({
            exerciseId: z.string(),
            order: z.number().int(),
            sets: z.array(
              z.object({
                setNumber: z.number().int(),
                reps: z.number().int(),
                weight: z.number(),
                restSeconds: z.number().int(),
                isCompleted: z.boolean(),
              }),
            ),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const user = await resolveUser(ctx.db, ctx.userId)

      const completedSets = input.exercises.flatMap((e) => e.sets.filter((s) => s.isCompleted))
      const totalVolume = completedSets.reduce((sum, s) => sum + s.reps * s.weight, 0)

      // Insert session
      const [session] = await ctx.db
        .insert(workoutSessions)
        .values({
          userId: user.id,
          workoutTemplateId: input.workoutTemplateId,
          startedAt: new Date(input.startedAt),
          completedAt: new Date(),
          durationSeconds: input.durationSeconds,
          totalVolume,
          notes: input.notes,
          perceivedExertion: input.perceivedExertion,
        })
        .returning()

      // Insert session exercises + sets
      let newPRCount = 0
      for (const ex of input.exercises) {
        const [sessEx] = await ctx.db
          .insert(sessionExercises)
          .values({ workoutSessionId: session!.id, exerciseId: ex.exerciseId, order: ex.order })
          .returning()

        if (ex.sets.length > 0) {
          await ctx.db.insert(exerciseSets).values(
            ex.sets.map((s) => ({
              sessionExerciseId: sessEx!.id,
              setNumber: s.setNumber,
              reps: s.reps,
              weight: s.weight,
              restSeconds: s.restSeconds,
              isCompleted: s.isCompleted,
              completedAt: s.isCompleted ? new Date() : undefined,
            })),
          )
        }

        // Check and save personal record for this exercise
        const exerciseCompletedSets = ex.sets.filter((s) => s.isCompleted)
        if (exerciseCompletedSets.length === 0) continue

        const maxWeight = Math.max(...exerciseCompletedSets.map((s) => s.weight))
        const exVolume = exerciseCompletedSets.reduce((sum, s) => sum + s.reps * s.weight, 0)

        const [existingPR] = await ctx.db
          .select()
          .from(personalRecords)
          .where(and(eq(personalRecords.userId, user.id), eq(personalRecords.exerciseId, ex.exerciseId)))
          .orderBy(desc(personalRecords.weight))
          .limit(1)

        if (!existingPR || maxWeight > existingPR.weight) {
          await ctx.db.insert(personalRecords).values({
            userId: user.id,
            exerciseId: ex.exerciseId,
            weight: maxWeight,
            reps: exerciseCompletedSets.find((s) => s.weight === maxWeight)?.reps ?? 1,
            volume: exVolume,
            achievedAt: new Date(),
            sessionId: session!.id,
          })
          newPRCount++
        }
      }

      return { sessionId: session!.id, totalVolume, newPRCount }
    }),

  history: protectedProcedure
    .input(z.object({ limit: z.number().int().min(1).max(100).default(20), offset: z.number().int().min(0).default(0) }))
    .query(async ({ ctx, input }) => {
      const user = await resolveUser(ctx.db, ctx.userId)
      const rows = await ctx.db
        .select({
          id: workoutSessions.id,
          startedAt: workoutSessions.startedAt,
          completedAt: workoutSessions.completedAt,
          durationSeconds: workoutSessions.durationSeconds,
          totalVolume: workoutSessions.totalVolume,
          notes: workoutSessions.notes,
          workoutName: workoutTemplates.name,
          muscleGroups: workoutTemplates.muscleGroups,
        })
        .from(workoutSessions)
        .leftJoin(workoutTemplates, eq(workoutSessions.workoutTemplateId, workoutTemplates.id))
        .where(eq(workoutSessions.userId, user.id))
        .orderBy(desc(workoutSessions.startedAt))
        .limit(input.limit)
        .offset(input.offset)
      return rows
    }),

  // Quick session: creates a temporary workout template on the fly
  saveQuick: protectedProcedure
    .input(z.object({
      exerciseId: z.string(),
      exerciseName: z.string(),
      muscleGroups: z.array(z.string()),
      startedAt: z.string(),
      durationSeconds: z.number().int().min(0),
      sets: z.array(z.object({
        setNumber: z.number().int(),
        reps: z.number().int(),
        weight: z.number(),
        restSeconds: z.number().int(),
        isCompleted: z.boolean(),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      const user = await resolveUser(ctx.db, ctx.userId)

      // Create a throwaway template for this quick session
      const [template] = await ctx.db.insert(workoutTemplates).values({
        userId: user.id,
        name: input.exerciseName,
        muscleGroups: input.muscleGroups,
        estimatedDuration: Math.ceil(input.durationSeconds / 60),
        isTemplate: false,
      }).returning()

      await ctx.db.insert(workoutExercises).values({
        workoutTemplateId: template!.id,
        exerciseId: input.exerciseId,
        order: 0,
        defaultSets: input.sets.length,
        defaultReps: input.sets[0]?.reps ?? 10,
        defaultWeight: input.sets[0]?.weight ?? 0,
        defaultRestSeconds: input.sets[0]?.restSeconds ?? 90,
      })

      const completedSets = input.sets.filter((s) => s.isCompleted)
      const totalVolume = completedSets.reduce((sum, s) => sum + s.reps * s.weight, 0)

      const [session] = await ctx.db.insert(workoutSessions).values({
        userId: user.id,
        workoutTemplateId: template!.id,
        startedAt: new Date(input.startedAt),
        completedAt: new Date(),
        durationSeconds: input.durationSeconds,
        totalVolume,
      }).returning()

      const [sessEx] = await ctx.db.insert(sessionExercises).values({
        workoutSessionId: session!.id,
        exerciseId: input.exerciseId,
        order: 0,
      }).returning()

      if (input.sets.length > 0) {
        await ctx.db.insert(exerciseSets).values(
          input.sets.map((s) => ({
            sessionExerciseId: sessEx!.id,
            setNumber: s.setNumber,
            reps: s.reps,
            weight: s.weight,
            restSeconds: s.restSeconds,
            isCompleted: s.isCompleted,
            completedAt: s.isCompleted ? new Date() : undefined,
          }))
        )
      }

      // Check for PR
      const maxWeight = completedSets.length > 0 ? Math.max(...completedSets.map((s) => s.weight)) : 0
      if (maxWeight > 0) {
        const [existingPR] = await ctx.db
          .select()
          .from(personalRecords)
          .where(and(eq(personalRecords.userId, user.id), eq(personalRecords.exerciseId, input.exerciseId)))
          .orderBy(desc(personalRecords.weight))
          .limit(1)

        if (!existingPR || maxWeight > existingPR.weight) {
          await ctx.db.insert(personalRecords).values({
            userId: user.id,
            exerciseId: input.exerciseId,
            weight: maxWeight,
            reps: completedSets.find((s) => s.weight === maxWeight)?.reps ?? 1,
            volume: totalVolume,
            achievedAt: new Date(),
            sessionId: session!.id,
          })
        }
      }

      return { sessionId: session!.id, totalVolume }
    }),
})
