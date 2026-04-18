import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import { fastifyTRPCPlugin } from '@trpc/server/adapters/fastify'
import { appRouter } from './router.js'
import { db } from './db/index.js'
import { validateSession } from './services/sessionService.js'

const isDev = process.env['NODE_ENV'] === 'development'
const isDevAuthEnabled = process.env['ENABLE_DEV_AUTH'] === 'true'

const server = Fastify({ logger: { level: isDev ? 'warn' : 'info' } })

// CORS
const allowedOrigins = isDev
  ? true
  : (process.env['ALLOWED_ORIGINS'] ?? '').split(',').filter(Boolean)
await server.register(cors, { origin: allowedOrigins })

// Security headers (HSTS, X-Content-Type-Options, etc.)
await server.register(helmet, {
  contentSecurityPolicy: false,
  hsts: { maxAge: 63072000, includeSubDomains: true, preload: true },
})

// Reject GET requests to /trpc — all tRPC calls must use POST
server.addHook('onRequest', async (req, reply) => {
  if (req.method === 'GET' && req.url.startsWith('/trpc')) {
    reply.code(405).send({ error: 'Method not allowed' })
  }
})

// Rate limiting: 200 req/min per IP globally
await server.register(rateLimit, {
  global: true,
  max: 200,
  timeWindow: 60_000,
  keyGenerator: (req) =>
    ((req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim()) ?? req.ip,
})

await server.register(fastifyTRPCPlugin, {
  prefix: '/trpc',
  trpcOptions: {
    router: appRouter,
    allowMethodOverride: true,
    createContext: async ({ req }: { req: any }) => {
      let userId: string | null = null
      let sessionToken: string | null = null

      const authHeader = req.headers.authorization as string | undefined
      if (authHeader?.startsWith('Bearer ')) {
        sessionToken = authHeader.slice(7)
        const session = await validateSession(sessionToken)
        if (session) {
          userId = session.userId
        } else {
          sessionToken = null
        }
      }

      // Dev fallback: no token → seeded dev user
      if (!userId && isDev && isDevAuthEnabled) {
        const devUserId = process.env['DEV_USER_ID']
        if (devUserId) userId = devUserId
      }

      return { req, db, userId, sessionToken }
    },
  },
})

server.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }))

const port = Number(process.env['PORT'] ?? 3000)
await server.listen({ port, host: '0.0.0.0' })
server.log.info(`Tanren API running on http://localhost:${port}`)
