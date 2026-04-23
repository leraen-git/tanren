import { describe, it, expect } from 'vitest'
import { TRPCError } from '@trpc/server'
import { createTestCaller } from '../test/caller.js'
import { redis } from '../redis.js'
import { validateSession } from '../services/sessionService.js'

describe('auth router', () => {
  describe('guestSignIn', () => {
    it('creates a user and returns a token', async () => {
      const caller = createTestCaller()
      const result = await caller.auth.guestSignIn()

      expect(result.token).toBeDefined()
      expect(result.token.length).toBeGreaterThan(20)
      expect(result.user.id).toBeDefined()
      expect(result.user.authProvider).toBe('guest')
    })
  })

  describe('me', () => {
    it('returns null for unauthenticated requests', async () => {
      const caller = createTestCaller()
      const result = await caller.auth.me()
      expect(result).toBeNull()
    })

    it('returns user for authenticated requests', async () => {
      const caller = createTestCaller()
      const { token, user } = await caller.auth.guestSignIn()
      const session = await validateSession(token)

      const authedCaller = createTestCaller(session!.userId, token)
      const me = await authedCaller.auth.me()
      expect(me).not.toBeNull()
      expect(me!.id).toBe(user.id)
    })
  })

  describe('signOut', () => {
    it('revokes the session', async () => {
      const caller = createTestCaller()
      const { token } = await caller.auth.guestSignIn()
      const session = await validateSession(token)

      const authedCaller = createTestCaller(session!.userId, token)
      await authedCaller.auth.signOut()

      const invalidated = await validateSession(token)
      expect(invalidated).toBeNull()
    })
  })

  describe('requestOtp + verifyOtp', () => {
    it('rejects wrong code', async () => {
      const caller = createTestCaller()
      await caller.auth.requestOtp({ email: 'test@example.com' })

      await expect(
        caller.auth.verifyOtp({ email: 'test@example.com', code: '000000' }),
      ).rejects.toThrow()
    })

    it('accepts correct code', async () => {
      const caller = createTestCaller()
      await caller.auth.requestOtp({ email: 'test@example.com' })

      const raw = await redis.get('otp:test@example.com')
      const { code } = JSON.parse(raw!)

      const result = await caller.auth.verifyOtp({ email: 'test@example.com', code })
      expect(result.token).toBeDefined()
      expect(result.user.id).toBeDefined()
    })
  })

  describe('devSignIn', () => {
    it('returns NOT_FOUND in production', async () => {
      const origEnv = process.env['NODE_ENV']
      process.env['NODE_ENV'] = 'production'
      try {
        const caller = createTestCaller()
        await expect(
          caller.auth.devSignIn({ userId: 'fake-id' }),
        ).rejects.toThrow()
      } finally {
        process.env['NODE_ENV'] = origEnv
      }
    })
  })
})
