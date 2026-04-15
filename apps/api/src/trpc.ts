import { initTRPC, TRPCError } from '@trpc/server'
import type { FastifyRequest } from 'fastify'
import { ZodError } from 'zod'
import type { DB } from './db/index.js'

export interface Context {
  req: FastifyRequest
  db: DB
  userId: string | null
}

const t = initTRPC.context<Context>().create({
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError: error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    }
  },
})

export const router = t.router
export const publicProcedure = t.procedure

export const protectedProcedure = t.procedure.use(({ ctx, next, path }) => {
  if (!ctx.userId) {
    ctx.req.log.warn({ event: 'auth_failure', path }, 'Unauthenticated request to protected procedure')
    throw new TRPCError({ code: 'UNAUTHORIZED' })
  }
  return next({ ctx: { ...ctx, userId: ctx.userId } })
})
