import crypto from 'node:crypto'
import { redis } from '../redis.js'

const SESSION_PREFIX = 'session:'
const USER_SESSIONS_PREFIX = 'user_sessions:'
const DEFAULT_TTL = 30 * 24 * 3600 // 30 days
const GUEST_TTL = 7 * 24 * 3600    // 7 days

interface SessionData {
  userId: string
  createdAt: string
}

export async function createSession(
  userId: string,
  ttlSeconds: number = DEFAULT_TTL,
): Promise<string> {
  const token = crypto.randomBytes(32).toString('base64url')
  const data: SessionData = { userId, createdAt: new Date().toISOString() }

  await redis.set(
    SESSION_PREFIX + token,
    JSON.stringify(data),
    'EX',
    ttlSeconds,
  )
  await redis.sadd(USER_SESSIONS_PREFIX + userId, token)

  return token
}

export async function validateSession(
  token: string,
): Promise<{ userId: string } | null> {
  const raw = await redis.get(SESSION_PREFIX + token)
  if (!raw) return null

  const data = JSON.parse(raw) as SessionData
  return { userId: data.userId }
}

export async function revokeSession(token: string): Promise<void> {
  const raw = await redis.get(SESSION_PREFIX + token)
  if (raw) {
    const data = JSON.parse(raw) as SessionData
    await redis.srem(USER_SESSIONS_PREFIX + data.userId, token)
  }
  await redis.del(SESSION_PREFIX + token)
}

export async function revokeAllUserSessions(userId: string): Promise<void> {
  const tokens = await redis.smembers(USER_SESSIONS_PREFIX + userId)
  if (tokens.length > 0) {
    await redis.del(...tokens.map((t) => SESSION_PREFIX + t))
  }
  await redis.del(USER_SESSIONS_PREFIX + userId)
}

export { GUEST_TTL, DEFAULT_TTL }
