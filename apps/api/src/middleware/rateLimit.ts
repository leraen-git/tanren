import { TRPCError } from '@trpc/server'
import { redis } from '../redis.js'

interface LimitConfig {
  max: number
  windowSec: number
}

const LIMITS: Record<string, LimitConfig> = {
  'auth.signInWithApple': { max: 10, windowSec: 60 },
  'auth.signInWithGoogle': { max: 10, windowSec: 60 },
  'auth.guestSignIn':     { max: 5, windowSec: 60 },
  'auth.devSignIn':       { max: 5, windowSec: 60 },
}

export async function checkProcedureRateLimit(
  path: string,
  ip: string,
): Promise<void> {
  const config = LIMITS[path]
  if (!config) return

  const key = `rl:${path}:ip:${ip}`
  const count = await redis.incr(key)
  if (count === 1) await redis.expire(key, config.windowSec)

  if (count > config.max) {
    const waitMin = Math.ceil(config.windowSec / 60)
    throw new TRPCError({
      code: 'TOO_MANY_REQUESTS',
      message: `Trop de tentatives. Réessaie dans ${waitMin} minute${waitMin > 1 ? 's' : ''}.`,
    })
  }
}
