import Fastify from 'fastify'
import cors from '@fastify/cors'
import rateLimit from '@fastify/rate-limit'
import { fastifyTRPCPlugin } from '@trpc/server/adapters/fastify'
import { clerkPlugin, getAuth } from '@clerk/fastify'
import { appRouter } from './router.js'
import { db } from './db/index.js'

// Explicit boolean guard — never truthy unless explicitly set to 'true'
const isDev = process.env['NODE_ENV'] === 'development'
// Extra guard: DEV_CLERK_ID fallback only active when explicitly opted-in.
// Prevents the bypass from activating if NODE_ENV=development leaks into prod config.
const isDevAuthEnabled = process.env['ENABLE_DEV_AUTH'] === 'true'

const CLERK_SECRET_KEY = process.env['CLERK_SECRET_KEY']

// In production Clerk keys are mandatory — fail fast rather than silently
if (!isDev && !CLERK_SECRET_KEY) {
  throw new Error('CLERK_SECRET_KEY is required in production (set it via environment variables)')
}

const server = Fastify({ logger: { level: isDev ? 'warn' : 'info' } })

// CORS: restrict to known origins in production
const allowedOrigins = isDev
  ? true
  : (process.env['ALLOWED_ORIGINS'] ?? '').split(',').filter(Boolean)

await server.register(cors, { origin: allowedOrigins })

// Rate limiting: 200 req/min per IP globally
// AI endpoints have additional app-level limits (plans: 2/week per user via DB counter)
await server.register(rateLimit, {
  global: true,
  max: 200,
  timeWindow: 60_000,
  keyGenerator: (req) =>
    ((req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim()) ?? req.ip,
})

// Register Clerk plugin when secret key is configured.
// This runs before every request and sets verified auth state on req (getAuth(req).userId).
// In dev without Clerk keys the plugin is skipped — auth falls back to DEV_CLERK_ID below.
if (CLERK_SECRET_KEY) {
  await server.register(clerkPlugin)
}

await server.register(fastifyTRPCPlugin, {
  prefix: '/trpc',
  trpcOptions: {
    router: appRouter,
    createContext: async ({ req }: { req: any }) => {
      let userId: string | null = null

      if (CLERK_SECRET_KEY) {
        // ── Production path ────────────────────────────────────────────────
        // clerkPlugin verified the JWT before this context was created.
        // getAuth returns userId: string if token is valid, null otherwise.
        userId = getAuth(req).userId ?? null
      } else if (isDev) {
        // ── Dev path (no Clerk keys configured) ───────────────────────────
        // Decode without signature verification so local tools (Expo dev
        // client, Postman) can pass any well-formed JWT for testing.
        // This branch is unreachable in production — the guard above throws.
        const authHeader = req.headers.authorization as string | undefined
        if (authHeader?.startsWith('Bearer ')) {
          const token = authHeader.slice(7)
          try {
            const parts = token.split('.')
            if (parts.length === 3) {
              const payload = JSON.parse(
                Buffer.from(parts[1] ?? '', 'base64url').toString('utf8'),
              )
              userId = typeof payload.sub === 'string' ? payload.sub : null
            }
          } catch {
            userId = null
          }
        }
      }

      // ── Dev fallback: no token → seeded dev user ──────────────────────────
      // Lets the simulator work without any token during local development.
      // Requires ENABLE_DEV_AUTH=true as an extra safeguard so this never
      // activates if NODE_ENV=development leaks into a production deployment.
      if (!userId && isDev && isDevAuthEnabled) {
        const devUserId = process.env['DEV_CLERK_ID']
        if (devUserId) userId = devUserId
      }

      return { req, db, userId }
    },
  },
})

server.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }))

const port = Number(process.env['PORT'] ?? 3000)
await server.listen({ port, host: '0.0.0.0' })
server.log.info(`FitTrack API running on http://localhost:${port}`)
