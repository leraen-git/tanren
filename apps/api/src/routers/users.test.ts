import { describe, it, expect } from 'vitest'
import { createTestCaller } from '../test/caller.js'
import { validateSession } from '../services/sessionService.js'
import { db } from '../db/index.js'
import { users } from '../db/schema.js'
import { eq } from 'drizzle-orm'

async function createAuthenticatedCaller() {
  const guest = createTestCaller()
  const { token, user } = await guest.auth.guestSignIn()
  const session = await validateSession(token)
  return { caller: createTestCaller(session!.userId, token), user, token }
}

describe('users router', () => {
  describe('updateMe', () => {
    it('updates allowed fields', async () => {
      const { caller } = await createAuthenticatedCaller()
      const updated = await caller.users.updateMe({
        level: 'ADVANCED',
        weeklyTarget: 5,
      })
      expect(updated.level).toBe('ADVANCED')
      expect(updated.weeklyTarget).toBe(5)
    })
  })

  describe('deleteMe', () => {
    it('soft-deletes and clears PII', async () => {
      const { caller, user } = await createAuthenticatedCaller()
      const result = await caller.users.deleteMe()
      expect(result.success).toBe(true)

      const [deleted] = await db
        .select()
        .from(users)
        .where(eq(users.id, user.id))
        .limit(1)
      expect(deleted!.deletedAt).not.toBeNull()
      expect(deleted!.name).toBe('Compte supprimé')
      expect(deleted!.avatarUrl).toBeNull()
    })
  })
})
