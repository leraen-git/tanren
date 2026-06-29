import { initTRPC, TRPCError } from '@trpc/server'
import type { FastifyRequest } from 'fastify'
import { ZodError } from 'zod'
import { eq, and, isNull } from 'drizzle-orm'
import type { DB } from './db/index.js'
import { users } from './db/schema.js'
import { checkProcedureRateLimit } from './middleware/rateLimit.js'

export interface Context {
  req: FastifyRequest
  db: DB
  userId: string | null
  sessionToken: string | null
}

const isDev = process.env['NODE_ENV'] === 'development'
const MAX_REQUEST_AGE_MS = 5 * 60 * 1000

const t = initTRPC.context<Context>().create({
  errorFormatter({ shape, error }) {
    if (isDev) {
      console.error('[TRPC_ERROR]', error.code, error.message, error.cause?.toString?.() ?? '', error.stack?.split('\n').slice(0, 5).join('\n'))
    } else if (error.code === 'INTERNAL_SERVER_ERROR') {
      console.error('[TRPC_ERROR]', error.code, (error.cause as Error)?.message ?? error.message)
    }
    const isTRPCThrown = error.code !== 'INTERNAL_SERVER_ERROR'
      || error.message !== 'INTERNAL_SERVER_ERROR'
    const userMessage = isTRPCThrown
      ? shape.message
      : 'Une erreur interne est survenue.'
    return {
      ...shape,
      message: userMessage,
      data: {
        ...shape.data,
        zodError: error.cause instanceof ZodError ? error.cause.flatten() : null,
        ...(isDev ? {} : { stack: undefined }),
      },
    }
  },
})

const withRequestValidation = t.middleware(async ({ ctx, next, path, type }) => {
  const contentType = ctx.req.headers['content-type']
  if (type === 'mutation' && !contentType?.includes('application/json')) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Content-Type must be application/json' })
  }

  const timestamp = ctx.req.headers['x-request-timestamp'] as string | undefined
  if (timestamp) {
    const age = Date.now() - Number(timestamp)
    if (Number.isNaN(age) || age > MAX_REQUEST_AGE_MS) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Request expired' })
    }
  }

  const ip = ((ctx.req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim()) ?? ctx.req.ip
  await checkProcedureRateLimit(path, ip)

  ctx.req.log.info({
    event: 'request',
    path,
    type,
    userId: ctx.userId,
  })

  return next()
})

export const router = t.router
const baseProcedure = t.procedure.use(withRequestValidation)
export const publicProcedure = baseProcedure

export const protectedProcedure = baseProcedure.use(async ({ ctx, next, path }) => {
  if (!ctx.userId) {
    ctx.req.log.warn({ event: 'auth_failure', path }, 'Unauthenticated request to protected procedure')
    throw new TRPCError({ code: 'UNAUTHORIZED' })
  }

  const [user] = await ctx.db
    .select({
      id: users.id,
      role: users.role,
      aiQuotaOverrides: users.aiQuotaOverrides,
      preferredLlmModel: users.preferredLlmModel,
    })
    .from(users)
    .where(and(eq(users.id, ctx.userId), isNull(users.deletedAt)))
    .limit(1)

  if (!user) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Compte introuvable' })
  }

  return next({ ctx: { ...ctx, userId: ctx.userId, user } })
})

export const adminProcedure = protectedProcedure.use(async ({ ctx, next, path }) => {
  if (ctx.user.role !== 'admin') {
    ctx.req.log.warn({ event: 'admin_deny', path, userId: ctx.userId }, 'Non-admin attempted admin route')
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Procedure not available' })
  }

  return next({ ctx })
})
