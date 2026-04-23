import { z } from 'zod'
import { eq, and, gte, desc } from 'drizzle-orm'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure } from '../trpc.js'
import { weightEntries, users } from '../db/schema.js'

const WeightPeriodEnum = z.enum(['7d', '30d', '3m', '1y'])

function getPeriodStart(period: z.infer<typeof WeightPeriodEnum>): Date {
  const start = new Date()
  switch (period) {
    case '7d':  start.setDate(start.getDate() - 7); break
    case '30d': start.setDate(start.getDate() - 30); break
    case '3m':  start.setMonth(start.getMonth() - 3); break
    case '1y':  start.setFullYear(start.getFullYear() - 1); break
  }
  start.setHours(0, 0, 0, 0)
  return start
}

function computeStats(entries: { weightKg: number; measuredAt: Date }[]) {
  if (entries.length === 0) {
    return {
      current: null,
      currentMeasuredAt: null,
      min: null,
      avg: null,
      max: null,
      deltaKg: null,
      trendDirection: null as 'UP' | 'DOWN' | 'FLAT' | null,
    }
  }

  const weights = entries.map(e => e.weightKg)
  const current = entries[0]!
  const oldest = entries[entries.length - 1]!

  const min = Math.round(Math.min(...weights) * 10) / 10
  const max = Math.round(Math.max(...weights) * 10) / 10
  const avg = Math.round((weights.reduce((s, w) => s + w, 0) / weights.length) * 10) / 10

  const deltaKg = entries.length > 1
    ? Math.round((current.weightKg - oldest.weightKg) * 10) / 10
    : 0

  const trendDirection: 'UP' | 'DOWN' | 'FLAT' =
    Math.abs(deltaKg) < 0.2 ? 'FLAT'
    : deltaKg > 0 ? 'UP'
    : 'DOWN'

  return {
    current: current.weightKg,
    currentMeasuredAt: current.measuredAt.toISOString(),
    min,
    avg,
    max,
    deltaKg,
    trendDirection,
  }
}

export const weightRouter = router({
  list: protectedProcedure
    .input(z.object({ period: WeightPeriodEnum.default('30d') }))
    .query(async ({ ctx, input }) => {
      const since = getPeriodStart(input.period)
      const entries = await ctx.db
        .select()
        .from(weightEntries)
        .where(and(
          eq(weightEntries.userId, ctx.userId),
          gte(weightEntries.measuredAt, since),
        ))
        .orderBy(desc(weightEntries.measuredAt))
        .limit(100)

      return {
        entries: entries.map(e => ({
          id: e.id,
          weightKg: e.weightKg,
          measuredAt: e.measuredAt.toISOString(),
          source: e.source,
          createdAt: e.createdAt.toISOString(),
        })),
        stats: computeStats(entries),
        period: input.period,
      }
    }),

  add: protectedProcedure
    .input(z.object({
      weightKg: z.number().min(30).max(300),
      measuredAt: z.string().datetime(),
    }))
    .mutation(async ({ ctx, input }) => {
      const measuredAt = new Date(input.measuredAt)
      if (measuredAt > new Date()) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'measuredAt cannot be in the future' })
      }

      const [entry] = await ctx.db
        .insert(weightEntries)
        .values({
          userId: ctx.userId,
          weightKg: input.weightKg,
          measuredAt,
          source: 'MANUAL',
        })
        .returning()

      await ctx.db
        .update(users)
        .set({ weightKg: input.weightKg, updatedAt: new Date() })
        .where(eq(users.id, ctx.userId))

      return {
        id: entry!.id,
        weightKg: entry!.weightKg,
        measuredAt: entry!.measuredAt.toISOString(),
        source: entry!.source,
        createdAt: entry!.createdAt.toISOString(),
      }
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const [entry] = await ctx.db
        .select()
        .from(weightEntries)
        .where(and(
          eq(weightEntries.id, input.id),
          eq(weightEntries.userId, ctx.userId),
        ))
        .limit(1)

      if (!entry) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Weight entry not found' })
      }

      await ctx.db
        .delete(weightEntries)
        .where(eq(weightEntries.id, input.id))

      // Update user's weightKg to the most recent remaining entry
      const [latest] = await ctx.db
        .select({ weightKg: weightEntries.weightKg })
        .from(weightEntries)
        .where(eq(weightEntries.userId, ctx.userId))
        .orderBy(desc(weightEntries.measuredAt))
        .limit(1)

      await ctx.db
        .update(users)
        .set({ weightKg: latest?.weightKg ?? null, updatedAt: new Date() })
        .where(eq(users.id, ctx.userId))

      return { success: true }
    }),
})
