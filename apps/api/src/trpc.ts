import { initTRPC, TRPCError } from '@trpc/server'
import type { FastifyRequest } from 'fastify'
import { ZodError } from 'zod'
import type { DB } from './db/index.js'
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
    const isDbError = error.cause?.constructor?.name === 'DrizzleQueryError'
      || error.message?.includes('Failed query:')
    return {
      ...shape,
      message: isDbError && !isDev ? 'An internal error occurred.' : shape.message,
      data: {
        ...shape.data,
        zodError: error.cause instanceof ZodError ? error.cause.flatten() : null,
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

export const protectedProcedure = baseProcedure.use(({ ctx, next, path }) => {
  if (!ctx.userId) {
    ctx.req.log.warn({ event: 'auth_failure', path }, 'Unauthenticated request to protected procedure')
    throw new TRPCError({ code: 'UNAUTHORIZED' })
  }
  return next({ ctx: { ...ctx, userId: ctx.userId } })
})
