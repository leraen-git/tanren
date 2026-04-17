import { z } from 'zod'
import { eq, and, desc, gte, inArray } from 'drizzle-orm'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure } from '../trpc.js'
import {
  workoutSessions,
  sessionExercises,
  exerciseSets,
  personalRecords,
  users,
} from '../db/schema.js'
import { calcDelta, getExerciseStatus } from '@tanren/shared'

export const progressRouter = router({
  lastSessionPRCount: protectedProcedure.query(async ({ ctx }) => {
    const [user] = await ctx.db.select().from(users).where(eq(users.id, ctx.userId)).limit(1)
    if (!user) throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' })
    const [lastSession] = await ctx.db
      .select({ id: workoutSessions.id })
      .from(workoutSessions)
      .where(eq(workoutSessions.userId, user.id))
      .orderBy(desc(workoutSessions.startedAt))
      .limit(1)
    if (!lastSession) return 0
    const prs = await ctx.db
      .select({ id: personalRecords.id })
      .from(personalRecords)
      .where(and(eq(personalRecords.userId, user.id), eq(personalRecords.sessionId, lastSession.id)))
    return prs.length
  }),

  records: protectedProcedure.query(async ({ ctx }) => {
    const [user] = await ctx.db.select().from(users).where(eq(users.id, ctx.userId)).limit(1)
    if (!user) throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' })
    return ctx.db
      .select()
      .from(personalRecords)
      .where(eq(personalRecords.userId, user.id))
      .orderBy(desc(personalRecords.achievedAt))
  }),

  heatmap: protectedProcedure
    .input(z.object({ weeks: z.number().int().default(16) }))
    .query(async ({ ctx, input }) => {
      const [user] = await ctx.db.select().from(users).where(eq(users.id, ctx.userId)).limit(1)
      if (!user) throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' })
      const since = new Date()
      since.setDate(since.getDate() - input.weeks * 7)
      const sessions = await ctx.db
        .select({ startedAt: workoutSessions.startedAt, totalVolume: workoutSessions.totalVolume })
        .from(workoutSessions)
        .where(
          and(eq(workoutSessions.userId, user.id), gte(workoutSessions.startedAt, since)),
        )
      return sessions
    }),

  exercise: protectedProcedure
    .input(z.object({ exerciseId: z.string() }))
    .query(async ({ ctx, input }) => {
      const [user] = await ctx.db.select().from(users).where(eq(users.id, ctx.userId)).limit(1)
      if (!user) throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' })
      // IDOR fix: join to workoutSessions to enforce userId ownership
      const userSessions = await ctx.db
        .select({ id: workoutSessions.id })
        .from(workoutSessions)
        .where(eq(workoutSessions.userId, user.id))
      if (userSessions.length === 0) return []
      const sessionIds = userSessions.map((s) => s.id)
      const sessionExs = await ctx.db
        .select()
        .from(sessionExercises)
        .where(
          and(
            eq(sessionExercises.exerciseId, input.exerciseId),
            inArray(sessionExercises.workoutSessionId, sessionIds),
          ),
        )
      return sessionExs
    }),

  sessionRecap: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ ctx, input }) => {
      const [user] = await ctx.db.select().from(users).where(eq(users.id, ctx.userId)).limit(1)
      if (!user) throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' })
      // IDOR fix: require session to belong to the authenticated user
      const [session] = await ctx.db
        .select()
        .from(workoutSessions)
        .where(and(eq(workoutSessions.id, input.sessionId), eq(workoutSessions.userId, user.id)))
        .limit(1)
      if (!session) throw new TRPCError({ code: 'NOT_FOUND', message: 'Session not found' })

      const [prevSession] = await ctx.db
        .select()
        .from(workoutSessions)
        .where(
          and(
            eq(workoutSessions.userId, session.userId),
            eq(workoutSessions.workoutTemplateId, session.workoutTemplateId),
          ),
        )
        .orderBy(desc(workoutSessions.startedAt))
        .limit(2)
        .offset(1)

      const delta = prevSession
        ? calcDelta(session.totalVolume, prevSession.totalVolume)
        : null

      return {
        sessionId: session.id,
        previousSessionId: prevSession?.id ?? null,
        totalVolume: session.totalVolume,
        previousTotalVolume: prevSession?.totalVolume ?? null,
        volumeDelta: delta,
        status: delta !== null ? getExerciseStatus(delta) : null,
      }
    }),
})
