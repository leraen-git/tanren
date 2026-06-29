# TANREN — Codebase Hardening & Launch Prep

> **For Claude Code.** Comprehensive hardening pass on the Tanren codebase based on the audit report (`CODEBASE_STATE_REPORT.md` generated on 2026-04-23). The work is organized into **5 batches** from critical security to polish. **Execute one batch at a time**, commit, ask for validation before moving to the next.
>
> **Ground rules**:
> - Each batch is a separate PR / commit series
> - Never batch unrelated work
> - Run `npm run typecheck` and `npm run build` after each significant change
> - If a task is already done (e.g. you find the code already handles it), SKIP it and note this in the commit message
> - If you encounter ambiguity, STOP and ask. Do not guess on security/data migrations.
>
> **Stack context** (do not re-audit):
> - Expo SDK 55, RN 0.83.6, TypeScript 5.9.2 (mobile) / 5.7.2 (api)
> - Fastify 5.2.1 + tRPC v11 + Drizzle ORM 0.45.2 + PostgreSQL + Redis
> - Turborepo + npm workspaces, npm 11.11.0
> - Zustand 5 (8 stores), TanStack Query via tRPC, Expo Router 55
> - Custom auth with opaque session tokens in Redis
> - Custom `BottomSheetShell` (NOT `@gorhom/bottom-sheet`)
> - No offline support currently (AsyncStorage for exercise cache only)

---

## Table of contents

- [Batch 1 — Critical security (1-2 days)](#batch-1--critical-security-1-2-days)
- [Batch 2 — Data integrity (2-3 days)](#batch-2--data-integrity-2-3-days)
- [Batch 3 — Offline resilience (2-3 days)](#batch-3--offline-resilience-2-3-days)
- [Batch 4 — CI / tests / observability (2-3 days)](#batch-4--ci--tests--observability-2-3-days)
- [Batch 5 — Polish & consistency (1-2 days)](#batch-5--polish--consistency-1-2-days)
- [Appendix — Post-launch backlog](#appendix--post-launch-backlog)

---

# Batch 1 — Critical security (1-2 days)

**Goal**: close security holes that could be exploited before first user.

## 1.1 · Audit and secure `auth.devSignIn`

Read `apps/api/src/routers/auth.ts` and locate the `devSignIn` procedure.

**Required behavior**:
- If `process.env.NODE_ENV === 'production'`, the procedure MUST throw `TRPCError({ code: 'NOT_FOUND' })` immediately
- In development, it continues to work as before

**Implementation**:
```ts
// apps/api/src/routers/auth.ts
devSignIn: publicProcedure
  .input(/* existing input */)
  .mutation(async ({ input, ctx }) => {
    if (process.env.NODE_ENV === 'production') {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Procedure not available'
      });
    }
    // ... existing dev sign-in logic
  }),
```

**Why NOT_FOUND and not FORBIDDEN**: avoids leaking that the procedure exists at all. In prod, it looks like it never existed.

**Verification**:
- Write a test in `apps/api/src/routers/auth.test.ts` that sets `NODE_ENV=production`, calls `devSignIn`, expects `NOT_FOUND`
- Run locally with `NODE_ENV=production npm run dev:api` and confirm the call fails

## 1.2 · Rate limiting on all public `auth.*` procedures

Install `@fastify/rate-limit` and configure per-endpoint limits.

```bash
cd apps/api && npm install @fastify/rate-limit
```

**Global defaults** in `apps/api/src/index.ts` (before the tRPC adapter):

```ts
import rateLimit from '@fastify/rate-limit';

await app.register(rateLimit, {
  max: 100,
  timeWindow: '1 minute',
  // Use Redis backing so limits persist across restarts / scale out
  redis: redisClient,
  keyGenerator: (req) => req.ip,
});
```

**Per-procedure limits** — since tRPC is POST-only and all go through `/trpc/*`, you can't use Fastify route-level rate limits directly. Instead, create a **tRPC middleware** that reads a per-procedure limit config:

```ts
// apps/api/src/middleware/rateLimit.ts
import { TRPCError } from '@trpc/server';
import { redisClient } from '../redis';

const LIMITS: Record<string, { max: number; windowSec: number }> = {
  'auth.requestOtp': { max: 3, windowSec: 3600 },    // 3/hour per email
  'auth.verifyOtp':  { max: 10, windowSec: 3600 },   // 10/hour per IP
  'auth.devSignIn':  { max: 5, windowSec: 60 },      // defensive
};

export const rateLimitMiddleware = middleware(async ({ ctx, path, next, rawInput }) => {
  const config = LIMITS[path];
  if (!config) return next();

  // Choose key: email for requestOtp/verifyOtp, IP for everything else
  const emailInput = (rawInput as any)?.email;
  const key = emailInput ? `rl:${path}:email:${emailInput}` : `rl:${path}:ip:${ctx.ip}`;

  const count = await redisClient.incr(key);
  if (count === 1) await redisClient.expire(key, config.windowSec);

  if (count > config.max) {
    throw new TRPCError({
      code: 'TOO_MANY_REQUESTS',
      message: `Trop de tentatives. Réessaie dans ${config.windowSec / 60} minutes.`,
    });
  }

  return next();
});
```

Apply to `auth.requestOtp`, `auth.verifyOtp`, `auth.devSignIn`, `auth.signInWithApple`, `auth.signInWithGoogle`.

**Verification**:
- Test with `curl` in a loop: 4 calls to `requestOtp` with same email should result in 3 successes + 1 `TOO_MANY_REQUESTS`
- Confirm Redis keys expire after the window

## 1.3 · OTP brute-force prevention

Beyond rate limiting, the OTP itself needs protection:

**Current risk**: 6-digit OTP = 1M combinations. Even with rate limit of 10/hour per IP, a botnet rotating IPs could crack it in 12h.

**Required changes** in `apps/api/src/routers/auth.ts` `verifyOtp`:

1. Store the OTP with `attempts: 0` counter in Redis (key: `otp:<email>`)
2. On every `verifyOtp`, increment `attempts`
3. If `attempts >= 5`, delete the OTP from Redis and require a new `requestOtp`
4. If correct OTP: delete immediately from Redis (no reuse possible)
5. OTP expiry: already set, verify it's max 10 minutes

**Example implementation**:
```ts
verifyOtp: publicProcedure
  .input(z.object({ email: z.string().email(), code: z.string().length(6) }))
  .mutation(async ({ input, ctx }) => {
    const key = `otp:${input.email}`;
    const record = await redisClient.get(key);
    if (!record) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Code expiré ou introuvable' });

    const { code, attempts } = JSON.parse(record);

    if (attempts >= 5) {
      await redisClient.del(key);
      throw new TRPCError({ code: 'TOO_MANY_REQUESTS', message: 'Trop de tentatives. Demande un nouveau code.' });
    }

    if (code !== input.code) {
      await redisClient.set(key, JSON.stringify({ code, attempts: attempts + 1 }), 'KEEPTTL');
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Code incorrect' });
    }

    await redisClient.del(key);
    // ... proceed with user creation/login
  }),
```

**Verification**:
- Trigger 5 wrong attempts — expect lockout
- Verify correct code works on the first attempt
- Verify OTP is deleted after successful verification (second use fails)

## 1.4 · `authProvider` as Postgres enum

Convert the free-text column to a proper enum. **This is a breaking migration** — do it now while the user base is small.

**Migration file** — create `apps/api/src/db/migrations/XXXX_auth_provider_enum.sql`:

```sql
-- Step 1: normalize existing values (in case of case drift)
UPDATE users SET auth_provider = LOWER(auth_provider);
UPDATE users SET auth_provider = 'apple' WHERE auth_provider NOT IN ('apple', 'google', 'email', 'guest');

-- Step 2: create the enum type
CREATE TYPE auth_provider_enum AS ENUM ('apple', 'google', 'email', 'guest');

-- Step 3: alter the column
ALTER TABLE users
  ALTER COLUMN auth_provider TYPE auth_provider_enum
  USING auth_provider::auth_provider_enum;

-- Step 4: enforce default
ALTER TABLE users ALTER COLUMN auth_provider SET DEFAULT 'apple';
```

**Update Drizzle schema** in `apps/api/src/db/schema.ts`:
```ts
export const authProviderEnum = pgEnum('auth_provider_enum', ['apple', 'google', 'email', 'guest']);

export const users = pgTable('users', {
  // ...
  authProvider: authProviderEnum('auth_provider').notNull().default('apple'),
  // ...
});
```

**Verification**:
- Run migration on a DB copy first
- Confirm `typeof user.authProvider` is now `'apple' | 'google' | 'email' | 'guest'` in shared types
- Grep the codebase for `authProvider ===` to ensure no case-sensitivity bugs remain
- Delete any dead code handling uppercase variants

## 1.5 · Document AES key rotation procedure

Create `apps/api/SECURITY.md` with the key rotation runbook. No code changes yet, just the documentation.

**Content**:

```markdown
# Tanren API Security Runbook

## Email encryption

All email addresses are encrypted at rest using AES-256-GCM via `cryptoService.ts`.

### Key material
- Primary: `AES_ENCRYPTION_KEY` (env var, 32 bytes base64)
- Key derivation: direct use (no KDF)
- IV: random per encryption
- Deterministic lookup: SHA-256(email + `EMAIL_HASH_SALT`) → `emailHash` column

### Key access
- Production key is stored in [YOUR SECRET MANAGER — FILL IN]
- Access granted only to: [NAMES — FILL IN]
- Last rotation: [DATE — FILL IN]

### Rotation procedure
To rotate the encryption key without downtime:

1. Generate new key: `openssl rand -base64 32`
2. Deploy with BOTH keys set:
   - `AES_ENCRYPTION_KEY_V2=<new-key>`
   - `AES_ENCRYPTION_KEY_V1=<old-key>`
3. Update `cryptoService.ts` to:
   - Encrypt with V2
   - Decrypt: try V2 first, fallback to V1
4. Add `emailKeyVersion` column to users table (`v1 | v2`)
5. Run migration script to re-encrypt all users with V2, setting `emailKeyVersion = 'v2'`
6. Once all users migrated, remove V1 env var and fallback code
7. Document the rotation in this file with date and reason

### Incident response
If the AES key is compromised:
1. Rotate immediately (above procedure, compressed to <4h)
2. Notify affected users via email (CNIL requires within 72h per GDPR article 33)
3. Force re-login for all sessions (clear Redis)
```

**Verification**: file exists, is in git, is cross-referenced from `CLAUDE.md`.

## 1.6 · Guest mode string comparison audit

Grep the codebase for all occurrences of `authProvider ===` and `authProvider !==` to ensure they all compare against the correct enum values (lowercase).

```bash
grep -rn "authProvider\s*[=!]==" apps/ packages/
```

**Expected**: all comparisons are against `'apple'`, `'google'`, `'email'`, `'guest'` (lowercase).

If any compare against `'Apple'`, `'APPLE'`, `'Guest'`, etc., fix them. Once batch 1.4 is done, TypeScript should catch these automatically.

**Verification**: typecheck passes and all `authProvider` comparisons use the enum type.

---

### Batch 1 commit sequence

```
feat(security): disable devSignIn in production
feat(security): add rate limiting on auth procedures
feat(security): OTP brute-force prevention with attempt counter
feat(db): convert authProvider to pgEnum
docs(security): add SECURITY.md with key rotation runbook
chore(security): audit authProvider string comparisons
```

**STOP HERE** — ask user to test in staging, verify rate limits trigger correctly, then proceed to Batch 2.

---

# Batch 2 — Data integrity (2-3 days)

**Goal**: fix data shape issues that cause subtle bugs and block scale.

## 2.1 · Migrate `weightKg` and `heightCm` to `numeric(5,2)`

Floats have precision errors. When a user enters 82.4 kg, it may store as 82.40000000000001. Comparisons and deltas break.

**Migration file** — `apps/api/src/db/migrations/XXXX_weight_height_numeric.sql`:

```sql
-- Round existing values to 1 decimal to avoid upgrade surprises
UPDATE users SET weight_kg = ROUND(weight_kg::numeric, 1) WHERE weight_kg IS NOT NULL;
UPDATE users SET height_cm = ROUND(height_cm::numeric, 0) WHERE height_cm IS NOT NULL;
UPDATE weight_entries SET weight_kg = ROUND(weight_kg::numeric, 1) WHERE weight_kg IS NOT NULL;

-- Alter types
ALTER TABLE users
  ALTER COLUMN weight_kg TYPE numeric(5,2) USING weight_kg::numeric(5,2),
  ALTER COLUMN height_cm TYPE numeric(5,1) USING height_cm::numeric(5,1);

ALTER TABLE weight_entries
  ALTER COLUMN weight_kg TYPE numeric(5,2) USING weight_kg::numeric(5,2);
```

**Drizzle schema updates** in `apps/api/src/db/schema.ts`:
```ts
// Replace `real('weight_kg')` with `numeric('weight_kg', { precision: 5, scale: 2 })`
// Drizzle numeric returns strings — parse in the router before returning to client
```

**tRPC serialization** — Drizzle returns numerics as strings (since JS numbers lose precision beyond 15 digits). Add a transform at the router level:

```ts
// apps/api/src/routers/users.ts
.query(async ({ ctx }) => {
  const user = await db.select().from(users).where(eq(users.id, ctx.userId)).limit(1);
  return {
    ...user[0],
    weightKg: user[0].weightKg ? Number(user[0].weightKg) : null,
    heightCm: user[0].heightCm ? Number(user[0].heightCm) : null,
  };
})
```

Do the same in `weight.ts` router for `weight_entries`.

**Verification**:
- Add a weight entry of 82.4, query it back, confirm it's exactly 82.4 (not 82.40000001)
- Run existing weight delta computations to confirm no regression
- Check the Profile weight screen renders correctly in dark + light

## 2.2 · Add `SessionStatus` enum to `workout_sessions`

Inferring completion from `completedAt IS NULL` is ambiguous — is null = "in progress" or "abandoned"?

**Migration** — `apps/api/src/db/migrations/XXXX_session_status.sql`:

```sql
CREATE TYPE session_status_enum AS ENUM ('IN_PROGRESS', 'DONE', 'ABANDONED');

ALTER TABLE workout_sessions
  ADD COLUMN status session_status_enum NOT NULL DEFAULT 'IN_PROGRESS';

-- Backfill existing data
UPDATE workout_sessions SET status = 'DONE' WHERE completed_at IS NOT NULL;
UPDATE workout_sessions SET status = 'ABANDONED'
  WHERE completed_at IS NULL AND created_at < now() - interval '24 hours';
-- sessions with completed_at IS NULL and created_at > now() - 24h stay IN_PROGRESS
```

**Drizzle schema**:
```ts
export const sessionStatusEnum = pgEnum('session_status_enum', ['IN_PROGRESS', 'DONE', 'ABANDONED']);

export const workoutSessions = pgTable('workout_sessions', {
  // ...
  status: sessionStatusEnum('status').notNull().default('IN_PROGRESS'),
  // ...
});
```

**Update `sessions.ts` router**:
- `sessions.start` → creates session with `status: 'IN_PROGRESS'`
- `sessions.complete` → updates to `status: 'DONE'` + sets `completedAt`
- New procedure: `sessions.abandon` → updates to `status: 'ABANDONED'` (for explicit user abort)
- **Daily cron** (use `node-cron` or similar): mark sessions as `ABANDONED` if they stayed `IN_PROGRESS` for >24h

**Update shared types**:
```ts
// packages/shared/src/types.ts
export type SessionStatus = 'IN_PROGRESS' | 'DONE' | 'ABANDONED';
```

**Verification**:
- Existing sessions get backfilled correctly
- History tab filters out `ABANDONED` sessions by default
- An in-progress session shows up in the home screen "Resume workout" CTA

## 2.3 · Soft delete for `users`

Hard delete is destructive and prevents GDPR grace period + analytics continuity.

**Migration** — `apps/api/src/db/migrations/XXXX_users_soft_delete.sql`:

```sql
ALTER TABLE users ADD COLUMN deleted_at timestamp nullable;
CREATE INDEX idx_users_deleted_at ON users(deleted_at) WHERE deleted_at IS NULL;
```

**Update `users.ts` router** `deleteMe`:
```ts
deleteMe: protectedProcedure.mutation(async ({ ctx }) => {
  const redacted = {
    deletedAt: new Date(),
    // Anonymize PII immediately — user data is retained but unidentifiable
    email: `deleted-${ctx.userId}@tanren.deleted`,
    emailHash: crypto.createHash('sha256').update(`deleted-${ctx.userId}`).digest('hex'),
    name: 'Compte supprimé',
    avatarUrl: null,
  };

  await db.update(users).set(redacted).where(eq(users.id, ctx.userId));

  // Invalidate all sessions for this user in Redis
  const sessionKeys = await redisClient.keys(`session:${ctx.userId}:*`);
  if (sessionKeys.length > 0) await redisClient.del(...sessionKeys);

  return { success: true };
}),
```

**Add middleware** that filters out deleted users from all auth flows. In `apps/api/src/trpc.ts`:

```ts
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.userId) throw new TRPCError({ code: 'UNAUTHORIZED' });

  const user = await db.select()
    .from(users)
    .where(and(eq(users.id, ctx.userId), isNull(users.deletedAt)))
    .limit(1);

  if (!user[0]) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Compte introuvable' });

  return next({ ctx: { ...ctx, user: user[0] } });
});
```

**Hard-delete cron** — create `apps/api/src/jobs/hardDeleteExpiredUsers.ts`:

```ts
import cron from 'node-cron';
import { db } from '../db';
import { users } from '../db/schema';
import { and, lt, isNotNull } from 'drizzle-orm';

// Run daily at 3am UTC
cron.schedule('0 3 * * *', async () => {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const deleted = await db.delete(users)
    .where(and(
      isNotNull(users.deletedAt),
      lt(users.deletedAt, thirtyDaysAgo)
    ))
    .returning({ id: users.id });

  console.log(`[cron] Hard-deleted ${deleted.length} expired users`);
});
```

Register the cron in `apps/api/src/index.ts`.

**All other routers** — add `isNull(users.deletedAt)` to any query that joins users. If users are always accessed via `ctx.user` (from the protected middleware), this is handled centrally.

**Verification**:
- Call `deleteMe`, confirm user row has `deletedAt` set and PII cleared
- Confirm all subsequent tRPC calls fail with UNAUTHORIZED
- Confirm the user's sessions / workouts / etc. remain in DB (for analytics)
- Run the cron manually: `npm run cron:hard-delete` — older deleted users get purged

## 2.4 · Consolidate `me` procedures

Remove the ambiguity of `auth.me` (public) vs `users.me` (protected).

**Decision**: keep `auth.me` as the single source of truth. It's public and tolerates null. This is the Apple-Google-standard pattern.

**Steps**:
1. Search for all uses of `trpc.users.me.useQuery` across `apps/mobile/`
2. Replace each with `trpc.auth.me.useQuery`
3. Handle the null case at each call site (usually a loading / redirect pattern already exists)
4. Delete `users.me` procedure from `apps/api/src/routers/users.ts`
5. Keep `users.updateMe` and `users.deleteMe` — those are correctly protected

**Verification**:
- `grep -rn "users.me" apps/` returns zero matches
- All screens that previously used `users.me` continue to work
- Typecheck passes

## 2.5 · Align shared types with DB schema via Drizzle inference

The `User` interface in `packages/shared/src/types.ts` is missing `authProvider`, `heightCm`, `weightKg`, `gender`, `onboardingDone`, `emailHash`, `authId`. This causes type holes at the mobile-API boundary.

**Two approaches** — pick one:

**Option A (preferred)**: drop the manual `User` interface, use Drizzle's inferred types directly through tRPC.

```ts
// packages/shared/src/types.ts — DELETE the User interface

// In apps/mobile code, use tRPC inference:
import type { RouterOutputs } from '../lib/trpc';
type User = RouterOutputs['auth']['me'];  // fully accurate, auto-synced
```

**Option B (fallback if Option A is too invasive)**: keep `User` in shared but auto-generate it:

```ts
// packages/shared/src/types.ts
import type { users } from '@tanren/api/db/schema';  // requires path alias
export type User = Omit<typeof users.$inferSelect, 'email' | 'emailHash'> & {
  email: string;  // decrypted form
};
```

**My recommendation**: Option A. Less machinery, always in sync.

**Verification**:
- Profile screens show all user fields correctly typed
- No `as any` or `@ts-ignore` needed around user object access

---

### Batch 2 commit sequence

```
feat(db): migrate weightKg/heightCm to numeric(5,2)
feat(db): add SessionStatus enum to workout_sessions
feat(api): soft delete users with 30-day grace period
refactor(api): consolidate me procedures, remove users.me
refactor(types): use tRPC inference for User type
```

**STOP HERE** — ask user to smoke test all affected screens (History, Profile, Weight tracking, Home). Then proceed to Batch 3.

---

# Batch 3 — Offline resilience (2-3 days)

**Goal**: prevent data loss when users are in the gym with poor connectivity.

## 3.1 · Install MMKV for fast synchronous storage

MMKV is 10x faster than AsyncStorage and synchronous (no async/await ceremony for simple reads).

```bash
cd apps/mobile && npm install react-native-mmkv
cd ios && pod install
```

Create `apps/mobile/src/lib/storage.ts`:

```ts
import { MMKV } from 'react-native-mmkv';

export const storage = new MMKV({
  id: 'tanren-default',
  encryptionKey: 'tanren-mmkv-key-v1',  // rotated separately from AES keys
});

export const secureStorage = new MMKV({
  id: 'tanren-secure',
  encryptionKey: process.env.EXPO_PUBLIC_MMKV_KEY!,
});
```

Migrate the `exercises` AsyncStorage cache to MMKV (in `useExercises.ts`). This is a trivial swap of `AsyncStorage.getItem` → `storage.getString`.

**Keep** `expo-secure-store` for the auth token — it uses the native keychain which is more secure than MMKV for tokens.

## 3.2 · Persist `useActiveSessionStore` to MMKV

If the app is killed mid-workout (low battery, OS kills it, user swipes away), the active session must survive.

```ts
// apps/mobile/src/stores/activeSessionStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { storage } from '../lib/storage';

const mmkvStorage = {
  getItem: (name: string) => {
    const value = storage.getString(name);
    return value ?? null;
  },
  setItem: (name: string, value: string) => storage.set(name, value),
  removeItem: (name: string) => storage.delete(name),
};

export const useActiveSessionStore = create(
  persist(
    (set, get) => ({
      // ... existing state and actions
    }),
    {
      name: 'active-session-v1',
      storage: createJSONStorage(() => mmkvStorage),
      // Only persist the session itself, not UI-only state
      partialize: (state) => ({
        sessionId: state.sessionId,
        workoutId: state.workoutId,
        exercises: state.exercises,
        currentExerciseIndex: state.currentExerciseIndex,
        startedAt: state.startedAt,
      }),
    }
  )
);
```

**App launch logic** — in `app/_layout.tsx`, check on mount:
```ts
useEffect(() => {
  const session = useActiveSessionStore.getState();
  if (session.sessionId && session.startedAt) {
    const ageHours = (Date.now() - new Date(session.startedAt).getTime()) / 3600000;
    if (ageHours < 6) {
      // Offer to resume
      router.push('/workout/active');
    } else {
      // Too old, discard
      useActiveSessionStore.getState().reset();
    }
  }
}, []);
```

**Verification**:
- Start a workout, kill the app, reopen → the session is restored
- Sessions older than 6h get discarded
- The active session survives airplane mode

## 3.3 · Create offline sync queue for mutations

When a mutation fails due to network, queue it for retry instead of losing data.

Create `apps/mobile/src/lib/syncQueue.ts`:

```ts
import { storage } from './storage';

export type PendingMutation = {
  id: string;                           // uuid
  procedure: string;                    // e.g. 'sessions.save'
  payload: unknown;                     // the tRPC input
  attempts: number;
  lastError: string | null;
  createdAt: string;                    // ISO
  nextRetryAt: string;                  // ISO
};

const KEY = 'sync-queue-v1';

export const syncQueue = {
  read(): PendingMutation[] {
    const raw = storage.getString(KEY);
    return raw ? JSON.parse(raw) : [];
  },
  add(mutation: Omit<PendingMutation, 'id' | 'attempts' | 'lastError' | 'createdAt' | 'nextRetryAt'>) {
    const queue = this.read();
    queue.push({
      ...mutation,
      id: crypto.randomUUID(),
      attempts: 0,
      lastError: null,
      createdAt: new Date().toISOString(),
      nextRetryAt: new Date().toISOString(),
    });
    storage.set(KEY, JSON.stringify(queue));
  },
  remove(id: string) {
    const queue = this.read().filter(m => m.id !== id);
    storage.set(KEY, JSON.stringify(queue));
  },
  markFailed(id: string, error: string) {
    const queue = this.read();
    const m = queue.find(m => m.id === id);
    if (!m) return;
    m.attempts++;
    m.lastError = error;
    // Exponential backoff: 10s, 1min, 10min, 1h, 6h max
    const backoffMs = Math.min(6 * 60 * 60 * 1000, 10000 * Math.pow(6, m.attempts));
    m.nextRetryAt = new Date(Date.now() + backoffMs).toISOString();
    storage.set(KEY, JSON.stringify(queue));
  },
};
```

**Create a sync worker hook** `apps/mobile/src/hooks/useSyncWorker.ts` that runs on app foreground and network reconnect:

```ts
import { useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { syncQueue } from '../lib/syncQueue';
import { trpcClient } from '../lib/trpc';

export function useSyncWorker() {
  useEffect(() => {
    const run = async () => {
      const queue = syncQueue.read();
      for (const m of queue) {
        if (new Date(m.nextRetryAt) > new Date()) continue;
        try {
          // @ts-expect-error dynamic procedure call
          await trpcClient[m.procedure].mutate(m.payload);
          syncQueue.remove(m.id);
        } catch (err: any) {
          syncQueue.markFailed(m.id, err.message);
          // If it's a validation error (BAD_REQUEST), drop it — it'll never succeed
          if (err.data?.code === 'BAD_REQUEST') {
            syncQueue.remove(m.id);
          }
        }
      }
    };

    run();  // on mount
    const unsub = NetInfo.addEventListener(state => {
      if (state.isConnected) run();
    });
    return unsub;
  }, []);
}
```

Register in `app/_layout.tsx`.

## 3.4 · Integrate sync queue with critical mutations

For mutations that MUST not lose data (workout completion, weight entry), wrap them to fallback to queue on failure.

Create `apps/mobile/src/hooks/useResilientMutation.ts`:

```ts
export function useResilientMutation<TInput>(
  procedure: string,
  options?: { onSuccess?: () => void; onQueued?: () => void }
) {
  return async (input: TInput) => {
    try {
      // @ts-expect-error dynamic
      await trpcClient[procedure].mutate(input);
      options?.onSuccess?.();
    } catch (err: any) {
      if (err.name === 'TRPCClientError' && err.data?.code) {
        // Server error — don't queue, throw
        throw err;
      }
      // Network error — queue
      syncQueue.add({ procedure, payload: input });
      options?.onQueued?.();
    }
  };
}
```

**Apply to** (at minimum):
- `sessions.complete` in the workout active screen
- `weight.add` in the AddWeightModal
- `sessions.save` for incremental set saves during workout

Show a non-blocking toast: "Séance enregistrée en local — synchronisation dès que tu retrouves la connexion."

## 3.5 · Sync queue status UI in Profile

Add a discrete row in the Profile landing (below the stats strip, above "Personnel" section):

```tsx
const pending = syncQueue.read();
{pending.length > 0 && (
  <View style={styles.syncBanner}>
    <Text style={{ color: tokens.amber, fontWeight: '700', fontSize: 11, letterSpacing: 0.2 * 11 }}>
      {pending.length} {pending.length === 1 ? 'donnée' : 'données'} en attente de sync
    </Text>
    <Pressable onPress={() => runSyncNow()}>
      <Text style={{ color: tokens.accent }}>Sync maintenant</Text>
    </Pressable>
  </View>
)}
```

**Verification**:
- Enable airplane mode, complete a workout → toast "enregistrée en local"
- Check Profile → banner shows "1 donnée en attente"
- Disable airplane mode → banner disappears within ~5 seconds, workout is in history

---

### Batch 3 commit sequence

```
feat(storage): install MMKV and migrate exercise cache
feat(offline): persist active session to MMKV
feat(offline): implement sync queue with exponential backoff
feat(offline): integrate sync queue with critical mutations
feat(ui): sync status banner in Profile landing
```

**STOP HERE** — user acceptance testing with airplane mode scenarios. Confirm no data is ever lost.

---

# Batch 4 — CI / tests / observability (2-3 days)

**Goal**: catch regressions before users do.

## 4.1 · Unify TypeScript version across workspaces

Pin TS 5.9.2 everywhere.

```bash
# Root package.json
npm install -D typescript@5.9.2 -w apps/api
npm install -D typescript@5.9.2 -w packages/shared
# Confirm root already uses 5.9.2
```

Run `npm run typecheck` in each workspace, fix any new errors.

## 4.2 · Rename `design/` → `Design/` consistently

```bash
git mv design Design  # or reverse depending on what's actually on disk
```

Then grep for imports:
```bash
grep -rn "from.*design" apps/ packages/
grep -rn "require.*design" apps/ packages/
```

Fix any lowercase references. Update `.gitignore` and any docs.

## 4.3 · GitHub Actions CI

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: test
          POSTGRES_DB: tanren_test
        options: >-
          --health-cmd pg_isready --health-interval 10s
          --health-timeout 5s --health-retries 5
        ports:
          - 5432:5432
      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping" --health-interval 10s
          --health-timeout 5s --health-retries 5
        ports:
          - 6379:6379

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npx turbo run typecheck
      - run: npx turbo run lint
      - run: npx turbo run test
        env:
          DATABASE_URL: postgresql://postgres:test@localhost:5432/tanren_test
          REDIS_URL: redis://localhost:6379
```

Add `typecheck`, `lint`, `test` scripts to `turbo.json` pipeline.

## 4.4 · Backend tests — Vitest on critical routers

```bash
cd apps/api && npm install -D vitest @vitest/ui
```

Create `apps/api/vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/test/setup.ts'],
    testTimeout: 10000,
  },
});
```

**Minimum test suites** (happy path + 1 error case each):

- `apps/api/src/routers/auth.test.ts`
  - `guestSignIn` creates a user and returns a token
  - `verifyOtp` with wrong code fails
  - `verifyOtp` with correct code succeeds and deletes OTP
  - `devSignIn` in production returns NOT_FOUND
- `apps/api/src/routers/users.test.ts`
  - `updateMe` updates allowed fields
  - `deleteMe` soft-deletes and clears PII
- `apps/api/src/routers/sessions.test.ts`
  - `start` creates session with `IN_PROGRESS`
  - `complete` transitions to `DONE`
- `apps/api/src/routers/weight.test.ts`
  - `add` inserts entry + updates current `weightKg`
  - `delete` removes entry + recalculates current
  - Stats computation: min/avg/max correct

Tests use a throwaway test DB wiped between tests.

## 4.5 · Mobile tests — pure utils only

For V1, skip React Native component testing (too much setup). Test only pure functions.

```bash
cd apps/mobile && npm install -D vitest
```

Test coverage minimum:
- `src/utils/format.ts` — all formatters
- `src/utils/historyGrouping.ts` — section header logic
- `src/lib/syncQueue.ts` — queue add/remove/markFailed

## 4.6 · Sentry integration

Mobile and backend.

**Backend** (`apps/api/src/index.ts`):

```bash
cd apps/api && npm install @sentry/node
```

```ts
import * as Sentry from '@sentry/node';

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0.1,  // 10% trace sampling
  });

  app.setErrorHandler((err, req, reply) => {
    Sentry.captureException(err);
    reply.code(500).send({ error: 'Internal server error' });
  });
}
```

**Mobile** (`apps/mobile/app/_layout.tsx`):

```bash
cd apps/mobile && npx expo install @sentry/react-native
```

```ts
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  debug: __DEV__,
  tracesSampleRate: __DEV__ ? 1.0 : 0.1,
});
```

Wrap the root layout with `Sentry.wrap(RootLayout)`.

## 4.7 · Global ErrorBoundary + Toast system

Create `apps/mobile/src/components/Toast.tsx`:

```tsx
import { create } from 'zustand';

type ToastState = {
  message: string | null;
  kind: 'info' | 'success' | 'error';
  show: (message: string, kind?: ToastState['kind']) => void;
  hide: () => void;
};

export const useToastStore = create<ToastState>((set) => ({
  message: null,
  kind: 'info',
  show: (message, kind = 'info') => {
    set({ message, kind });
    setTimeout(() => set({ message: null }), 3500);
  },
  hide: () => set({ message: null }),
}));

export function ToastHost() {
  const { message, kind } = useToastStore();
  // ... render absolute-positioned toast with brand styling
}
```

Register `<ToastHost />` in `_layout.tsx`.

**Use it** in every tRPC mutation that can fail non-fatally:

```ts
onError: (err) => {
  useToastStore.getState().show(err.message, 'error');
}
```

Wrap each tab root in `<ErrorBoundary>` (already exists — just apply consistently).

---

### Batch 4 commit sequence

```
chore(ts): unify TypeScript to 5.9.2 across workspaces
chore(fs): rename design/ → Design/ with import updates
ci: add GitHub Actions with postgres + redis services
test(api): add Vitest suites for critical routers
test(mobile): unit tests for pure utilities
feat(obs): Sentry integration mobile + backend
feat(ui): global Toast system + consistent ErrorBoundary usage
```

**STOP HERE** — verify CI passes on a test PR, verify Sentry receives test events.

---

# Batch 5 — Polish & consistency (1-2 days)

**Goal**: final cleanup before TestFlight.

## 5.1 · DB index audit

Run `EXPLAIN ANALYZE` on the most frequent queries and add missing indexes. Likely candidates:

```sql
CREATE INDEX idx_workout_sessions_user_started
  ON workout_sessions(user_id, started_at DESC);

CREATE INDEX idx_exercise_sets_session_exercise
  ON exercise_sets(session_exercise_id, set_number);

CREATE INDEX idx_personal_records_user_exercise
  ON personal_records(user_id, exercise_id);

CREATE INDEX idx_session_exercises_session
  ON session_exercises(session_id, order_index);
```

For each, confirm no existing equivalent index (Drizzle may have added some already).

## 5.2 · Replace plain `<Image>` with `expo-image` throughout

`expo-image` has better caching, WebP support, transitions.

```bash
cd apps/mobile && npx expo install expo-image
```

Grep all `<Image` usages, replace:
```tsx
// Before
import { Image } from 'react-native';
<Image source={{ uri }} style={...} />

// After
import { Image } from 'expo-image';
<Image source={{ uri }} style={...} contentFit="cover" transition={200} />
```

## 5.3 · Health check endpoint

Add `GET /health` to Fastify:

```ts
app.get('/health', async (req, reply) => {
  try {
    await db.execute(sql`SELECT 1`);
    await redisClient.ping();
    return { status: 'ok', timestamp: new Date().toISOString() };
  } catch (err) {
    reply.code(503).send({ status: 'error', error: String(err) });
  }
});
```

Configure UptimeRobot (free) to ping every 5 minutes.

## 5.4 · Workspace READMEs

Create READMEs in each workspace:

- `apps/mobile/README.md` — how to run, how to build, how to test, env vars
- `apps/api/README.md` — same
- `packages/shared/README.md` — what's exported, how to add types

Each should have a "Quick start" section runnable in <5 minutes by a new contributor.

## 5.5 · Update CLAUDE.md with current reality

`CLAUDE.md` mentions WatermelonDB and `react-hook-form` which aren't installed. Update it to reflect what's actually in use:

- Add section "Current state vs planned" at the top
- Mark WatermelonDB as "deferred to V1.1"
- Remove `react-hook-form` mention (replace with "raw useState — no form lib")
- Cross-reference the `CODEBASE_STATE_REPORT.md` as the source of truth

## 5.6 · Feature flags placeholder

Install a simple feature flag system for later rollback flexibility. Don't over-engineer — a static config is fine for solo dev:

```ts
// apps/mobile/src/lib/flags.ts
export const FLAGS = {
  HEALTH_SYNC_ENABLED: false,   // matches current disabled state
  AI_PLAN_GENERATOR: true,
  DIET_TAB: true,
  EXPORT_DATA: false,            // deferred
};

export function useFeatureFlag(flag: keyof typeof FLAGS): boolean {
  return FLAGS[flag];
}
```

Later you can hook this to an env var or remote config without touching call sites.

---

### Batch 5 commit sequence

```
perf(db): add missing indexes on frequent query paths
perf(ui): migrate to expo-image throughout
feat(api): add /health endpoint for uptime monitoring
docs: workspace READMEs
docs: update CLAUDE.md to match current codebase state
feat: static feature flag system
```

**COMPLETE** — ready for TestFlight submission.

---

# Appendix — Post-launch backlog

The following items are intentionally deferred. Don't attempt during this hardening pass. Document them in a `BACKLOG.md` for future reference:

## Offline (V1.1 — after first 100 users)
- Migrate from sync queue to full WatermelonDB for offline-first
- Background sync worker with conflict resolution
- Offline-aware UI indicators throughout the app

## Analytics (when ready to optimize)
- PostHog integration for funnel tracking
- Key events: signup, onboarding completion, first session completion, 7-day retention
- A/B test framework

## Infrastructure (at scale)
- Database read replicas
- CDN for assets (Cloudflare Images or imgix)
- Horizontal scaling of Fastify workers
- Rate limit by user ID (not just IP) for authenticated endpoints

## Security hardening (for App Store / Play Store approval)
- Implement AES key rotation procedure (doc exists, execute when needed)
- SSL pinning on mobile (prevent MITM via cert replacement)
- Add `Strict-Transport-Security` header
- Penetration test before public launch

## Performance (when user-visible)
- Zustand store consolidation audit (reduce re-render cascades)
- React Query cache persistence to MMKV for instant startup
- Bundle size audit and code splitting

## Testing (when feature velocity slows)
- E2E tests with Maestro or Detox for critical flows
- Load testing with k6 (target: 100 concurrent users without DB contention)
- Visual regression tests for Screen components

---

## How to work through this document

**Per batch**:
1. Read the full batch before starting
2. Make a plan in your head (or write it down)
3. Execute tasks in the order listed — they build on each other
4. Run `npm run typecheck` after every significant change
5. Commit in the sequence shown at the end of the batch
6. Push to a feature branch, open PR, wait for user validation

**If you get stuck**:
- Missing context? Read the relevant file(s) first
- Ambiguous requirement? Stop and ask, don't guess on security/data
- Unexpected breaking change? Commit what's working, flag the issue, propose alternatives

**Do not**:
- Combine multiple batches into one PR
- Skip the stop points — they exist for validation
- Auto-resolve merge conflicts on security-critical files
- Silently drop a requirement because it seems "not worth it" — flag it explicitly

---

*Harden it. Test it. Ship it.*

*Tanren · Une rep après l'autre.*
