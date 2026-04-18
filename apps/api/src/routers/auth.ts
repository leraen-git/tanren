import { randomInt } from 'node:crypto'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { TRPCError } from '@trpc/server'
import { jwtVerify, createRemoteJWKSet } from 'jose'
import { router, publicProcedure, protectedProcedure } from '../trpc.js'
import { users } from '../db/schema.js'
import { redis } from '../redis.js'
import { sendOtpEmail } from '../services/emailService.js'
import { createSession, revokeSession, GUEST_TTL } from '../services/sessionService.js'
import { encryptUserFields, decryptUserFields } from '../db/encryption.js'

const isDev = process.env['NODE_ENV'] === 'development'

// Apple's public key set — fetched once and cached automatically by jose
const APPLE_JWKS = createRemoteJWKSet(new URL('https://appleid.apple.com/auth/keys'))
const APPLE_BUNDLE_ID = 'app.tanren'

// ─── OTP helpers ──────────────────────────────────────────────────────────────

/** Cryptographically secure 6-digit OTP, zero-padded. */
function generateOtp(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, '0')
}

const OTP_TTL_SECONDS = 600       // 10 minutes
const OTP_MAX_ATTEMPTS = 5        // wrong guesses before invalidation
const OTP_RATE_TTL_SECONDS = 900  // 15 minutes
const OTP_RATE_MAX = 3            // sends per window

interface OtpRecord {
  code: string
  attempts: number
}

// ─── Router ───────────────────────────────────────────────────────────────────

export const authRouter = router({
  /**
   * Sign in / sign up with an Apple Identity Token.
   */
  signInWithApple: publicProcedure
    .input(z.object({
      identityToken: z.string(),
      fullName: z.string().nullable().optional(),
      email: z.string().email().nullable().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      let appleUserId: string
      let appleEmail: string | null = null

      try {
        const { payload } = await jwtVerify(input.identityToken, APPLE_JWKS, {
          issuer: 'https://appleid.apple.com',
          audience: APPLE_BUNDLE_ID,
        })
        appleUserId = payload.sub as string
        appleEmail = (payload.email as string | undefined) ?? null
      } catch (err) {
        ctx.req.log.warn({ event: 'auth_failure', provider: 'apple', err }, 'Apple token invalid')
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid Apple identity token' })
      }

      const email = appleEmail ?? input.email ?? null

      let [user] = await ctx.db
        .select()
        .from(users)
        .where(eq(users.authId, appleUserId))
        .limit(1)

      if (!user) {
        const name =
          input.fullName?.trim() ||
          email?.split('@')[0] ||
          'Athlete'

        const encrypted = encryptUserFields({ name, email: email ?? `${appleUserId}@apple.id` })
        const [created] = await ctx.db.insert(users).values({
          authId: appleUserId,
          name: encrypted.name!,
          email: encrypted.email!,
          emailHash: encrypted.emailHash,
        }).returning()
        user = created!
        ctx.req.log.info({ event: 'user_created', userId: user.id, provider: 'apple' }, 'New user signed up')
      }

      const token = await createSession(user.id)
      ctx.req.log.info({ event: 'auth_success', userId: user.id, provider: 'apple' }, 'User signed in')
      return { token, user: decryptUserFields(user) }
    }),

  /**
   * Sign in / sign up with a Google OAuth access token.
   */
  signInWithGoogle: publicProcedure
    .input(z.object({ accessToken: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const googleRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${input.accessToken}` },
      })

      if (!googleRes.ok) {
        ctx.req.log.warn({ event: 'auth_failure', provider: 'google' }, 'Google token invalid')
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid Google access token' })
      }

      const googleUser = await googleRes.json() as {
        sub: string
        email: string
        name?: string
        picture?: string
        email_verified?: boolean
      }

      if (!googleUser.sub) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid Google token response' })
      }

      let [user] = await ctx.db
        .select()
        .from(users)
        .where(eq(users.authId, googleUser.sub))
        .limit(1)

      if (!user) {
        const name = googleUser.name?.trim() || googleUser.email.split('@')[0] || 'Athlete'
        const encrypted = encryptUserFields({ name, email: googleUser.email })
        const [created] = await ctx.db.insert(users).values({
          authId: googleUser.sub,
          authProvider: 'google',
          name: encrypted.name!,
          email: encrypted.email!,
          emailHash: encrypted.emailHash,
          avatarUrl: googleUser.picture ?? null,
        }).returning()
        user = created!
        ctx.req.log.info({ event: 'user_created', userId: user.id, provider: 'google' }, 'New user signed up')
      } else {
        const updates: Record<string, unknown> = { updatedAt: new Date() }
        if (googleUser.name) Object.assign(updates, encryptUserFields({ name: googleUser.name }))
        if (googleUser.picture) updates.avatarUrl = googleUser.picture
        const [updated] = await ctx.db
          .update(users)
          .set(updates)
          .where(eq(users.id, user.id))
          .returning()
        user = updated!
      }

      const token = await createSession(user.id)
      ctx.req.log.info({ event: 'auth_success', userId: user.id, provider: 'google' }, 'User signed in')
      return { token, user: decryptUserFields(user) }
    }),

  /**
   * Email OTP — step 1: request a 6-digit code.
   * Rate-limited to 3 sends per 15 minutes per email address.
   */
  requestOtp: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ ctx, input }) => {
      const email = input.email.trim().toLowerCase()

      // Rate limit: max 3 sends per 15-minute window
      const rateKey = `otp_rate:${email}`
      const sends = await redis.incr(rateKey)
      if (sends === 1) await redis.expire(rateKey, OTP_RATE_TTL_SECONDS)
      if (sends > OTP_RATE_MAX) {
        throw new TRPCError({
          code: 'TOO_MANY_REQUESTS',
          message: 'Too many code requests. Please wait 15 minutes.',
        })
      }

      const code = generateOtp()
      const otpKey = `otp:${email}`
      const record: OtpRecord = { code, attempts: 0 }
      await redis.set(otpKey, JSON.stringify(record), 'EX', OTP_TTL_SECONDS)

      try {
        await sendOtpEmail(email, code)
      } catch (err) {
        ctx.req.log.error({ event: 'otp_email_failed', email, err }, 'Failed to send OTP email')
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Could not send email. Please try again.' })
      }

      ctx.req.log.info({ event: 'otp_sent', email }, 'OTP sent')
      return { sent: true }
    }),

  /**
   * Email OTP — step 2: verify the code and issue a JWT.
   * Max 5 wrong attempts before the code is invalidated.
   */
  verifyOtp: publicProcedure
    .input(z.object({
      email: z.string().email(),
      code: z.string().min(1).max(6),
    }))
    .mutation(async ({ ctx, input }) => {
      const email = input.email.trim().toLowerCase()
      const otpKey = `otp:${email}`

      const raw = await redis.get(otpKey)
      if (!raw) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Code expired or not found. Request a new one.',
        })
      }

      const record = JSON.parse(raw) as OtpRecord

      // Invalidate after too many wrong guesses — do this check before verifying
      if (record.attempts >= OTP_MAX_ATTEMPTS) {
        await redis.del(otpKey)
        throw new TRPCError({
          code: 'TOO_MANY_REQUESTS',
          message: 'Too many incorrect attempts. Please request a new code.',
        })
      }

      // Increment attempts before checking (limits timing-based enumeration)
      const newAttempts = record.attempts + 1

      if (input.code !== record.code) {
        await redis.set(otpKey, JSON.stringify({ ...record, attempts: newAttempts }), 'KEEPTTL')
        const remaining = OTP_MAX_ATTEMPTS - newAttempts
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: remaining > 0
            ? `Incorrect code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`
            : 'Too many incorrect attempts. Please request a new code.',
        })
      }

      // Code is correct — delete immediately (single use)
      await redis.del(otpKey)

      // Find or create user
      let [user] = await ctx.db
        .select()
        .from(users)
        .where(eq(users.authId, email))
        .limit(1)

      if (!user) {
        const name = email.split('@')[0] || 'User'
        const encrypted = encryptUserFields({ name, email })
        const [created] = await ctx.db.insert(users).values({
          authId: email,
          authProvider: 'email',
          name: encrypted.name!,
          email: encrypted.email!,
          emailHash: encrypted.emailHash,
        }).returning()
        user = created!
        ctx.req.log.info({ event: 'user_created', userId: user.id, provider: 'email' }, 'New user signed up')
      }

      const token = await createSession(user.id)
      ctx.req.log.info({ event: 'auth_success', userId: user.id, provider: 'email' }, 'User signed in')
      return { token, user: decryptUserFields(user) }
    }),

  /**
   * Guest sign-in — creates an anonymous user with a 7-day JWT.
   * Guest accounts are identified by authProvider = 'guest'.
   */
  guestSignIn: publicProcedure
    .mutation(async ({ ctx }) => {
      const guestId = crypto.randomUUID()
      const guestEncrypted = encryptUserFields({ name: 'Guest', email: `guest_${guestId.slice(0, 8)}@guest.tanren.app` })
      const [user] = await ctx.db.insert(users).values({
        authId: `guest_${guestId}`,
        authProvider: 'guest',
        name: guestEncrypted.name!,
        email: guestEncrypted.email!,
        emailHash: guestEncrypted.emailHash,
      }).returning()

      const token = await createSession(user!.id, GUEST_TTL)
      ctx.req.log.info({ event: 'guest_created', userId: user!.id }, 'Guest account created')
      return { token, user: decryptUserFields(user!) }
    }),

  /**
   * Dev-only: sign in as any existing user by internal UUID.
   */
  devSignIn: publicProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!isDev) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Dev sign-in is not available in production' })
      }
      const [user] = await ctx.db
        .select()
        .from(users)
        .where(eq(users.id, input.userId))
        .limit(1)
      if (!user) throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' })
      const token = await createSession(user.id)
      return { token, user: decryptUserFields(user) }
    }),

  /**
   * Verify the current token is still valid and return the user.
   */
  me: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.userId) return null
    const [user] = await ctx.db
      .select()
      .from(users)
      .where(eq(users.id, ctx.userId))
      .limit(1)
    return user ? decryptUserFields(user) : null
  }),

  /**
   * Sign out — revokes the server-side session.
   */
  signOut: protectedProcedure.mutation(async ({ ctx }) => {
    if (ctx.sessionToken) {
      await revokeSession(ctx.sessionToken)
    }
    return { success: true }
  }),
})
