import { router, adminProcedure } from '../../trpc.js'
import { db } from '../../db/index.js'
import { users, workoutSessions } from '../../db/schema.js'
import { sql, isNull, and, gte } from 'drizzle-orm'

export const statsRouter = router({
  overview: adminProcedure.query(async () => {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)

    const [totalUsers, activeUsers7d, activeUsers30d, sessionsLast24h, sessionsLast7d, newSignups7d] =
      await Promise.all([
        db
          .select({ c: sql<number>`count(*)::int` })
          .from(users)
          .where(isNull(users.deletedAt))
          .then((r) => r[0]?.c ?? 0),

        db
          .select({ c: sql<number>`count(distinct ${workoutSessions.userId})::int` })
          .from(workoutSessions)
          .where(gte(workoutSessions.startedAt, sevenDaysAgo))
          .then((r) => r[0]?.c ?? 0),

        db
          .select({ c: sql<number>`count(distinct ${workoutSessions.userId})::int` })
          .from(workoutSessions)
          .where(gte(workoutSessions.startedAt, thirtyDaysAgo))
          .then((r) => r[0]?.c ?? 0),

        db
          .select({ c: sql<number>`count(*)::int` })
          .from(workoutSessions)
          .where(gte(workoutSessions.startedAt, oneDayAgo))
          .then((r) => r[0]?.c ?? 0),

        db
          .select({ c: sql<number>`count(*)::int` })
          .from(workoutSessions)
          .where(gte(workoutSessions.startedAt, sevenDaysAgo))
          .then((r) => r[0]?.c ?? 0),

        db
          .select({ c: sql<number>`count(*)::int` })
          .from(users)
          .where(and(gte(users.createdAt, sevenDaysAgo), isNull(users.deletedAt)))
          .then((r) => r[0]?.c ?? 0),
      ])

    return {
      users: { total: totalUsers, active7d: activeUsers7d, active30d: activeUsers30d, newSignups7d },
      sessions: { last24h: sessionsLast24h, last7d: sessionsLast7d },
    }
  }),
})
