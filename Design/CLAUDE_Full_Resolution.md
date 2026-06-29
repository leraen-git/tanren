# TANREN — Full Resolution & Optimization (post-AUDIT_FULL_STATE)

> **For Claude Code.** Based on `AUDIT_FULL_STATE.md` (2026-04-25). Address EVERY item in the risk register (sections 23.CRITICAL through 23.LOW). 5 phases with stop-points. Nothing left for later.
>
> **Coverage**: 18 items from risk register + supporting fixes. 1 [FAIL], 2 [MISSING], 16 [PARTIAL].
>
> **Ground rules**:
> - Run `npx tsc -b --noEmit` after every significant change
> - One logical fix = one commit (clear message tying back to audit section)
> - If a fix conflicts with the dirty tree, **STOP and ask**
> - Stop after each phase, report progress, wait for user validation
> - Tests for new functionality where reasonable (but don't go on a test-coverage crusade — the audit accepts low test coverage as known debt for V1)

---

## Phase overview

| Phase | Goal | Items addressed | Effort |
|---|---|---|---|
| **Phase 0** | Commit dirty tree (14 changes) | git hygiene | 15 min |
| **Phase 1** | Critical correctness bugs | Risk #1, #3 | 1.5 h |
| **Phase 2** | Security & GDPR gaps | Risk #2, #5, #6, #7, #9, #11, #12 | 3 h |
| **Phase 3** | Performance & queries | Risk #4, #8 | 2 h |
| **Phase 4** | Architecture consistency | Risk #10, #15 | 2 h |
| **Phase 5** | Polish & dev experience | Risk #13, #14, #16, #17, #18 | 2 h |

Total: ~10-11h focused work across 5 PRs.

---

# Phase 0 — Commit the dirty tree

**Goal**: 14 uncommitted changes per audit. Lock in current work before any new fixes.

## 0.1 · Inspect what's pending

```bash
git status
git diff --stat
```

**If any file looks unrelated to recent work** (random configs, build artifacts, IDE files, accidental edits), STOP and report the list to user. Don't commit blindly.

## 0.2 · Commit in logical groups

Split by topic if possible. Look at file paths to group them:

```bash
# Group A - tsbuildinfo files (tooling artifacts)
# These should NOT be committed — they're build outputs
# Add to .gitignore instead (Phase 5 covers this)
# For now, leave them ignored from the commit

# Group B - actual code changes
git add apps/mobile/...  # mobile changes
git commit -m "..."

git add apps/api/...  # api changes
git commit -m "..."
```

**Fallback**: if splitting is unclear, ONE commit covering everything is OK:

```bash
git add -A
git commit -m "chore: commit pending changes from previous work"
```

## 0.3 · Verify

```bash
git status
# Expected: "working tree clean" (or only tsbuildinfo files showing — those go to .gitignore in Phase 5)

npx tsc -b --noEmit
# Expected: 0 errors
```

**STOP HERE.** Report:
- How many commits made
- Brief summary of each
- Confirmation typecheck clean

Wait for validation before Phase 1.

---

# Phase 1 — Critical correctness bugs

**Goal**: fix the bugs that silently break the user experience. These are non-negotiable before any other work.

Items addressed: Risk #1 (`sessions.byId` only fetches first exercise's sets) + Risk #3 (`workouts.detail` N+1).

## 1.1 · Fix `sessions.byId` — fetch sets for ALL exercises

**Severity**: CRITICAL — silently breaks recap for every multi-exercise session.

**File**: `apps/api/src/routers/sessions.ts` lines 63-80

### Read the current implementation first

```bash
grep -B 2 -A 30 "byId: protectedProcedure" apps/api/src/routers/sessions.ts
```

Verify the bug: there's likely a `[exercises[0]]` somewhere instead of mapping over all exercises.

### Apply fix

The procedure should fetch sets for ALL session exercises. Pseudocode:

```ts
byId: protectedProcedure
  .input(z.object({ id: z.string().uuid() }))
  .query(async ({ input, ctx }) => {
    // Fetch the session
    const [session] = await db.select()
      .from(workoutSessions)
      .where(and(
        eq(workoutSessions.id, input.id),
        eq(workoutSessions.userId, ctx.userId)
      ))
      .limit(1)

    if (!session) throw new TRPCError({ code: 'NOT_FOUND' })

    // Fetch ALL session exercises (not just exercises[0])
    const sessionExercisesRows = await db.select({
      id: sessionExercises.id,
      exerciseId: sessionExercises.exerciseId,
      orderIndex: sessionExercises.orderIndex,
      exerciseName: exercises.name,
      muscleGroups: exercises.muscleGroups,
    })
      .from(sessionExercises)
      .innerJoin(exercises, eq(exercises.id, sessionExercises.exerciseId))
      .where(eq(sessionExercises.sessionId, session.id))
      .orderBy(asc(sessionExercises.orderIndex))

    if (sessionExercisesRows.length === 0) {
      return { ...session, exercises: [] }
    }

    // Fetch ALL sets in ONE query (not a loop) — covers all exercises at once
    const allSets = await db.select()
      .from(exerciseSets)
      .where(inArray(
        exerciseSets.sessionExerciseId,
        sessionExercisesRows.map(se => se.id)
      ))
      .orderBy(asc(exerciseSets.sessionExerciseId), asc(exerciseSets.setNumber))

    // Group sets by sessionExerciseId in memory
    const setsByExercise = new Map<string, typeof allSets>()
    for (const set of allSets) {
      const existing = setsByExercise.get(set.sessionExerciseId) ?? []
      existing.push(set)
      setsByExercise.set(set.sessionExerciseId, existing)
    }

    return {
      ...session,
      exercises: sessionExercisesRows.map(se => ({
        ...se,
        sets: setsByExercise.get(se.id) ?? [],
      })),
    }
  })
```

### Verify

```bash
cd apps/api && npx tsc --noEmit
# Expected: 0 errors

grep -B 2 -A 30 "byId: protectedProcedure" apps/api/src/routers/sessions.ts
# Expected: no `exercises[0]` reference; iterates all session exercises
```

### Manual test (after deploy)

- Complete a session with 4+ exercises
- Open the recap screen
- All exercises must show their sets, not just the first

### Commit

```bash
git add apps/api/src/routers/sessions.ts
git commit -m "fix(api): sessions.byId returns sets for all exercises

Was: only fetched sets for sessionExercises[0], silently dropping
data for every other exercise in a session.

Now: fetches all sessionExercises, then all sets in a single query
using inArray() over their IDs, then groups in memory.

Fixes risk register #1 (CRITICAL) from AUDIT_FULL_STATE."
```

## 1.2 · Fix `workouts.detail` N+1 query

**Severity**: HIGH — performance degrades linearly with exercise count.

**File**: `apps/api/src/routers/workouts.ts` lines 110-155

### Read current implementation

```bash
grep -B 2 -A 60 "detail: protectedProcedure\|byId: protectedProcedure" apps/api/src/routers/workouts.ts | head -80
```

The current code likely has a `for` loop calling 2 queries per exercise:
1. Previous session's last set for this exercise
2. Personal record for this exercise

Replace with a single batched query.

### Apply fix

Pseudocode using `LEFT JOIN LATERAL` (Postgres-specific, optimal):

```ts
detail: protectedProcedure
  .input(z.object({ id: z.string().uuid() }))
  .query(async ({ input, ctx }) => {
    // Fetch workout template
    const [workout] = await db.select()
      .from(workoutTemplates)
      .where(and(
        eq(workoutTemplates.id, input.id),
        eq(workoutTemplates.userId, ctx.userId)
      ))
      .limit(1)

    if (!workout) throw new TRPCError({ code: 'NOT_FOUND' })

    // Single query: workout exercises + their previous-session set + their PR
    const enrichedExercises = await db.execute(sql`
      SELECT
        we.id,
        we.exercise_id,
        we.order_index,
        we.sets,
        we.reps,
        we.weight,
        we.rest_seconds,
        e.name AS exercise_name,
        e.muscle_groups,
        prev.weight AS prev_weight,
        prev.reps AS prev_reps,
        pr.weight AS pr_weight,
        pr.reps AS pr_reps
      FROM workout_exercises we
      INNER JOIN exercises e ON e.id = we.exercise_id
      LEFT JOIN LATERAL (
        SELECT es.weight, es.reps
        FROM exercise_sets es
        INNER JOIN session_exercises se ON se.id = es.session_exercise_id
        INNER JOIN workout_sessions ws ON ws.id = se.session_id
        WHERE ws.user_id = ${ctx.userId}
          AND se.exercise_id = we.exercise_id
          AND ws.completed_at IS NOT NULL
        ORDER BY ws.completed_at DESC, es.set_number DESC
        LIMIT 1
      ) prev ON TRUE
      LEFT JOIN LATERAL (
        SELECT pr.weight, pr.reps
        FROM personal_records pr
        WHERE pr.user_id = ${ctx.userId}
          AND pr.exercise_id = we.exercise_id
        ORDER BY pr.achieved_at DESC
        LIMIT 1
      ) pr ON TRUE
      WHERE we.workout_template_id = ${input.id}
      ORDER BY we.order_index ASC
    `)

    return {
      ...workout,
      exercises: enrichedExercises.rows,
    }
  })
```

**Note**: Drizzle's `sql` template requires careful interpolation. If the query syntax is hard to maintain, an acceptable alternative is **3 queries total** (not N×2):
1. Workout + its exercises (1 query with join)
2. Previous sets for all exercise IDs in one batch (with `inArray`)
3. PRs for all exercise IDs in one batch (with `inArray`)

Then merge in memory. Same performance characteristics as LATERAL.

### Apply same pattern to `plans.list`

Risk register implies `plans.list` has a similar N+1. Check:

```bash
grep -B 2 -A 30 "list: protectedProcedure" apps/api/src/routers/plans.ts | head -40
```

If it does `Promise.all` over plans, fetching days per plan, replace with:

1. One query for all user plans
2. One query fetching all days for those plan IDs via `inArray(workoutPlanDays.planId, planIds)`
3. Group days by planId in memory

### Verify

```bash
cd apps/api && npx tsc --noEmit
```

### Commit

```bash
git add apps/api/src/routers/workouts.ts apps/api/src/routers/plans.ts
git commit -m "perf(api): eliminate N+1 in workouts.detail and plans.list

workouts.detail:
- Was: N×2 queries (per-exercise prev set + PR lookup in a loop)
- Now: single query with LEFT JOIN LATERAL for both lookups
- 6-exercise workout: 13 queries → 1 query

plans.list:
- Was: 1+N queries (Promise.all over plans for their days)
- Now: 2 queries (plans + all days via inArray) merged in memory

Fixes risk register #3 (HIGH) from AUDIT_FULL_STATE."
```

## 1.3 · Phase 1 verification

```bash
npx tsc -b --noEmit
# Expected: 0 errors

git log --oneline -3
# Expected: 2 new commits (sessions.byId + workouts.detail)
```

**STOP HERE.** Report:
- 2 fixes committed
- Both procedures rewritten
- Manual test on staging requested for sessions.byId before user-facing rollout

Wait for validation before Phase 2.

---
# Phase 2 — Security & GDPR gaps

**Goal**: close every security and data-protection gap from the audit's risk register.

Items addressed:
- Risk #2 — No GDPR hard-delete cron `[MISSING]`
- Risk #5 — `diet.getMyPlanV2` is `publicProcedure` `[PARTIAL]`
- Risk #6 — OTP rate limiting gap `[PARTIAL]`
- Risk #7 — Email logged in `otp_sent` event `[PARTIAL]`
- Risk #9 — Sign-out swallows server error `[PARTIAL]`
- Risk #11 — `ENCRYPTION_KEY` missing from `.env.example` `[PARTIAL]`
- Risk #12 — String inputs without `.max()` `[PARTIAL]`

Plus: section 1.2 gap (createContext doesn't verify user existence for publicProcedure routes).

## 2.1 · Verify user existence in `createContext`

**File**: `apps/api/src/index.ts` lines 58-70

Currently `createContext` calls `validateSession(token)` which checks Redis only. The DB check happens in `protectedProcedure` middleware. This means `publicProcedure` routes can run with a `userId` for a soft-deleted user.

### Apply fix

Add user existence verification in the context itself:

```ts
// apps/api/src/index.ts (or wherever createContext lives)
import { db } from './db'
import { users } from './db/schema'
import { and, eq, isNull } from 'drizzle-orm'

export async function createContext({ req }: { req: FastifyRequest }) {
  const token = extractToken(req)
  if (!token) return { req, userId: null, db, redis }

  const session = await validateSession(token)
  if (!session) return { req, userId: null, db, redis }

  // NEW: verify user still exists and isn't soft-deleted
  // This catches the gap where publicProcedure routes (e.g. diet.getMyPlanV2)
  // could see a userId for a deleted user.
  const [user] = await db.select({ id: users.id })
    .from(users)
    .where(and(
      eq(users.id, session.userId),
      isNull(users.deletedAt)
    ))
    .limit(1)

  if (!user) {
    // User was deleted - invalidate the session and treat as anonymous
    await revokeSession(token).catch((err) => {
      req.log.warn({ event: 'failed_revoke_orphan_session', err: err.message }, 'orphan session cleanup failed')
    })
    return { req, userId: null, db, redis }
  }

  return { req, userId: session.userId, db, redis }
}
```

### Verify

```bash
cd apps/api && npx tsc --noEmit
```

### Commit

```bash
git add apps/api/src/index.ts
git commit -m "fix(api): verify user existence in createContext

Previously the user existence + soft-delete check only happened in
protectedProcedure middleware. publicProcedure routes (e.g.
diet.getMyPlanV2) could proceed with a userId pointing to a deleted
user.

Now createContext validates the user exists and is not soft-deleted.
If the user is gone, the session is revoked and the request is
treated as anonymous.

Fixes audit section 1.2 [PARTIAL]."
```

## 2.2 · Convert `diet.getMyPlanV2` to `protectedProcedure`

**Risk #5** — `publicProcedure` bypasses user existence/soft-delete check. With 2.1 applied, this is partially mitigated, but `protectedProcedure` is still the correct primitive.

**File**: `apps/api/src/routers/diet.ts` line 238

### Apply fix

```ts
// Before
getMyPlanV2: publicProcedure
  .query(async ({ ctx }) => {
    if (!ctx.userId) return null
    // ...
  })

// After
getMyPlanV2: protectedProcedure
  .query(async ({ ctx }) => {
    // ctx.userId is guaranteed non-null by protectedProcedure
    // ...
  })
```

**Mobile side**: if any screen previously expected `null` from this query for unauthenticated users, those screens are protected by `AuthRedirect` and won't call this endpoint without auth. Verify:

```bash
grep -rn "getMyPlanV2" apps/mobile/src apps/mobile/app
```

If any caller might run before auth, wrap in `enabled: !!user`:

```tsx
const { data } = trpc.diet.getMyPlanV2.useQuery(undefined, {
  enabled: !!user,
})
```

### Verify

```bash
cd apps/api && npx tsc --noEmit
cd apps/mobile && npx tsc --noEmit
```

### Commit

```bash
git add apps/api/src/routers/diet.ts apps/mobile/  # if any mobile changes
git commit -m "fix(api): diet.getMyPlanV2 uses protectedProcedure

Aligns with the rest of the API. publicProcedure bypassed the
user existence and soft-delete checks (partially mitigated by
the fix in 2.1, but protectedProcedure is the correct primitive).

Mobile callers already gated by AuthRedirect; no behavior change.

Fixes risk register #5 [PARTIAL] from AUDIT_FULL_STATE."
```

## 2.3 · Add per-IP rate limit for `requestOtp` and `verifyOtp`

**Risk #6** — single IP can spam many emails because per-IP limit is missing.

**File**: `apps/api/src/middleware/rateLimit.ts`

### Apply fix

Add entries to the `LIMITS` map:

```ts
const LIMITS: Record<string, { max: number; windowSec: number; keyType: 'ip' | 'email' }> = {
  // existing
  'auth.signInWithApple':  { max: 10, windowSec: 60, keyType: 'ip' },
  'auth.signInWithGoogle': { max: 10, windowSec: 60, keyType: 'ip' },
  'auth.guestSignIn':      { max: 5,  windowSec: 60, keyType: 'ip' },

  // ADD these — per-IP cap regardless of which email
  'auth.requestOtp':       { max: 10, windowSec: 60, keyType: 'ip' },
  'auth.verifyOtp':        { max: 30, windowSec: 60, keyType: 'ip' },
}
```

The existing per-email limits (3 sends / 15min, 5 attempts / code) stay — they protect specific users. The new per-IP limit protects against attackers iterating through many emails from one source.

### Verify

```bash
cd apps/api && npx tsc --noEmit
```

Manual test (optional):

```bash
# Loop 12 requestOtp calls from same IP, 11th and 12th should 429
for i in {1..12}; do
  curl -X POST https://your-api.up.railway.app/trpc/auth.requestOtp \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"test+$i@example.com\"}"
  echo
done
```

### Commit

```bash
git add apps/api/src/middleware/rateLimit.ts
git commit -m "fix(api): per-IP rate limit on auth.requestOtp and auth.verifyOtp

Previously only per-email limits existed (3 sends/15min, 5 attempts/code).
A single IP could enumerate emails by iterating addresses without
hitting any per-procedure cap.

Now adds per-IP limits: 10 OTP requests/min and 30 verify attempts/min
per IP, alongside existing per-email limits.

Fixes risk register #6 [PARTIAL] from AUDIT_FULL_STATE."
```

## 2.4 · Stop logging email in `otp_sent` event

**Risk #7** — PII (email) appears in production logs.

**File**: `apps/api/src/routers/auth.ts` line 189 (the `otp_sent` log)

### Apply fix

Replace the email with a safe identifier (deterministic hash or first/last chars only):

```ts
// Before
ctx.req.log.info({ event: 'otp_sent', email }, 'OTP sent')

// After
ctx.req.log.info({
  event: 'otp_sent',
  emailHash: deterministicHash(email),  // already used elsewhere for lookup
  // OR: emailMasked: maskEmail(email)  // 'us***@example.com'
}, 'OTP sent')
```

If `deterministicHash` isn't already imported in `auth.ts`, add the import. If the team prefers a masked form for support readability, write a small helper:

```ts
// apps/api/src/lib/maskEmail.ts
export function maskEmail(email: string): string {
  const [local, domain] = email.split('@')
  if (!local || !domain) return '***'
  const visible = local.slice(0, Math.min(2, local.length))
  return `${visible}${'*'.repeat(Math.max(1, local.length - 2))}@${domain}`
}
```

Audit the rest of `auth.ts` and other routers for similar PII logging:

```bash
grep -rn "log\.\(info\|warn\|error\)" apps/api/src/ | grep -iE "email|password|weight|name"
```

Apply the same masking where found.

### Verify

```bash
cd apps/api && npx tsc --noEmit
```

### Commit

```bash
git add apps/api/src/
git commit -m "fix(api): mask email in OTP and other PII-prone log events

Previously otp_sent (auth.ts:189) logged the raw email address,
appearing in production Pino/Sentry logs.

Now logs the deterministic email hash (already used for DB lookup)
or a masked form. Audited the rest of api/src for similar patterns.

Fixes risk register #7 [PARTIAL] from AUDIT_FULL_STATE."
```

## 2.5 · Add Sentry beforeSend / beforeBreadcrumb scrubbers

Section 2.3 of the audit flagged this as `[UNKNOWN]` (no scrubbers configured). Add them now.

**Files**:
- `apps/api/src/index.ts` (Sentry.init call)
- `apps/mobile/app/_layout.tsx` (Sentry.init call)

### Apply fix

Both API and mobile should scrub potentially sensitive fields. Define a shared helper:

```ts
// apps/api/src/lib/sentryScrub.ts
const SENSITIVE_KEYS = [
  'email', 'password', 'token', 'authorization', 'cookie',
  'weightKg', 'heightCm', 'dateOfBirth', 'gender',
]

function scrubObject(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj
  if (Array.isArray(obj)) return obj.map(scrubObject)
  const out: any = {}
  for (const [k, v] of Object.entries(obj)) {
    if (SENSITIVE_KEYS.includes(k)) {
      out[k] = '[REDACTED]'
    } else if (typeof v === 'object') {
      out[k] = scrubObject(v)
    } else {
      out[k] = v
    }
  }
  return out
}

export function sentryBeforeSend(event: any) {
  if (event.request?.headers) event.request.headers = scrubObject(event.request.headers)
  if (event.request?.data) event.request.data = scrubObject(event.request.data)
  if (event.extra) event.extra = scrubObject(event.extra)
  if (event.contexts) event.contexts = scrubObject(event.contexts)
  return event
}

export function sentryBeforeBreadcrumb(breadcrumb: any) {
  if (breadcrumb.data) breadcrumb.data = scrubObject(breadcrumb.data)
  return breadcrumb
}
```

Same helper structure in `apps/mobile/src/lib/sentryScrub.ts`.

In each Sentry init:

```ts
import { sentryBeforeSend, sentryBeforeBreadcrumb } from './lib/sentryScrub'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
  beforeSend: sentryBeforeSend,
  beforeBreadcrumb: sentryBeforeBreadcrumb,
})
```

### Verify

```bash
npx tsc -b --noEmit
```

### Commit

```bash
git add apps/api/src/lib/sentryScrub.ts apps/mobile/src/lib/sentryScrub.ts \
        apps/api/src/index.ts apps/mobile/app/_layout.tsx
git commit -m "feat(obs): scrub PII from Sentry events and breadcrumbs

Adds beforeSend / beforeBreadcrumb hooks on both API and mobile
Sentry init. Redacts email, password, token, weightKg, heightCm,
dateOfBirth, gender, and authorization headers before transmission.

Closes audit section 2.3 (PII in Sentry breadcrumbs) which was
[UNKNOWN] in AUDIT_FULL_STATE."
```

## 2.6 · Make sign-out resilient to network failures

**Risk #9** — if the server `auth.signOut` call fails, server session stays valid even though local token is cleared. User appears signed out locally but their token still works elsewhere.

**File**: `apps/mobile/src/contexts/AuthContext.tsx` (or wherever `signOut` lives)

### Apply fix

Two strategies, apply both:

**Strategy A — Make the failure visible**:

```ts
async function signOut() {
  let serverRevokeSucceeded = false
  try {
    await trpcClient.auth.signOut.mutate()
    serverRevokeSucceeded = true
  } catch (err) {
    // Don't silently swallow - log to Sentry for visibility
    Sentry.captureException(err, {
      tags: { event: 'sign_out_server_revoke_failed' },
    })
    // Optionally show a toast: "Signed out locally. Server revoke will retry."
  }

  // Always clear local state regardless of server result
  await SecureStore.deleteItemAsync('session-token')
  setToken(null)
  queryClient.clear()
  // Clear any other Zustand stores that hold user data

  // If server revoke failed, queue a retry
  if (!serverRevokeSucceeded) {
    enqueueSignOutRetry(/* token captured before delete */)
  }
}
```

**Strategy B — Retry queue**:

If a sync queue exists in the app (e.g., per the offline-first plan), use it. Otherwise add a minimal retry helper:

```ts
// apps/mobile/src/lib/signOutRetry.ts
import { storage } from './storage'  // MMKV
import { trpcClient } from './trpc'

const KEY = 'pending-signouts-v1'

type Pending = { token: string; queuedAt: string }

export function enqueueSignOutRetry(token: string) {
  const queue: Pending[] = JSON.parse(storage.getString(KEY) ?? '[]')
  queue.push({ token, queuedAt: new Date().toISOString() })
  storage.set(KEY, JSON.stringify(queue))
}

export async function flushSignOutRetries() {
  const queue: Pending[] = JSON.parse(storage.getString(KEY) ?? '[]')
  if (queue.length === 0) return
  const remaining: Pending[] = []
  for (const item of queue) {
    try {
      await trpcClient.auth.signOutWithToken.mutate({ token: item.token })
      // success: drop from queue
    } catch (err) {
      // keep for next retry, but drop if older than 7 days
      const age = Date.now() - new Date(item.queuedAt).getTime()
      if (age < 7 * 24 * 3600 * 1000) {
        remaining.push(item)
      }
    }
  }
  storage.set(KEY, JSON.stringify(remaining))
}
```

**Backend**: needs an `auth.signOutWithToken` procedure that accepts a specific token rather than the current session — used only by the retry path. Same logic as `signOut` but takes input.

```ts
// apps/api/src/routers/auth.ts
signOutWithToken: publicProcedure
  .input(z.object({ token: z.string().min(20).max(200) }))
  .mutation(async ({ input }) => {
    await revokeSession(input.token).catch(() => {})
    return { success: true }
  })
```

Apply rate limit to this new procedure (same map as 2.3): 10/min per IP.

Call `flushSignOutRetries()` on app launch:

```ts
// _layout.tsx
useEffect(() => {
  flushSignOutRetries().catch(() => {})
}, [])
```

### Verify

```bash
npx tsc -b --noEmit
```

### Commit

```bash
git add apps/mobile/src/contexts/AuthContext.tsx \
        apps/mobile/src/lib/signOutRetry.ts \
        apps/mobile/app/_layout.tsx \
        apps/api/src/routers/auth.ts \
        apps/api/src/middleware/rateLimit.ts
git commit -m "fix(auth): resilient sign-out with retry queue

Was: client wrapped server signOut in silent try/catch. Network
failure left server session valid while local token was cleared.

Now:
- Sentry captures server revoke failures (audit visibility)
- Failed revokes queued in MMKV with token
- flushSignOutRetries() called on app launch (and other foreground
  events if applicable)
- New backend procedure auth.signOutWithToken accepts specific
  token (rate-limited 10/min/IP)
- Queue items expire after 7 days

Fixes risk register #9 [PARTIAL] from AUDIT_FULL_STATE."
```

## 2.7 · Add `ENCRYPTION_KEY` to `.env.example` and fail loudly when absent

**Risk #11** — devs may silently skip encryption.

**Files**:
- `apps/api/.env.example`
- `apps/api/src/lib/cryptoService.ts` (or wherever encryption is)

### Apply fix

**Update `.env.example`**:

```bash
# apps/api/.env.example - add these lines
ENCRYPTION_KEY=  # Required. 32 bytes base64. Generate: openssl rand -base64 32
EMAIL_HASH_SALT=  # Required. Any random string for SHA-256(email + salt) lookup column
```

**Update `cryptoService.ts`**:

Find where encryption falls back silently. Replace with hard failure in production:

```ts
// Before (likely)
function getKey(): Buffer | null {
  const key = process.env.ENCRYPTION_KEY
  if (!key) return null  // silently fall through to plaintext
  return Buffer.from(key, 'base64')
}

// After
function getKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY
  if (!key) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'ENCRYPTION_KEY is required in production. ' +
        'Generate one with `openssl rand -base64 32` and set it in env.'
      )
    }
    // Dev only: log a clear warning, return a fixed dev key
    console.warn(
      '[cryptoService] ENCRYPTION_KEY not set. Using insecure dev key. ' +
      'DO NOT use this in production.'
    )
    return Buffer.from('dev-insecure-key-do-not-use-in-prod-padding!', 'utf-8').slice(0, 32)
  }
  return Buffer.from(key, 'base64')
}
```

This way:
- Production: app crashes loudly on startup if missing → no silent insecure deploys
- Development: app runs but logs a visible warning every time encryption is invoked

Same pattern for `EMAIL_HASH_SALT` if it has the same silent-fallback issue.

### Verify

```bash
cd apps/api && npx tsc --noEmit

# Manual test: temporarily unset ENCRYPTION_KEY in a prod-like run
# Should crash at startup with the clear message
```

### Commit

```bash
git add apps/api/.env.example apps/api/src/lib/cryptoService.ts
git commit -m "fix(api): hard-fail on missing ENCRYPTION_KEY in production

Was: encryption silently degraded to plaintext when ENCRYPTION_KEY
was unset. Devs may not notice the gap. .env.example didn't even
list the variable.

Now:
- ENCRYPTION_KEY and EMAIL_HASH_SALT documented in .env.example
- Production: throws at startup if either is missing
- Development: visible console.warn on every encryption call,
  uses a fixed dev key

Fixes risk register #11 [PARTIAL] from AUDIT_FULL_STATE."
```

## 2.8 · Add `.max()` to all string Zod schemas

**Risk #12** — DoS via oversized payloads on routes without length limits.

### Apply fix

The audit listed specific files. Walk through each and add limits:

#### `apps/api/src/routers/workouts.ts`

```ts
// Line 17
name: z.string().min(1).max(100),  // was no max

// Line 19, 79 - muscleGroups
muscleGroups: z.array(z.string().max(50)).max(20),  // was z.array(z.string())
```

#### `apps/api/src/routers/sessions.ts`

```ts
// Line 277 - muscleGroups
muscleGroups: z.array(z.string().max(50)).max(20),
```

#### `apps/api/src/routers/plans.ts`

```ts
// Line 509 - muscleGroups
muscleGroups: z.array(z.string().max(50)).max(20),

// Plan name
name: z.string().min(1).max(100),
```

#### ID parameters - validate as UUID where applicable

The audit mentioned `z.object({ id: z.string() })` lacks UUID validation. Audit all routers:

```bash
grep -rn "id: z.string()" apps/api/src/routers/
```

For any ID that's a UUID (most are), use `.uuid()`:

```ts
// Before
input(z.object({ id: z.string() }))

// After
input(z.object({ id: z.string().uuid() }))
```

For non-UUID IDs (e.g., exercise slug), use `.min(1).max(50)` or appropriate length.

#### Other text inputs

Sweep for other unconstrained strings:

```bash
grep -rn "z\.string()" apps/api/src/routers/ | grep -v "max\|email\|uuid\|datetime\|url"
```

For each, decide:
- Names, titles, labels: `.max(100)` or `.max(200)`
- Descriptions, notes: `.max(500)` or `.max(2000)`
- Free-text content (AI prompt): `.max(2000)`
- Any unbounded → bound it

### Verify

```bash
cd apps/api && npx tsc --noEmit
cd apps/api && npx vitest run  # if tests exist
```

### Commit

```bash
git add apps/api/src/routers/
git commit -m "fix(api): bound all string and array Zod inputs with .max()

Audit risk #12: unconstrained z.string() / z.array(z.string())
allowed potential DoS via oversized payloads.

Changes:
- Names/titles: .max(100)
- Descriptions: .max(500)
- AI prompts: .max(2000)
- muscleGroups arrays: .max(20) items, each .max(50) chars
- ID inputs: .uuid() where applicable

Fixes risk register #12 [PARTIAL] from AUDIT_FULL_STATE."
```

## 2.9 · GDPR hard-delete cron (Risk #2)

**Severity**: CRITICAL — `CLAUDE.md` promises 30-day hard wipe but nothing implements it.

### Apply fix

**Create** `apps/api/src/jobs/hardDeleteExpiredUsers.ts`:

```ts
/**
 * Hard-delete users soft-deleted more than 30 days ago.
 * GDPR compliance — promised in CLAUDE.md.
 *
 * Run daily via node-cron (registered in apps/api/src/index.ts).
 * Can also be invoked manually: npm run job:hard-delete-users
 */

import { db } from '../db/index.js'
import { users } from '../db/schema.js'
import { and, lt, isNotNull, eq } from 'drizzle-orm'

const RETENTION_DAYS = 30

export async function hardDeleteExpiredUsers() {
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 3600 * 1000)

  const candidates = await db.select({ id: users.id })
    .from(users)
    .where(and(
      isNotNull(users.deletedAt),
      lt(users.deletedAt, cutoff),
    ))

  if (candidates.length === 0) {
    console.log(`[hardDeleteExpiredUsers] no users past ${RETENTION_DAYS}-day retention`)
    return { deleted: 0 }
  }

  console.log(`[hardDeleteExpiredUsers] deleting ${candidates.length} users past retention`)

  // Cascade delete via FK rules in schema OR explicit cleanup of related rows.
  // Verify all foreign keys to users.id are ON DELETE CASCADE.
  // Otherwise delete related rows first (workouts, sessions, plans, weight, diet plans, etc.).

  let deleted = 0
  for (const { id } of candidates) {
    try {
      await db.delete(users).where(eq(users.id, id))
      deleted++
    } catch (err) {
      console.error(`[hardDeleteExpiredUsers] failed to delete user ${id}`, err)
      // Don't throw — continue with the rest. Will retry tomorrow.
    }
  }

  console.log(`[hardDeleteExpiredUsers] done: deleted=${deleted}/${candidates.length}`)
  return { deleted, total: candidates.length }
}
```

### Verify FK cascades

```bash
grep -rn "references.*users.*onDelete\|on delete cascade" apps/api/src/db/schema.ts | head -20
```

For every table with `userId` referencing `users.id`, the FK must declare `onDelete: 'cascade'`. If any table doesn't, either:
- Add `onDelete: 'cascade'` and migrate
- Or delete the rows explicitly in the cron before deleting the user

For V1, **explicit deletion is safer** (you control the order):

```ts
// Inside hardDeleteExpiredUsers, before deleting user:
await db.delete(exerciseSets).where(/* via session_exercise → session.user */)
await db.delete(sessionExercises).where(/* via session.user */)
await db.delete(workoutSessions).where(eq(workoutSessions.userId, id))
await db.delete(workoutPlanDays).where(/* via plan.user */)
await db.delete(workoutPlans).where(eq(workoutPlans.userId, id))
await db.delete(workoutExercises).where(/* via template.user */)
await db.delete(workoutTemplates).where(eq(workoutTemplates.userId, id))
await db.delete(weightEntries).where(eq(weightEntries.userId, id))
await db.delete(personalRecords).where(eq(personalRecords.userId, id))
// ... diet tables
await db.delete(users).where(eq(users.id, id))
```

Wrap each user's deletion in a transaction:

```ts
await db.transaction(async (tx) => {
  await tx.delete(/*...*/).where(/*...*/)
  await tx.delete(users).where(eq(users.id, id))
})
```

### Register the cron

**File**: `apps/api/src/index.ts`

```bash
cd apps/api && npm install node-cron @types/node-cron
```

```ts
// In index.ts, after Fastify server starts
import cron from 'node-cron'
import { hardDeleteExpiredUsers } from './jobs/hardDeleteExpiredUsers.js'

// Run daily at 3am UTC (low-traffic window)
cron.schedule('0 3 * * *', () => {
  hardDeleteExpiredUsers().catch((err) => {
    console.error('[cron] hardDeleteExpiredUsers failed', err)
    Sentry.captureException(err, { tags: { event: 'cron_hard_delete_failed' } })
  })
})
```

### Add manual run script

**File**: `apps/api/src/scripts/run-hard-delete.ts`

```ts
import { hardDeleteExpiredUsers } from '../jobs/hardDeleteExpiredUsers.js'

hardDeleteExpiredUsers()
  .then((result) => {
    console.log('Done:', result)
    process.exit(0)
  })
  .catch((err) => {
    console.error('Failed:', err)
    process.exit(1)
  })
```

In `apps/api/package.json`:

```json
{
  "scripts": {
    "job:hard-delete-users": "tsx src/scripts/run-hard-delete.ts"
  }
}
```

### Verify

```bash
cd apps/api && npx tsc --noEmit
```

Manual smoke test on staging:

```bash
# Manually trigger
npm run job:hard-delete-users
```

### Commit

```bash
git add apps/api/src/jobs/hardDeleteExpiredUsers.ts \
        apps/api/src/scripts/run-hard-delete.ts \
        apps/api/src/index.ts \
        apps/api/package.json
git commit -m "feat(gdpr): hard-delete users 30 days after soft delete

CLAUDE.md promises 30-day data retention after account deletion;
no implementation existed. Now adds:

- apps/api/src/jobs/hardDeleteExpiredUsers.ts — daily cron job
- Explicit cascade deletion of all user-owned rows in a transaction
- Wrapped in node-cron daily at 3am UTC
- Manual trigger via npm run job:hard-delete-users
- Sentry alert on cron failure

Fixes risk register #2 (CRITICAL/MISSING) from AUDIT_FULL_STATE."
```

## 2.10 · Phase 2 verification

```bash
npx tsc -b --noEmit
# Expected: 0 errors

git log --oneline -10
# Expected: ~9 new commits since Phase 1
```

**STOP HERE.** Report:
- 9 commits made (createContext, getMyPlanV2, OTP rate limit, email masking, Sentry scrub, sign-out resilience, ENCRYPTION_KEY, .max() inputs, GDPR cron)
- All 7 risk register security items addressed
- Plus the audit section 2.3 [UNKNOWN] now resolved

Wait for user validation before Phase 3.

---
# Phase 3 — Performance & query optimization

**Goal**: address remaining performance issues that the audit flagged.

Items addressed:
- Risk #4 — AI generation has no timeout `[MISSING]`
- Risk #8 — Missing DB indexes `[PARTIAL]`

(Risk #3 — N+1 queries — already fixed in Phase 1.)

## 3.1 · Add timeout + AbortSignal to all Anthropic calls (Risk #4)

**Files**:
- `apps/api/src/routers/plans.ts` (workout AI)
- `apps/api/src/lib/diet/generatePlanWithClaude.ts` (diet AI)

### Apply fix

The Anthropic SDK accepts an `AbortSignal` in request options. Wrap each call with a timeout.

#### Workout AI (`plans.ts`)

Find the `generateWithAI` mutation. Locate the `anthropicClient.messages.create(...)` call:

```ts
const ANTHROPIC_TIMEOUT_MS = 90_000  // 90s — generous, but bounded

const controller = new AbortController()
const timeoutId = setTimeout(() => controller.abort(), ANTHROPIC_TIMEOUT_MS)

let rawResponse: Anthropic.Message
try {
  rawResponse = await anthropicClient.messages.create(
    {
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      messages: [/*...*/],
      system: systemPrompt,
    },
    { signal: controller.signal }  // pass the signal in request options
  )
} catch (err) {
  if (controller.signal.aborted) {
    console.error('[ANTHROPIC_TIMEOUT]', {
      procedure: 'plans.generateWithAI',
      userId: ctx.userId,
      timeoutMs: ANTHROPIC_TIMEOUT_MS,
    })
    throw new TRPCError({
      code: 'TIMEOUT',
      message: 'La génération a pris trop de temps. Réessaie.',
      cause: err,
    })
  }
  // existing error handling
  throw err
} finally {
  clearTimeout(timeoutId)
}
```

#### Diet AI (`generatePlanWithClaude.ts`)

Diet uses **streaming** with `max_tokens: 64000` on Opus — can legitimately take 60+ seconds. Use a longer timeout:

```ts
const DIET_AI_TIMEOUT_MS = 180_000  // 3 minutes — diet is heavy
```

Same `AbortController` pattern. For streaming, abort applies to the whole stream — once aborted, partial output is discarded.

```ts
const controller = new AbortController()
const timeoutId = setTimeout(() => controller.abort(), DIET_AI_TIMEOUT_MS)

try {
  const stream = anthropicClient.messages.stream(
    { /* params */ },
    { signal: controller.signal }
  )

  for await (const event of stream) {
    // existing stream handling
  }

  const finalMessage = await stream.finalMessage()
  // ...
} catch (err) {
  if (controller.signal.aborted) {
    console.error('[ANTHROPIC_TIMEOUT]', {
      procedure: 'diet.generatePlan',
      timeoutMs: DIET_AI_TIMEOUT_MS,
    })
    throw new TRPCError({
      code: 'TIMEOUT',
      message: 'La génération du plan diététique a pris trop de temps. Réessaie.',
    })
  }
  throw err
} finally {
  clearTimeout(timeoutId)
}
```

### Verify

```bash
cd apps/api && npx tsc --noEmit
```

Manual test (optional): set timeout to 1ms temporarily and confirm error path:

```ts
const ANTHROPIC_TIMEOUT_MS = 1  // FORCE timeout
```

Trigger AI generation → should return TIMEOUT error within 1 second. Revert.

### Commit

```bash
git add apps/api/src/routers/plans.ts apps/api/src/lib/diet/generatePlanWithClaude.ts
git commit -m "fix(api): timeout + AbortSignal on Anthropic calls

Was: no timeout on either AI generation. Hung calls held server
resources indefinitely (e.g. on Anthropic outages).

Now:
- Workout AI: 90s timeout
- Diet AI: 180s timeout (streaming, larger context, justified)
- AbortController + AbortSignal passed via SDK request options
- TIMEOUT TRPCError surfaced to client with French message
- [ANTHROPIC_TIMEOUT] log breadcrumb for Sentry visibility

Fixes risk register #4 (HIGH/MISSING) from AUDIT_FULL_STATE."
```

## 3.2 · Add missing DB indexes (Risk #8)

**File**: `apps/api/src/db/schema.ts`

Audit identified 4 missing indexes:
- `workoutPlanDays(planId)`
- `workoutTemplates(userId)`
- `workoutExercises(workoutTemplateId)`
- `exercises(difficulty)` and/or `exercises(muscleGroups)`

### Apply fix in Drizzle schema

Find each table definition and add an index:

```ts
// workoutTemplates - add index on userId
export const workoutTemplates = pgTable('workout_templates', {
  // ... columns
}, (t) => ({
  wtUserIdx: index('wt_user_idx').on(t.userId),  // NEW
}))

// workoutExercises - add index on workoutTemplateId
export const workoutExercises = pgTable('workout_exercises', {
  // ... columns
}, (t) => ({
  weTemplateIdx: index('we_template_idx').on(t.workoutTemplateId),  // NEW
}))

// workoutPlanDays - add index on planId
export const workoutPlanDays = pgTable('workout_plan_days', {
  // ... columns
}, (t) => ({
  wpdPlanIdx: index('wpd_plan_idx').on(t.planId),  // NEW
}))

// exercises - decide on indexed columns based on actual query patterns
// muscleGroups is usually filtered with array containment — needs GIN index
export const exercises = pgTable('exercises', {
  // ... columns
}, (t) => ({
  exDifficultyIdx: index('ex_difficulty_idx').on(t.difficulty),  // NEW
  // For muscleGroups (text[]): use GIN. Drizzle may not support inline GIN —
  // fall back to a raw SQL migration if needed.
}))
```

### Generate the migration

```bash
cd apps/api
npx drizzle-kit generate
# Review the generated SQL, ensure it adds the indexes (CREATE INDEX statements)
ls -lt src/db/migrations/ | head -3
```

If Drizzle doesn't support `GIN` indexes natively in the schema DSL, add a raw SQL line to the generated migration file:

```sql
-- Manually appended after generation
CREATE INDEX IF NOT EXISTS ex_muscle_groups_gin_idx
  ON exercises USING GIN (muscle_groups);
```

### Run the migration on local first

```bash
# Local dev DB
npm run db:migrate
```

Verify indexes were created:

```sql
-- In psql against local DB
SELECT indexname FROM pg_indexes WHERE tablename IN
  ('workout_templates', 'workout_exercises', 'workout_plan_days', 'exercises')
ORDER BY tablename, indexname;
```

### Verify schema typecheck

```bash
cd apps/api && npx tsc --noEmit
```

### Commit

```bash
git add apps/api/src/db/schema.ts apps/api/src/db/migrations/
git commit -m "perf(db): add missing indexes on hot query paths

- workout_templates(user_id)
- workout_exercises(workout_template_id)
- workout_plan_days(plan_id)
- exercises(difficulty)
- exercises(muscle_groups) GIN — for array containment queries

Fixes risk register #8 [PARTIAL] from AUDIT_FULL_STATE.
Migration auto-applied on next deploy via existing startup migrations."
```

## 3.3 · Bonus: explicit `pg.Pool` max config (audit 15.3 [PARTIAL])

The audit flagged that `pg.Pool` uses default `max: 10`. Acceptable for V1 but worth setting explicitly so it's tunable per environment.

**File**: `apps/api/src/db/index.ts`

```ts
// Before
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

// After
const POOL_MAX = parseInt(process.env.DB_POOL_MAX ?? '10', 10)
const POOL_IDLE_TIMEOUT = parseInt(process.env.DB_POOL_IDLE_TIMEOUT_MS ?? '30000', 10)

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: POOL_MAX,
  idleTimeoutMillis: POOL_IDLE_TIMEOUT,
})
```

Document in `apps/api/.env.example`:

```bash
# Optional: tune pg connection pool
DB_POOL_MAX=10
DB_POOL_IDLE_TIMEOUT_MS=30000
```

### Commit

```bash
git add apps/api/src/db/index.ts apps/api/.env.example
git commit -m "chore(db): explicit pg.Pool max + idle timeout via env

Was: implicit defaults. Tunable per environment via DB_POOL_MAX
and DB_POOL_IDLE_TIMEOUT_MS env vars. Defaults preserved.

Closes audit section 15.3 [PARTIAL]."
```

## 3.4 · Phase 3 verification

```bash
npx tsc -b --noEmit
# Expected: 0 errors

git log --oneline -5
# Expected: 3 new commits
```

**STOP HERE.** Report:
- 3 fixes committed
- AI calls bounded by timeout
- 5 new indexes
- Pool config tunable

Wait for user validation before Phase 4.

---

# Phase 4 — Architecture consistency

**Goal**: align the codebase with `CLAUDE.md` architecture promises.

Items addressed:
- Risk #10 — Data hook abstraction ~50% adopted `[PARTIAL]`
- Risk #15 — `SectionStatus` not used in home, history, diet `[PARTIAL]`

## 4.1 · Wire `SectionStatus` into home, history, diet (Risk #15)

Per the previous Error Isolation prompt, this was supposed to be done. Audit confirms 3 tabs still bypass it. Apply now.

### 4.1.1 · Home tab — `apps/mobile/app/(tabs)/index.tsx`

Audit flagged direct queries:
- `trpc.diet.getMyPlanV2.useQuery()`
- `trpc.progress.lastSessionPRCount.useQuery()`

Wrap each in `<SectionStatus>`:

```tsx
import { SectionStatus } from '../../src/components/SectionStatus'

// Replace
const { data: dietPlan } = trpc.diet.getMyPlanV2.useQuery()
return dietPlan ? <DietHeroCard plan={dietPlan} /> : null

// With
const dietPlanQuery = trpc.diet.getMyPlanV2.useQuery()
return (
  <SectionStatus
    query={dietPlanQuery}
    errorLabel="ton plan diététique"
    loadingHeight={140}
    hideWhenEmpty
  >
    {(plan) => <DietHeroCard plan={plan} />}
  </SectionStatus>
)
```

Apply to every query-driven block on Home.

### 4.1.2 · History tab — `apps/mobile/app/(tabs)/history.tsx`

Direct queries:
- `trpc.history.list.useQuery`
- `trpc.history.stats.useQuery`

Two natural sections — stats strip + list. Wrap each:

```tsx
const statsQuery = trpc.history.stats.useQuery()
const listQuery = trpc.history.list.useQuery()

return (
  <SectionList
    sections={...}
    ListHeaderComponent={
      <SectionStatus query={statsQuery} errorLabel="les statistiques" loadingHeight={120}>
        {(stats) => <HistoryStatsStrip stats={stats} />}
      </SectionStatus>
    }
    // wrap the list rendering itself in SectionStatus is tricky with SectionList;
    // instead, conditionally render based on listQuery.isError
    renderItem={...}
    ListEmptyComponent={
      <SectionStatus query={listQuery} errorLabel="l'historique" loadingHeight={400}>
        {() => null /* SectionList handles empty */}
      </SectionStatus>
    }
  />
)
```

Adjust based on actual code structure.

### 4.1.3 · Diet tab — `apps/mobile/app/(tabs)/diet.tsx`

Direct queries:
- `trpc.diet.planCount.useQuery()`
- `trpc.diet.getMyPlanV2.useQuery()`

Same pattern:

```tsx
const countQuery = trpc.diet.planCount.useQuery()
const planQuery = trpc.diet.getMyPlanV2.useQuery()

return (
  <ScrollView>
    <SectionStatus query={countQuery} errorLabel="le compteur de plans" loadingHeight={60}>
      {(count) => <PlanCountStrip count={count} />}
    </SectionStatus>

    <SectionStatus query={planQuery} errorLabel="le plan actif" loadingHeight={400}>
      {(plan) => <DietPlanDisplay plan={plan} />}
    </SectionStatus>
  </ScrollView>
)
```

### Verify

```bash
grep -n "SectionStatus" apps/mobile/app/\(tabs\)/index.tsx \
                        apps/mobile/app/\(tabs\)/history.tsx \
                        apps/mobile/app/\(tabs\)/diet.tsx
# Expected: at least 1 usage per file

cd apps/mobile && npx tsc --noEmit
```

### Commit

```bash
git add apps/mobile/app/\(tabs\)/index.tsx apps/mobile/app/\(tabs\)/history.tsx apps/mobile/app/\(tabs\)/diet.tsx
git commit -m "refactor(mobile): wire SectionStatus into home, history, diet tabs

All 5 main tabs (profile, training, home, history, diet) now use
SectionStatus for per-section error isolation. A failure in one
section doesn't kill the whole screen.

Fixes risk register #15 [PARTIAL] from AUDIT_FULL_STATE."
```

## 4.2 · Migrate remaining tabs to `src/data/*` hooks (Risk #10)

**Audit findings**: 5 tabs bypass `src/data/*` and call tRPC directly. Goal: ~0 direct tRPC calls in screens.

### Strategy

For each direct tRPC call in a screen, either:
- Use existing hook from `src/data/` if available
- Create a thin hook wrapper if not

### 4.2.1 · Inventory the violations

```bash
grep -rn "trpc\.[a-z]*\.[a-z]*\.use\(Query\|Mutation\)" apps/mobile/app/\(tabs\)/
```

Per audit, expected violations:
- `index.tsx` — `trpc.diet.getMyPlanV2`, `trpc.progress.lastSessionPRCount`
- `history.tsx` — `trpc.history.list`, `trpc.history.stats`
- `diet.tsx` — `trpc.diet.planCount`, `trpc.diet.getMyPlanV2`
- `training.tsx` — `trpc.plans.list`
- `profile.tsx` — `trpc.progress.records`

### 4.2.2 · Create missing hooks

For each unique tRPC call, ensure a hook exists in `src/data/`:

```bash
ls apps/mobile/src/data/
```

Existing per audit: `useActivePlan`, `useProfile`, `useSessions`, `useWeight`, `useWorkouts`.

**Create** the missing ones:

```ts
// apps/mobile/src/data/useDietPlan.ts
import { trpc } from '../lib/trpc'

export function useDietPlan() {
  return trpc.diet.getMyPlanV2.useQuery()
}

export type DietPlan = NonNullable<ReturnType<typeof useDietPlan>['data']>
```

```ts
// apps/mobile/src/data/useDietPlanCount.ts
import { trpc } from '../lib/trpc'

export function useDietPlanCount() {
  return trpc.diet.planCount.useQuery()
}
```

```ts
// apps/mobile/src/data/useHistory.ts
import { trpc } from '../lib/trpc'

export function useHistoryList() {
  return trpc.history.list.useQuery()
}

export function useHistoryStats() {
  return trpc.history.stats.useQuery()
}
```

```ts
// apps/mobile/src/data/useProgress.ts
import { trpc } from '../lib/trpc'

export function useLastSessionPRCount() {
  return trpc.progress.lastSessionPRCount.useQuery()
}

export function usePersonalRecords() {
  return trpc.progress.records.useQuery()
}
```

```ts
// apps/mobile/src/data/usePlansList.ts (if not already in useActivePlan)
import { trpc } from '../lib/trpc'

export function usePlansList() {
  return trpc.plans.list.useQuery()
}
```

### 4.2.3 · Replace direct calls

In each tab file, replace direct `trpc.X.useQuery()` with the hook import:

```tsx
// Before
const { data: plans } = trpc.plans.list.useQuery()

// After
import { usePlansList } from '../../src/data/usePlansList'
const { data: plans } = usePlansList()
```

Repeat for every direct call identified in 4.2.1.

### Verify

```bash
grep -rn "trpc\.[a-z]*\.[a-z]*\.use\(Query\|Mutation\)" apps/mobile/app/\(tabs\)/
# Expected: 0 results

cd apps/mobile && npx tsc --noEmit
```

### Commit

```bash
git add apps/mobile/src/data/ apps/mobile/app/\(tabs\)/
git commit -m "refactor(mobile): migrate all tab queries to src/data hooks

CLAUDE.md architecture: screens consume src/data/* hooks,
never trpc.X.useQuery directly. Audit found ~50% adoption;
this commit completes the migration.

Created: useDietPlan, useDietPlanCount, useHistoryList,
useHistoryStats, useLastSessionPRCount, usePersonalRecords,
usePlansList.

Now zero direct tRPC calls in app/(tabs)/.

Fixes risk register #10 [PARTIAL] from AUDIT_FULL_STATE."
```

## 4.3 · Phase 4 verification

```bash
# Confirm no tRPC leaks
grep -rn "trpc\.[a-z]*\.[a-z]*\.use\(Query\|Mutation\)" apps/mobile/app/

# Confirm SectionStatus everywhere
for tab in profile index training diet history; do
  count=$(grep -c "SectionStatus" apps/mobile/app/\(tabs\)/$tab.tsx 2>/dev/null)
  echo "$tab: $count usages"
done

npx tsc -b --noEmit
```

**STOP HERE.** Report:
- 2 commits made
- All tabs use `SectionStatus`
- Zero direct tRPC in tab screens
- All 11 hooks exist in `src/data/`

Wait for user validation before Phase 5.

---
# Phase 5 — Polish & dev experience

**Goal**: address every remaining LOW item from the risk register. These are dev experience and small quality issues — none are blocking, but they're all included since "ne laisse rien de côté".

Items addressed:
- Risk #13 — Only 4 test files total `[PARTIAL]`
- Risk #14 — Hardcoded English muscle groups in builder `[PARTIAL]`
- Risk #16 — 18 `as any` type escapes `[PARTIAL]`
- Risk #17 — Onboarding progress not persisted `[PARTIAL]`
- Risk #18 — `*.tsbuildinfo` not in `.gitignore` `[PARTIAL]`

Plus audit section 9.4 [PARTIAL] (no systematic toast pattern for mutations) and section 13.3 [PARTIAL] (ScrollView vs FlatList).

## 5.1 · Add `*.tsbuildinfo` to `.gitignore` (Risk #18)

Trivial fix.

```bash
# Append to root .gitignore
echo "" >> .gitignore
echo "# TypeScript incremental build cache" >> .gitignore
echo "*.tsbuildinfo" >> .gitignore

# Untrack any already-committed
git rm --cached apps/api/tsconfig.tsbuildinfo 2>/dev/null || true
git rm --cached apps/mobile/tsconfig.tsbuildinfo 2>/dev/null || true
```

### Commit

```bash
git add .gitignore
git commit -m "chore: ignore *.tsbuildinfo across the monorepo

Untracked apps/api/tsconfig.tsbuildinfo and
apps/mobile/tsconfig.tsbuildinfo from git status. These are
incremental build artifacts.

Fixes risk register #18 [PARTIAL] from AUDIT_FULL_STATE."
```

## 5.2 · i18n the muscle groups (Risk #14)

**File**: `apps/mobile/app/workout/build.tsx` line 24

The `MUSCLE_GROUPS` array is hardcoded English (`'Chest', 'Back', ...`). Should be French via i18n.

### Apply fix

#### 5.2.1 · Add muscle group keys to the locale file

```ts
// apps/mobile/src/locales/fr.ts (add to existing structure)
export const fr = {
  // ... existing
  muscleGroups: {
    chest: 'Pectoraux',
    back: 'Dos',
    shoulders: 'Épaules',
    biceps: 'Biceps',
    triceps: 'Triceps',
    legs: 'Jambes',
    glutes: 'Fessiers',
    abs: 'Abdos',
    forearms: 'Avant-bras',
    calves: 'Mollets',
  },
} as const
```

(Adjust the keys to match what's currently in the codebase — don't invent new ones.)

#### 5.2.2 · Update `build.tsx`

```ts
// Before
const MUSCLE_GROUPS = ['Chest', 'Back', 'Shoulders', /* ... */]

// After
import { fr as t } from '../../src/locales/fr'

const MUSCLE_GROUPS = [
  { id: 'chest',     label: t.muscleGroups.chest },
  { id: 'back',      label: t.muscleGroups.back },
  { id: 'shoulders', label: t.muscleGroups.shoulders },
  { id: 'biceps',    label: t.muscleGroups.biceps },
  { id: 'triceps',   label: t.muscleGroups.triceps },
  { id: 'legs',      label: t.muscleGroups.legs },
  { id: 'glutes',    label: t.muscleGroups.glutes },
  { id: 'abs',       label: t.muscleGroups.abs },
] as const
```

Then update where `MUSCLE_GROUPS` is consumed: render `label` for display, store `id` (or whatever the DB column expects). If the DB stores French strings already, just use the labels directly without splitting id/label.

#### 5.2.3 · Audit other hardcoded English

Per audit section 10.1:
- `training.tsx:16`: `DOW_SHORT` — already French, just hardcoded directly. Move to locales for consistency.
- `onboarding/step3.tsx`: uses `t()` with English `defaultValue` fallbacks. Replace fallbacks with French keys.

```bash
# Sweep for any remaining English in user-facing screens
grep -rn '"[A-Z][a-z]\+ [A-Z][a-z]\+"' apps/mobile/app apps/mobile/src/screens apps/mobile/src/components | head -30
```

For each match, decide: legitimate proper noun (keep) or display string (move to locales).

### Verify

```bash
cd apps/mobile && npx tsc --noEmit
```

### Commit

```bash
git add apps/mobile/src/locales/fr.ts apps/mobile/app/workout/build.tsx \
        apps/mobile/app/\(tabs\)/training.tsx apps/mobile/app/onboarding/
git commit -m "fix(i18n): move hardcoded English to locales/fr.ts

- workout/build.tsx: MUSCLE_GROUPS now read from t.muscleGroups
- training.tsx: DOW_SHORT moved to locales for consistency
- onboarding/step3.tsx: French defaultValue fallbacks
- swept other screens for stragglers

Fixes risk register #14 [PARTIAL] from AUDIT_FULL_STATE."
```

## 5.3 · Reduce `as any` type escapes (Risk #16)

Audit lists 18 occurrences. Each has a context. Address them by category — don't blanket-fix.

### Categories

#### Category A — JSONB column casts (`diet.ts`, `index.tsx`, `diet.tsx`, `regenerate.tsx`, `meal/[id].tsx`)

These cast tRPC outputs to typed shapes because Drizzle returns `any` for `jsonb` columns. Fix by typing the JSONB columns at the schema layer.

**File**: `apps/api/src/db/schema.ts`

For each `jsonb()` column that holds known-shape data, declare its shape:

```ts
// Before
export const dietPlans = pgTable('diet_plans', {
  // ...
  meals: jsonb('meals'),  // returns any
})

// After
import type { DietMeal } from '@tanren/shared'

export const dietPlans = pgTable('diet_plans', {
  // ...
  meals: jsonb('meals').$type<DietMeal[]>(),  // returns DietMeal[]
})
```

Define the shape types in `packages/shared/src/types.ts`:

```ts
export type DietMeal = {
  id: string
  name: string
  ingredients: DietIngredient[]
  // ... full shape
}

export type DietIngredient = {
  // ...
}
```

After applying `.$type<X>()`, the casts in mobile become unnecessary:

```tsx
// Before
const meals = plan.meals as any[]
// After
const meals = plan.meals  // already typed
```

Apply same pattern to:
- `diet.ts:194-195` — JSONB cast to `any[]`
- `index.tsx:104,108,278` — diet plan JSONB cast
- `profile.tsx:168` — records cast
- `diet.tsx:282,377,384,419` — partial may be route paths (different category, see C)
- `regenerate.tsx:45` — plan cast
- `meal/[id].tsx:18` — plan cast

#### Category B — MMKV/storage Date deserialization

`activeSessionStore.ts:149` — `(state as any).startedAt = new Date(state.startedAt as any)` for the rehydration race covered earlier.

This is acceptable because of the genuine type complexity (storage returns string, runtime expects Date). Replace with a narrower assertion + comment:

```ts
// In activeSessionStore.ts
onRehydrateStorage: () => (state) => {
  // MMKV returns startedAt as string (JSON-serialized). Runtime code
  // expects Date. Cast is intentional and isolated to rehydration.
  if (state && typeof state.startedAt === 'string') {
    ;(state as { startedAt: Date | null }).startedAt = new Date(state.startedAt)
  }
}
```

Same approach for `_layout.tsx:184` startedAt cast — encapsulate the cast in a helper:

```ts
// apps/mobile/src/lib/dateFromStorage.ts
export function dateFromStorageValue(value: unknown): Date | null {
  if (value instanceof Date) return value
  if (typeof value === 'string') return new Date(value)
  return null
}
```

Then call `dateFromStorageValue(startedAt)` instead of casting.

#### Category C — Expo Router typed routes

`diet.tsx:282,377,384,419` and similar — `router.push('/...' as any)`.

This is a known Expo Router gotcha when typed routes don't include all your dynamic paths. Fix by either:
- Casting to the proper type: `router.push('/diet/regenerate' as Href)`
- Or running `npx expo customize app.config.ts` and properly registering the typed route map

For V1, the cleaner narrow cast:

```ts
import type { Href } from 'expo-router'

router.push('/diet/regenerate' as Href)
// Or, if a specific route is mistyped, file an issue with Expo Router upstream
```

Apply across the 4 diet.tsx occurrences.

#### Category D — SVG imports

`WeightChart.tsx:3` — `@ts-expect-error` for SVG imports.

Add a `.d.ts` declaration file to type SVG imports properly:

```ts
// apps/mobile/declarations.d.ts (or augment the existing one)
declare module '*.svg' {
  import * as React from 'react'
  import type { SvgProps } from 'react-native-svg'
  const content: React.FC<SvgProps>
  export default content
}
```

Reference it in `tsconfig.json`:

```json
{
  "include": ["...existing...", "declarations.d.ts"]
}
```

Then remove the `@ts-expect-error` comment from `WeightChart.tsx`.

#### Category E — Animated.Value internals

`workout/share.tsx:33` — `animated._value` access.

This is a React Native internal. Either:
- Use `animated.__getValue()` (still internal but documented in some places)
- Or refactor to use `Animated.event` patterns properly

For V1 this is cosmetic. Add a clearer comment if keeping:

```ts
// React Native Animated.Value.__getValue() is the documented synchronous read.
// Use in render is discouraged but acceptable for one-time captures.
const currentValue = animatedValue.__getValue()
```

If `__getValue` isn't available, leave the `as any` but add a TODO with a tracking issue.

### Verify

```bash
# Count remaining as any / @ts-ignore
grep -rn "as any\|@ts-ignore\|@ts-expect-error" apps/ packages/ --include='*.ts' --include='*.tsx' | grep -v "node_modules" | wc -l
# Expected: significantly reduced from 18

cd apps/mobile && npx tsc --noEmit
cd apps/api && npx tsc --noEmit
```

### Commit

```bash
git add -A
git commit -m "refactor: reduce 'as any' / @ts-ignore type escapes

Categories addressed:
- JSONB columns: \$type<X>() in schema, removes need for casts in mobile
- MMKV rehydration: narrowed cast in helper, documented
- Expo Router routes: cast to Href instead of any
- SVG imports: .d.ts declaration file
- React Native Animated internals: documented use of __getValue()

Type escapes: 18 → ~5 (only acceptable internal/library cases).

Fixes risk register #16 [PARTIAL] from AUDIT_FULL_STATE."
```

## 5.4 · Persist onboarding progress (Risk #17)

**Audit finding**: steps are local state only. Crash mid-flow restarts at step1.

### Apply fix

#### 5.4.1 · Create the onboarding store (if not already)

```ts
// apps/mobile/src/stores/onboardingStore.ts

/**
 * DEVICE-LOCAL state for onboarding progress.
 *
 * Why MMKV: if the user kills the app mid-flow, they should resume
 * at the same step with their entered values intact, not start from
 * scratch.
 *
 * Cleared on completeOnboarding success.
 */

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { mmkvStorageAdapter } from '../lib/storage'

type OnboardingState = {
  currentStep: number
  // Step 1 fields
  name: string | null
  // Step 2 fields
  weightKg: number | null
  heightCm: number | null
  gender: 'male' | 'female' | 'other' | null
  dateOfBirth: string | null
  // Step 3 fields
  level: 'beginner' | 'intermediate' | 'advanced' | null
  goal: string | null
  weeklyTarget: number | null
  equipment: string[]
  // Metadata
  startedAt: string  // for 7-day expiration

  setStep: (step: number) => void
  setField: <K extends keyof OnboardingState>(key: K, value: OnboardingState[K]) => void
  reset: () => void
  isExpired: () => boolean
}

const initial = {
  currentStep: 0,
  name: null,
  weightKg: null,
  heightCm: null,
  gender: null,
  dateOfBirth: null,
  level: null,
  goal: null,
  weeklyTarget: null,
  equipment: [],
  startedAt: new Date().toISOString(),
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set, get) => ({
      ...initial,
      setStep: (step) => set({ currentStep: step }),
      setField: (key, value) => set({ [key]: value } as Partial<OnboardingState>),
      reset: () => set(initial),
      isExpired: () => {
        const age = Date.now() - new Date(get().startedAt).getTime()
        return age > 7 * 24 * 3600 * 1000
      },
    }),
    {
      name: 'onboarding-flow-v1',
      storage: createJSONStorage(() => mmkvStorageAdapter),
    }
  )
)
```

#### 5.4.2 · Wire each onboarding step to the store

Each step screen:

```tsx
// apps/mobile/app/onboarding/step1.tsx
import { useOnboardingStore } from '../../src/stores/onboardingStore'

export default function Step1() {
  const name = useOnboardingStore((s) => s.name)
  const setField = useOnboardingStore((s) => s.setField)
  const setStep = useOnboardingStore((s) => s.setStep)

  // Mark step on mount
  useEffect(() => { setStep(1) }, [])

  return (
    <View>
      <TextInput
        value={name ?? ''}
        onChangeText={(v) => setField('name', v)}
        placeholder="Ton prénom"
      />
      {/* ... navigation buttons */}
    </View>
  )
}
```

Same for step0 (consent), step2, step3.

#### 5.4.3 · Resume on app launch

In `_layout.tsx` or `AuthRedirect`:

```tsx
// If user is authenticated and !onboardingDone
if (!profile.onboardingDone) {
  const onboardingStore = useOnboardingStore.getState()

  // Expired draft? clear it
  if (onboardingStore.isExpired()) {
    onboardingStore.reset()
  }

  // Resume at the current step (or step0 if fresh)
  const step = onboardingStore.currentStep || 0
  const target = `/onboarding/step${step}`

  if (segments.join('/') !== target) {
    return <Redirect href={target as Href} />
  }
  return null
}
```

#### 5.4.4 · Clear on completion

In the final onboarding step's submit handler:

```tsx
const completeOnboardingMutation = trpc.users.completeOnboarding.useMutation({
  onSuccess: async () => {
    await utils.auth.me.invalidate()
    useOnboardingStore.getState().reset()  // clear MMKV draft
    // AuthRedirect navigates to /(tabs) automatically
  }
})
```

### Verify

```bash
cd apps/mobile && npx tsc --noEmit
```

Manual test:
1. Start onboarding, fill step1 + step2 partially
2. Kill the app
3. Reopen → should land on step2 with values preserved

### Commit

```bash
git add apps/mobile/src/stores/onboardingStore.ts apps/mobile/app/onboarding/ apps/mobile/app/_layout.tsx
git commit -m "feat(mobile): persist onboarding progress to MMKV

Was: each step held local component state only. App kill mid-flow
forced restart from step1.

Now:
- useOnboardingStore (Zustand + MMKV persist) holds all in-flow values
- Each step reads/writes to the store
- Resume on app launch lands at currentStep with values intact
- 7-day expiration via isExpired() check
- Cleared on completeOnboarding success

Fixes risk register #17 [PARTIAL] from AUDIT_FULL_STATE."
```

## 5.5 · Systematic mutation error feedback (audit 9.4 [PARTIAL])

Audit: "Most other mutations use `Alert.alert`. No systematic pattern."

### Apply fix

Standardize on a single pattern. Two approaches:

**Option A — extend the existing toast system**:

The audit notes a toast system exists. Add a helper:

```ts
// apps/mobile/src/lib/mutationFeedback.ts
import { useToastStore } from '../stores/toastStore'

export type MutationFeedbackOptions = {
  successMessage?: string
  errorMessage?: string  // override the err.message
  silent?: boolean
}

export function showMutationSuccess(message: string) {
  useToastStore.getState().show(message, 'success')
}

export function showMutationError(err: unknown, fallback = 'Une erreur est survenue') {
  const message = err instanceof Error ? err.message : fallback
  useToastStore.getState().show(message, 'error')
}
```

**Option B — wrap mutation hooks with a helper**:

```ts
// apps/mobile/src/lib/createMutationWithFeedback.ts
import { showMutationError, showMutationSuccess } from './mutationFeedback'

export function withFeedback<TData, TError, TVariables>(
  mutationOptions: UseMutationOptions<TData, TError, TVariables>,
  feedback: { onSuccess?: string; onError?: string }
): UseMutationOptions<TData, TError, TVariables> {
  return {
    ...mutationOptions,
    onSuccess: (data, vars, ctx) => {
      if (feedback.onSuccess) showMutationSuccess(feedback.onSuccess)
      mutationOptions.onSuccess?.(data, vars, ctx)
    },
    onError: (err, vars, ctx) => {
      if (feedback.onError) showMutationError(err, feedback.onError)
      mutationOptions.onError?.(err, vars, ctx)
    },
  }
}
```

Apply Option A as the baseline. Mobile mutations adopt the pattern incrementally:

```ts
// In a mutation hook
const mutation = trpc.weight.add.useMutation({
  onSuccess: () => {
    showMutationSuccess('Poids enregistré')
    invalidateWeight()
  },
  onError: (err) => {
    showMutationError(err, 'Impossible d\'enregistrer le poids')
  },
})
```

### Sweep — replace `Alert.alert` for mutation errors

```bash
grep -rn "Alert.alert" apps/mobile/src/data/mutations apps/mobile/app | head -20
```

For each mutation-error `Alert.alert`, replace with `showMutationError`. Keep `Alert.alert` only for destructive confirmations (delete workout, etc.).

### Verify

```bash
cd apps/mobile && npx tsc --noEmit
grep -rn "Alert.alert" apps/mobile/src/data apps/mobile/app | grep -v "confirm\|delete\|danger" | head -20
# Should be minimal
```

### Commit

```bash
git add apps/mobile/src/lib/mutationFeedback.ts apps/mobile/
git commit -m "refactor(mobile): unify mutation error feedback via toast

Was: mix of Alert.alert, silent errors, ad-hoc toast usage. No
systematic pattern.

Now: showMutationSuccess and showMutationError helpers in
src/lib/mutationFeedback. All non-destructive mutations adopt
toast feedback. Alert.alert reserved for destructive
confirmations.

Closes audit section 9.4 [PARTIAL]."
```

## 5.6 · ScrollView → FlatList for long lists (audit 13.3 [PARTIAL])

Audit: all tabs except history use ScrollView. Acceptable for V1 but won't scale.

### Apply fix

The replacement is mechanical only where iteration is over a long list. Audit each tab:

```bash
# Find ScrollView usage
grep -rn "ScrollView" apps/mobile/app/\(tabs\)/

# For each, identify the iterable inside
```

Decision rules:
- **Static section + iteration <10 items**: leave ScrollView
- **Iteration over user-generated lists (workouts, sessions, weight entries)**: convert to FlatList

For converted screens:

```tsx
// Before
<ScrollView>
  <Header />
  {workouts.map(w => <WorkoutCard key={w.id} workout={w} />)}
</ScrollView>

// After
<FlatList
  data={workouts}
  keyExtractor={(item) => item.id}
  renderItem={({ item }) => <WorkoutCard workout={item} />}
  ListHeaderComponent={<Header />}
/>
```

Apply where genuinely needed. Don't convert tabs with <5 items per section.

Likely candidates:
- `training.tsx` if it lists all user workouts
- `(profile or history sub-screens)` if they list weight entries / PR history

Skip Home and Diet — typically have static sections or summary cards, not long lists.

### Commit

```bash
git add apps/mobile/app/
git commit -m "perf(mobile): FlatList for user-generated long lists

Switched ScrollView → FlatList in screens that render
user-generated lists (workouts, weight history, PRs). Static
sections kept on ScrollView. Improves scrolling performance
and memory at scale.

Closes audit section 13.3 [PARTIAL]."
```

## 5.7 · Add tests for new fixes (Risk #13)

Audit: only 4 test files. Don't go on a coverage crusade, but add tests for the high-impact fixes from Phases 1-4.

### Priority tests

**File**: `apps/api/src/routers/sessions.test.ts` (new)

Test the Phase 1.1 fix:

```ts
import { describe, it, expect } from 'vitest'
import { db } from '../db'
import { /* setup helpers */ } from './testHelpers'  // create if needed

describe('sessions.byId', () => {
  it('returns sets for ALL exercises, not just first', async () => {
    // Create user, workout, session with 3 exercises, 3 sets each
    // Call sessions.byId
    // Expect: 3 exercises returned, each with 3 sets
  })
})
```

**File**: `apps/api/src/routers/weight.test.ts` (new)

Test the transactional weight.add (already done previously, but make sure it has a test):

```ts
describe('weight.add', () => {
  it('inserts entry AND syncs users.weightKg in one transaction', async () => {
    // ...
  })

  it('does not update users.weightKg for backdated entries', async () => {
    // ...
  })
})
```

**File**: `apps/api/src/jobs/hardDeleteExpiredUsers.test.ts` (new)

Test the GDPR cron from Phase 2.9:

```ts
describe('hardDeleteExpiredUsers', () => {
  it('deletes users soft-deleted more than 30 days ago', async () => {
    // Create user with deletedAt = 31 days ago
    // Run job
    // Expect user is hard-deleted
  })

  it('preserves users soft-deleted less than 30 days ago', async () => {
    // ...
  })
})
```

**File**: `apps/api/src/utils/dayOfWeek.test.ts` (already exists per earlier audit but verify)

```bash
ls apps/api/src/utils/dayOfWeek.test.ts 2>/dev/null
```

If missing, add it.

### Mobile tests

Limited scope — pure utility tests only. Skip component tests for V1.

**File**: `apps/mobile/src/lib/mutationFeedback.test.ts` (new, if Phase 5.5 added the helpers)

```ts
describe('showMutationError', () => {
  it('uses err.message for Error instances', () => {
    // ...
  })
  it('uses fallback for non-Error throws', () => {
    // ...
  })
})
```

### Verify

```bash
cd apps/api && npx vitest run
cd apps/mobile && npx vitest run
```

### Commit

```bash
git add apps/api/src/routers/sessions.test.ts \
        apps/api/src/routers/weight.test.ts \
        apps/api/src/jobs/hardDeleteExpiredUsers.test.ts \
        apps/api/src/utils/dayOfWeek.test.ts \
        apps/mobile/src/lib/mutationFeedback.test.ts
git commit -m "test: cover the Phase 1, 2, 5 fixes

- sessions.byId multi-exercise fix
- weight.add transactional behavior
- GDPR hard-delete cron eligibility
- dayOfWeek utility round-trips
- mutationFeedback helpers

Test files: 4 → 9. Risk register #13 [PARTIAL] partially addressed
(comprehensive coverage is post-V1 work)."
```

## 5.8 · Phase 5 verification

```bash
npx tsc -b --noEmit
# Expected: 0 errors

# All tests pass
cd apps/api && npx vitest run 2>&1 | tail -10
cd apps/mobile && npx vitest run 2>&1 | tail -10

# Repo state
git status
# Expected: clean

# Commit log
git log --oneline -20
# Expected: ~25 new commits from Phases 0-5 combined
```

**STOP HERE.** Final report:
- All risk register items addressed (1-18 covered)
- All `[PARTIAL]` and `[MISSING]` from sections 1-19 of the audit handled
- Test count up
- All commits in `main`

---

# Final summary

After all 5 phases:

| Risk | Severity | Status | Phase |
|---|---|---|---|
| 1 | CRITICAL | sessions.byId fix | 1 |
| 2 | CRITICAL | GDPR hard-delete cron | 2 |
| 3 | HIGH | workouts.detail N+1 fix + plans.list | 1 |
| 4 | HIGH | AI timeout + AbortSignal | 3 |
| 5 | HIGH | diet.getMyPlanV2 → protectedProcedure | 2 |
| 6 | MEDIUM | OTP per-IP rate limit | 2 |
| 7 | MEDIUM | Mask email in otp_sent log | 2 |
| 8 | MEDIUM | 5 missing DB indexes | 3 |
| 9 | MEDIUM | Sign-out resilience + retry queue | 2 |
| 10 | MEDIUM | src/data/* hooks 100% adoption | 4 |
| 11 | MEDIUM | ENCRYPTION_KEY in .env.example + hard-fail | 2 |
| 12 | MEDIUM | .max() on all Zod string inputs | 2 |
| 13 | LOW | Tests for new fixes | 5 |
| 14 | LOW | Muscle groups i18n'd | 5 |
| 15 | LOW | SectionStatus in home/history/diet | 4 |
| 16 | LOW | Reduced as any escapes | 5 |
| 17 | LOW | Onboarding MMKV persist | 5 |
| 18 | LOW | tsbuildinfo gitignored | 5 |

Plus addressed:
- Section 1.2 [PARTIAL] — createContext user existence check (Phase 2.1)
- Section 2.3 [UNKNOWN] — Sentry PII scrubbers (Phase 2.5)
- Section 9.4 [PARTIAL] — mutation feedback helpers (Phase 5.5)
- Section 13.3 [PARTIAL] — FlatList where appropriate (Phase 5.6)
- Section 15.3 [PARTIAL] — pg.Pool config (Phase 3.3)
- Section 19.3 [PARTIAL] — *.tsbuildinfo gitignored (Phase 5.1)

---

# Process rules

**Per phase**:
1. Read each fix's audit reference before coding
2. Apply the change
3. `npx tsc -b --noEmit` → must be 0
4. Manual smoke test where applicable
5. One logical fix = one commit
6. End-of-phase report
7. Wait for user validation before next phase

**If anything goes wrong**:
- Typecheck breaks → revert that specific commit, report
- Migration fails → don't force, investigate, ask
- A fix conflicts with previously-uncommitted work → STOP and ask
- A fix doesn't match the actual audit context (e.g., line numbers shifted, file structure differs) → adapt, don't blindly apply

**Don't**:
- Combine phases
- Skip the stop points
- Add features beyond the audit scope
- Apply silent workarounds

---

*Address every finding. Validate every phase. Ship a tight V1.*

*Tanren · Une rep après l'autre.*
