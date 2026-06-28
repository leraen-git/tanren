import crypto from 'node:crypto'
import { eq, and, gt } from 'drizzle-orm'
import { db } from '../db/index.js'
import { authSessions } from '../db/schema.js'

const DEFAULT_TTL = 30 * 24 * 3600
const GUEST_TTL = 7 * 24 * 3600

export async function createSession(
  userId: string,
  ttlSeconds: number = DEFAULT_TTL,
): Promise<string> {
  const token = crypto.randomBytes(32).toString('base64url')
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000)

  await db.insert(authSessions).values({
    token,
    userId,
    expiresAt,
  })

  return token
}

export async function validateSession(
  token: string,
): Promise<{ userId: string } | null> {
  const [row] = await db
    .select({ userId: authSessions.userId })
    .from(authSessions)
    .where(
      and(
        eq(authSessions.token, token),
        gt(authSessions.expiresAt, new Date()),
      ),
    )
    .limit(1)

  return row ?? null
}

export async function revokeSession(token: string): Promise<void> {
  await db.delete(authSessions).where(eq(authSessions.token, token))
}

export async function revokeAllUserSessions(userId: string): Promise<void> {
  await db.delete(authSessions).where(eq(authSessions.userId, userId))
}

export { GUEST_TTL, DEFAULT_TTL }
