import { z } from 'zod'
import { eq, and, desc, gte, sql, like, or, inArray } from 'drizzle-orm'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure } from '../trpc.js'
import {
  workoutSessions,
  sessionExercises,
  exerciseSets,
  workoutTemplates,
  exercises,
  personalRecords,
  users,
} from '../db/schema.js'

const periodToDays: Record<string, number> = {
  '1w': 7,
  '1m': 30,
  '3m': 90,
  '1y': 365,
}

function periodStartDate(period: string): Date {
  const days = periodToDays[period] ?? 90
  const d = new Date()
  d.setDate(d.getDate() - days)
  d.setHours(0, 0, 0, 0)
  return d
}

async function resolveUser(db: any, userId: string) {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1)
  if (!user) throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' })
  return user
}

export const historyRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        period: z.enum(['1w', '1m', '3m', '1y']).default('1m'),
        muscleGroup: z.string().optional(),
        cursor: z.string().optional(),
        limit: z.number().int().min(1).max(50).default(20),
      }),
    )
    .query(async ({ ctx, input }) => {
      const user = await resolveUser(ctx.db, ctx.userId)
      const since = periodStartDate(input.period)

      const conditions = [
        eq(workoutSessions.userId, user.id),
        sql`${workoutSessions.completedAt} IS NOT NULL`,
        gte(workoutSessions.startedAt, since),
      ]

      const rows = await ctx.db
        .select({
          id: workoutSessions.id,
          workoutTemplateId: workoutSessions.workoutTemplateId,
          startedAt: workoutSessions.startedAt,
          completedAt: workoutSessions.completedAt,
          durationSeconds: workoutSessions.durationSeconds,
          totalVolume: workoutSessions.totalVolume,
          workoutName: workoutTemplates.name,
          muscleGroups: workoutTemplates.muscleGroups,
        })
        .from(workoutSessions)
        .leftJoin(workoutTemplates, eq(workoutSessions.workoutTemplateId, workoutTemplates.id))
        .where(and(...conditions))
        .orderBy(desc(workoutSessions.startedAt))
        .limit(input.limit + 1)

      // Filter by muscle group client-side (array column)
      let filtered = rows
      if (input.muscleGroup) {
        filtered = rows.filter((r) => r.muscleGroups?.includes(input.muscleGroup!))
      }

      const hasMore = filtered.length > input.limit
      const sessions = filtered.slice(0, input.limit)

      // Compute seriesCount and prCount per session
      const sessionIds = sessions.map((s) => s.id)
      let prCountMap: Record<string, number> = {}
      let seriesCountMap: Record<string, number> = {}

      if (sessionIds.length > 0) {
        const sessExRows = await ctx.db
          .select({
            sessionId: sessionExercises.workoutSessionId,
            sessExId: sessionExercises.id,
          })
          .from(sessionExercises)
          .where(inArray(sessionExercises.workoutSessionId, sessionIds))

        const sessExIds = sessExRows.map((r) => r.sessExId)
        if (sessExIds.length > 0) {
          const setRows = await ctx.db
            .select({
              sessionExerciseId: exerciseSets.sessionExerciseId,
              isCompleted: exerciseSets.isCompleted,
              isPR: exerciseSets.isPR,
            })
            .from(exerciseSets)
            .where(inArray(exerciseSets.sessionExerciseId, sessExIds))

          const sessExToSession: Record<string, string> = {}
          for (const r of sessExRows) {
            sessExToSession[r.sessExId] = r.sessionId
          }

          for (const set of setRows) {
            const sid = sessExToSession[set.sessionExerciseId]
            if (!sid) continue
            if (set.isCompleted) seriesCountMap[sid] = (seriesCountMap[sid] ?? 0) + 1
            if (set.isPR) prCountMap[sid] = (prCountMap[sid] ?? 0) + 1
          }
        }
      }

      const items = sessions.map((s) => ({
        id: s.id,
        workoutTemplateId: s.workoutTemplateId,
        workoutName: s.workoutName ?? '',
        startedAt: s.startedAt.toISOString(),
        completedAt: s.completedAt?.toISOString() ?? null,
        durationSeconds: s.durationSeconds,
        totalVolume: s.totalVolume,
        seriesCount: seriesCountMap[s.id] ?? 0,
        muscleGroups: s.muscleGroups ?? [],
        prCount: prCountMap[s.id] ?? 0,
      }))

      const totalVol = items.reduce((sum, s) => sum + (s.totalVolume ?? 0), 0)

      return {
        sessions: items,
        summary: { count: items.length, totalVolume: totalVol },
        pagination: {
          nextCursor: hasMore ? sessions[sessions.length - 1]?.id ?? null : null,
          hasMore,
        },
      }
    }),

  detail: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ ctx, input }) => {
      const user = await resolveUser(ctx.db, ctx.userId)

      const [session] = await ctx.db
        .select({
          id: workoutSessions.id,
          workoutTemplateId: workoutSessions.workoutTemplateId,
          startedAt: workoutSessions.startedAt,
          completedAt: workoutSessions.completedAt,
          durationSeconds: workoutSessions.durationSeconds,
          totalVolume: workoutSessions.totalVolume,
          workoutName: workoutTemplates.name,
          muscleGroups: workoutTemplates.muscleGroups,
        })
        .from(workoutSessions)
        .leftJoin(workoutTemplates, eq(workoutSessions.workoutTemplateId, workoutTemplates.id))
        .where(and(eq(workoutSessions.id, input.sessionId), eq(workoutSessions.userId, user.id)))
        .limit(1)

      if (!session) throw new TRPCError({ code: 'NOT_FOUND', message: 'Session not found' })

      const sessExRows = await ctx.db
        .select({
          id: sessionExercises.id,
          exerciseId: sessionExercises.exerciseId,
          order: sessionExercises.order,
          supersetGroupId: sessionExercises.supersetGroupId,
          exerciseName: exercises.name,
          exerciseNameFr: exercises.nameFr,
        })
        .from(sessionExercises)
        .leftJoin(exercises, eq(sessionExercises.exerciseId, exercises.id))
        .where(eq(sessionExercises.workoutSessionId, session.id))
        .orderBy(sessionExercises.order)

      const sessExIds = sessExRows.map((r) => r.id)
      const allSets =
        sessExIds.length > 0
          ? await ctx.db
              .select()
              .from(exerciseSets)
              .where(inArray(exerciseSets.sessionExerciseId, sessExIds))
              .orderBy(exerciseSets.setNumber)
          : []

      const setsBySessEx: Record<string, typeof allSets> = {}
      for (const s of allSets) {
        ;(setsBySessEx[s.sessionExerciseId] ??= []).push(s)
      }

      let totalSeriesCount = 0
      const prs: Array<{ exerciseId: string; exerciseName: string; reps: number; weight: number }> = []

      const exerciseDetails = sessExRows.map((se) => {
        const sets = setsBySessEx[se.id] ?? []
        const completedSets = sets.filter((s) => s.isCompleted)
        totalSeriesCount += completedSets.length
        const volume = completedSets.reduce((sum, s) => sum + s.reps * s.weight, 0)

        for (const s of sets) {
          if (s.isPR) {
            prs.push({
              exerciseId: se.exerciseId,
              exerciseName: se.exerciseNameFr ?? se.exerciseName ?? '',
              reps: s.reps,
              weight: s.weight,
            })
          }
        }

        return {
          exerciseId: se.exerciseId,
          exerciseName: se.exerciseNameFr ?? se.exerciseName ?? '',
          order: se.order,
          volume,
          supersetGroupId: se.supersetGroupId ?? null,
          sets: sets.map((s) => ({
            id: s.id,
            setNumber: s.setNumber,
            reps: s.reps,
            weight: s.weight,
            restSeconds: s.restSeconds,
            isPR: s.isPR,
            completedAt: s.completedAt?.toISOString() ?? null,
          })),
        }
      })

      return {
        id: session.id,
        workoutTemplateId: session.workoutTemplateId,
        workoutName: session.workoutName ?? '',
        startedAt: session.startedAt.toISOString(),
        completedAt: session.completedAt?.toISOString() ?? null,
        durationSeconds: session.durationSeconds,
        totalVolume: session.totalVolume,
        seriesCount: totalSeriesCount,
        muscleGroups: session.muscleGroups ?? [],
        exercises: exerciseDetails,
        prs,
      }
    }),

  search: protectedProcedure
    .input(z.object({ query: z.string().min(2).max(64) }))
    .query(async ({ ctx, input }) => {
      const user = await resolveUser(ctx.db, ctx.userId)
      const pattern = `%${input.query}%`

      const rows = await ctx.db
        .select({
          id: workoutSessions.id,
          workoutTemplateId: workoutSessions.workoutTemplateId,
          startedAt: workoutSessions.startedAt,
          completedAt: workoutSessions.completedAt,
          durationSeconds: workoutSessions.durationSeconds,
          totalVolume: workoutSessions.totalVolume,
          workoutName: workoutTemplates.name,
          muscleGroups: workoutTemplates.muscleGroups,
        })
        .from(workoutSessions)
        .leftJoin(workoutTemplates, eq(workoutSessions.workoutTemplateId, workoutTemplates.id))
        .where(
          and(
            eq(workoutSessions.userId, user.id),
            sql`${workoutSessions.completedAt} IS NOT NULL`,
            like(workoutTemplates.name, pattern),
          ),
        )
        .orderBy(desc(workoutSessions.startedAt))
        .limit(10)

      return rows.map((s) => ({
        id: s.id,
        workoutTemplateId: s.workoutTemplateId,
        workoutName: s.workoutName ?? '',
        startedAt: s.startedAt.toISOString(),
        completedAt: s.completedAt?.toISOString() ?? null,
        durationSeconds: s.durationSeconds,
        totalVolume: s.totalVolume,
        seriesCount: 0,
        muscleGroups: s.muscleGroups ?? [],
        prCount: 0,
      }))
    }),

  stats: protectedProcedure
    .input(z.object({ period: z.enum(['1w', '1m', '3m', '1y']).default('3m') }))
    .query(async ({ ctx, input }) => {
      const user = await resolveUser(ctx.db, ctx.userId)
      const since = periodStartDate(input.period)

      // Current period sessions
      const conditions = [
        eq(workoutSessions.userId, user.id),
        sql`${workoutSessions.completedAt} IS NOT NULL`,
        gte(workoutSessions.startedAt, since),
      ]

      const sessions = await ctx.db
        .select({
          startedAt: workoutSessions.startedAt,
          totalVolume: workoutSessions.totalVolume,
        })
        .from(workoutSessions)
        .where(and(...conditions))

      const totalVolume = sessions.reduce((sum, s) => sum + (s.totalVolume ?? 0), 0)

      // Previous period volume (for trend)
      let previousPeriodVolume = 0
      const days = periodToDays[input.period] ?? 90
      const prevStart = new Date(since)
      prevStart.setDate(prevStart.getDate() - days)
      const prevSessions = await ctx.db
        .select({ totalVolume: workoutSessions.totalVolume })
        .from(workoutSessions)
        .where(
          and(
            eq(workoutSessions.userId, user.id),
            sql`${workoutSessions.completedAt} IS NOT NULL`,
            gte(workoutSessions.startedAt, prevStart),
            sql`${workoutSessions.startedAt} < ${since}`,
          ),
        )
      previousPeriodVolume = prevSessions.reduce((sum, s) => sum + (s.totalVolume ?? 0), 0)

      const trendPercent =
        previousPeriodVolume > 0
          ? Math.round(((totalVolume - previousPeriodVolume) / previousPeriodVolume) * 1000) / 10
          : 0

      // Heatmap: period-aware weeks
      const periodWeeks: Record<string, number> = { '1w': 4, '1m': 5, '3m': 12, '1y': 52 }
      const numWeeks = periodWeeks[input.period] ?? 12
      const heatmapEnd = new Date()
      const heatmapStart = new Date()
      heatmapStart.setDate(heatmapStart.getDate() - (numWeeks * 7 - 1))
      heatmapStart.setHours(0, 0, 0, 0)
      // Align to Monday
      const dayOffset = (heatmapStart.getDay() + 6) % 7
      heatmapStart.setDate(heatmapStart.getDate() - dayOffset)

      const heatmapSessions = await ctx.db
        .select({
          startedAt: workoutSessions.startedAt,
          totalVolume: workoutSessions.totalVolume,
        })
        .from(workoutSessions)
        .where(
          and(
            eq(workoutSessions.userId, user.id),
            sql`${workoutSessions.completedAt} IS NOT NULL`,
            gte(workoutSessions.startedAt, heatmapStart),
          ),
        )

      const volumeByDate: Record<string, number> = {}
      for (const s of heatmapSessions) {
        const dateStr = s.startedAt.toISOString().slice(0, 10)
        volumeByDate[dateStr] = (volumeByDate[dateStr] ?? 0) + (s.totalVolume ?? 0)
      }

      // Compute max daily volume for level thresholds
      const dailyVolumes = Object.values(volumeByDate)
      const maxDailyVol = dailyVolumes.length > 0 ? Math.max(...dailyVolumes) : 1

      const cells: Array<{ date: string; volume: number; level: 0 | 1 | 2 | 3 | 4 }> = []
      const cursor = new Date(heatmapStart)
      while (cursor <= heatmapEnd) {
        const dateStr = cursor.toISOString().slice(0, 10)
        const vol = volumeByDate[dateStr] ?? 0
        let level: 0 | 1 | 2 | 3 | 4 = 0
        if (vol > 0) {
          const ratio = vol / maxDailyVol
          if (ratio < 0.25) level = 1
          else if (ratio < 0.5) level = 2
          else if (ratio < 0.75) level = 3
          else level = 4
        }
        cells.push({ date: dateStr, volume: vol, level })
        cursor.setDate(cursor.getDate() + 1)
      }

      // Weekly volume: last 12 weeks
      const weeklyVolume: Array<{ weekStart: string; volume: number; sessionCount: number }> = []
      const weekCursor = new Date(heatmapStart)
      while (weekCursor <= heatmapEnd) {
        const weekStart = weekCursor.toISOString().slice(0, 10)
        let weekVol = 0
        let weekCount = 0
        for (let d = 0; d < 7; d++) {
          const dayStr = new Date(weekCursor.getTime() + d * 86400000).toISOString().slice(0, 10)
          const dayVol = volumeByDate[dayStr] ?? 0
          weekVol += dayVol
          if (dayVol > 0) weekCount++
        }
        weeklyVolume.push({ weekStart, volume: weekVol, sessionCount: weekCount })
        weekCursor.setDate(weekCursor.getDate() + 7)
      }

      // Recent PRs
      const recentPRs = await ctx.db
        .select({
          sessionId: personalRecords.sessionId,
          exerciseId: personalRecords.exerciseId,
          exerciseName: exercises.name,
          exerciseNameFr: exercises.nameFr,
          reps: personalRecords.reps,
          weight: personalRecords.weight,
          achievedAt: personalRecords.achievedAt,
        })
        .from(personalRecords)
        .leftJoin(exercises, eq(personalRecords.exerciseId, exercises.id))
        .where(eq(personalRecords.userId, user.id))
        .orderBy(desc(personalRecords.achievedAt))
        .limit(5)

      return {
        period: input.period,
        totalVolume,
        previousPeriodVolume,
        trendPercent,
        heatmap: {
          cells,
          startDate: heatmapStart.toISOString().slice(0, 10),
          endDate: heatmapEnd.toISOString().slice(0, 10),
          maxVolume: maxDailyVol,
        },
        weeklyVolume,
        recentPRs: recentPRs.map((pr) => ({
          sessionId: pr.sessionId,
          exerciseId: pr.exerciseId,
          exerciseName: pr.exerciseNameFr ?? pr.exerciseName ?? '',
          reps: pr.reps,
          weight: pr.weight,
          achievedAt: pr.achievedAt.toISOString(),
        })),
      }
    }),
})
