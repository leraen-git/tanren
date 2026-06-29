# TANREN — Stabilization & Scale Readiness Plan

> **For Claude Code.** This plan addresses every issue in `AUDIT.md` (2026-04-24) and prepares the app to scale without rewriting. The stack (Expo SDK 55 / RN 0.83.6 / tRPC v11 / Drizzle / PostgreSQL) is sound for 100k+ users as-is. Problems are implementation bugs and process gaps, not architecture.
>
> **Root diagnosis**: the recurring "fixes come and go" pattern is caused by **branch divergence + inconsistent deploys**, not fragile code. Fix that first, then code fixes hold.
>
> **Execution model**: 3 phases, each a separate PR with a stop-point.
> - **Phase 1** — App works reliably (1 day)
> - **Phase 2** — Stability & type safety (1 day)
> - **Phase 3** — Scale readiness & offline architecture (1 day)
>
> Don't combine phases. Don't skip stop-points.
>
> **Ground rules**:
> - Run `npm run typecheck` after every significant change in both `apps/api/` and `apps/mobile/`
> - After every fix, verify end-to-end (not just typecheck passes)
> - Commit messages in English, conventional commits
> - If a fix conflicts with existing non-committed code, **STOP and ask** — don't guess
> - Never force-push or rewrite history on shared branches without explicit user instruction

---

## Architecture decisions (read first — locked)

### D1 · Single branch = `main`

Per user decision: rename `TanrenV2` → `main`, delete `tanren`. Railway deploys from `main`. No exceptions.

### D2 · Hybrid storage policy

Tanren uses **two storage layers**. Every piece of data belongs to exactly one:

**Server (PostgreSQL via tRPC + React Query cache + MMKV persistence)** — source of truth for durable data:
- User profile, plans, workouts, sessions, weight history, AI generations
- Cached on device via React Query persister (Phase 1.4) — instant cold-launch UI

**Device-only (Zustand + MMKV)** — never leaves the device:
- UI state (tabs, modals)
- Drafts (workout/plan being built, onboarding progress)
- In-flight state (active session, AI proposed plan not yet accepted)
- Preferences (theme override)

### D3 · Offline strategy — progressive

**Now (Phase 1.4)**: React Query persistence via MMKV. Solves "no data on cold launch", scales to 100k users, takes 30 min.

**Architected for future (Phase 3.3)**: a `useAppData()` abstraction layer that screens consume. Today it wraps tRPC + React Query. Tomorrow if we need real offline-first (user logs a full session in airplane mode), we swap the implementation to WatermelonDB without rewriting screens.

**Not now**: WatermelonDB itself. It's 5-10 days of work, and the persistence layer covers the pain point at 10% of the effort. Adopt it when there's evidence users train offline regularly.

### D4 · Error visibility

**Never mask errors silently**. Every error surface — tRPC, Anthropic calls, DB queries — logs with a category prefix (`[TRPC_ERROR]`, `[ANTHROPIC_ERROR]`, etc.) and propagates a meaningful message to the client. Bug fixing requires knowing what broke.

### D5 · Deploy discipline

- One branch (`main`) → one deploy
- Auto-deploy on push
- Every push is observed via `railway logs --tail` for 60 seconds
- Rollback path known (Railway keeps previous deploys — dashboard exposes rollback button)

---

# Phase 1 — Unblock: ship a working app (1 day)

**Goal**: fix everything that prevents the user from using the app reliably. iOS must build, stale sessions must not hijack launch, data must appear instantly on cold launch, AI must produce real error messages.

## 1.0 · Pre-flight audit (do this BEFORE touching code)

Before any fix, verify the current state of the repo. The AUDIT.md notes uncommitted changes and the cherry-pick scenario is tricky.

```bash
# 1. What's uncommitted
git status

# 2. What's on each branch
git log --oneline -20 TanrenV2
git log --oneline -20 tanren

# 3. What's on tanren that's NOT on TanrenV2
git log tanren --not TanrenV2 --oneline

# 4. What's in apps/api/src/trpc.ts (or wherever the error formatter lives)
grep -rn "errorFormatter" apps/api/src/

# 5. What model is used for plans vs diet AI generation
grep -n "claude-sonnet\|claude-opus\|claude-haiku" apps/api/src/routers/plans.ts apps/api/src/routers/diet.ts
```

**Report the state back to the user before proceeding.** If anything is unexpected (e.g. uncommitted changes in files this plan will modify), pause.

## 1.1 · Unify on `main` (do this FIRST)

Per D1. Root cause of "fixes come and go" — fix the git topology before fixing any code.

```bash
# 1. Start from the branch that has the most recent work
git checkout TanrenV2

# 2. Ensure working tree is clean before the rename
# If dirty, commit WIP first:
git status
# (if any pending changes, commit or stash)

# 3. Cherry-pick the useful commits from `tanren` that aren't yet on TanrenV2
# The 3 commits from tanren (per AUDIT.md):
#   6a439d2 Add console.error logging to tRPC error formatter for debugging
#   f0675e7 Revert model to claude-sonnet-4-6, keep error logging
#   bf06d4f Fix AI generation: use claude-sonnet-4-5 model, add error logging
#
# Strategy: cherry-pick the net effect (logging + correct model)
# Check what the net effect is on the affected files:
git diff TanrenV2..tanren -- apps/api/src/trpc.ts apps/api/src/routers/plans.ts

# If the diff looks clean, cherry-pick:
git cherry-pick 6a439d2  # error logging
git cherry-pick f0675e7  # correct model

# If there are conflicts, STOP — show them to the user before resolving

# 4. Rename TanrenV2 → main
git branch -m TanrenV2 main

# 5. Push the new `main` and set upstream
git push -u origin main

# 6. Update default branch on GitHub
# Via GitHub UI: Repo → Settings → Branches → Default branch → main
# (Or via `gh` CLI if available: `gh repo edit --default-branch main`)

# 7. Delete remote `TanrenV2` and `tanren`
git push origin --delete TanrenV2
git push origin --delete tanren

# 8. Delete local `tanren` reference
git branch -D tanren 2>/dev/null || true

# 9. Reconfigure Railway to deploy from `main`
# Railway Dashboard → Project → Settings → Deployments
#   Deploy Trigger = Branch: main
#   Auto Deploy: ON
# Trigger a manual deploy to verify: Deployments tab → Deploy Now

# 10. Verify: `git branch -r` should only show origin/main (and maybe origin/HEAD)
git branch -r
```

**Verification**:
- `git branch -r` → only `origin/main` (+ origin/HEAD pointing to main)
- GitHub shows `main` as default branch
- Railway dashboard confirms `main` is the deploy source
- Push a trivial test commit (e.g., add a comment in README) → Railway auto-deploys within 2 min

**Commit message for the cherry-picks** (if Claude Code did them manually due to conflicts):

```
chore(git): consolidate tanren debug commits into main

- Cherry-pick error logging in tRPC error formatter
- Cherry-pick correct AI model (claude-sonnet-4-6)
- Delete tanren branch
- Rename TanrenV2 -> main as single deploy branch
```

## 1.2 · Fix iOS build (Issue 1)

**File**: `apps/mobile/ios/Tanren/AppDelegate.swift`

```bash
cd apps/mobile

# 1. Verify current state
head -1 ios/Tanren/AppDelegate.swift

# Expected line 1 after fix: public import Expo
# If it says `import Expo` (no `public`), apply the change:
```

Edit `ios/Tanren/AppDelegate.swift` line 1 to: `public import Expo`

```bash
# 2. Sync pods
cd ios
pod install
cd ..

# 3. Commit both changes together
git add ios/Tanren/AppDelegate.swift ios/Podfile.lock
git commit -m "fix(ios): public import Expo for Swift 6 strict access levels

- Swift 6 + Xcode 26 enforce stricter import access levels
- Expo module is imported as internal by CocoaPods-generated code
- public import disambiguates at AppDelegate level
- Also includes pod install result (Podfile.lock update)

Fixes Issue 1 from AUDIT.md"

# 4. Build
npx expo run:ios
```

**If build fails after this**:
- Read the EXACT error from Xcode logs (top of the error stack, not the bottom)
- Paste it to the user — don't try workarounds based on symptoms
- Common next steps if pods are the issue: `pod repo update && pod install`
- Last resort: `rm -rf ios/Pods ios/Podfile.lock && npx expo prebuild --clean` — but this regenerates iOS scaffolding and may overwrite other native changes, ASK first

**Verification**:
- `xcodebuild` exits 0 (watch the last 20 lines of output)
- App launches on simulator
- App launches on physical device (if tested)

## 1.3 · Fix stale workout auto-resume (Issue 2 + Issue 8)

Single fix covers both issues. Per AUDIT.md, 4 changes needed: version key bump, `hasIncompleteSets` guard, NaN guard, tighter window.

**File**: `apps/mobile/src/stores/activeSessionStore.ts`

Find the `persist` config (around line 137) and change the `name`:

```ts
// BEFORE
name: 'active-session-v1',

// AFTER
name: 'active-session-v2',
```

**File**: `apps/mobile/app/_layout.tsx`

Replace `SessionResumeChecker` (around lines 157-173) with:

```tsx
function SessionResumeChecker() {
  const checked = useRef(false)
  useEffect(() => {
    if (checked.current) return
    checked.current = true

    const { currentWorkout, startedAt, exercises, finishSession } =
      useActiveSessionStore.getState()

    // No active session — nothing to resume
    if (!currentWorkout) return

    // Session exists but no startedAt — corrupt state, clean up
    if (!startedAt) {
      finishSession()
      return
    }

    // Handle both Date (post-rehydration) and string (pre-rehydration race, Issue 8)
    const ts = startedAt instanceof Date
      ? startedAt.getTime()
      : new Date(startedAt as any).getTime()

    // Invalid timestamp — clean up
    if (isNaN(ts)) {
      finishSession()
      return
    }

    const ageHours = (Date.now() - ts) / 3600000
    const hasIncompleteSets = exercises.some(ex =>
      ex.sets.some(s => !s.isCompleted)
    )

    // Resume only if: recent (<3h) AND actually incomplete
    if (ageHours < 3 && hasIncompleteSets) {
      router.push('/workout/active')
    } else {
      // Stale or fully completed — clear the session
      finishSession()
    }
  }, [])

  return null
}
```

**Commit**:

```bash
git add apps/mobile/src/stores/activeSessionStore.ts apps/mobile/app/_layout.tsx
git commit -m "fix(mobile): stop resuming stale workouts on app launch

- Bump MMKV key to active-session-v2 (orphans all v1 persisted sessions)
- Add hasIncompleteSets guard (don't resume completed sessions)
- Handle startedAt as Date or string (rehydration race fix)
- NaN guard on invalid timestamps
- Tighten resume window from 6h to 3h

Fixes Issue 2 and Issue 8 from AUDIT.md"
```

**Verification**:
- Kill mid-workout with incomplete sets <3h old → reopen → auto-navigates to `/workout/active` with state preserved
- Kill after completing all sets → reopen → Home screen, no auto-navigation
- Reopen after >3 hours → Home screen, session cleared
- Fresh install → Home screen, no phantom workout state
- Existing v1 persisted sessions → silently cleared (never shown to user)

**Important**: any user with an active v1 session at the moment of this deploy will lose that session. That's acceptable — the v1 sessions are the bugs we're fixing. Communicate this if there are real users.

## 1.4 · Add React Query persistence (Issue 3)

Solves the "no data at launch" symptom that's the most visible UX problem. Scales to 100k+ users without modification. Positions us for future WatermelonDB swap without rewriting screens (per D3).

### Install

```bash
cd apps/mobile
npm install @tanstack/react-query-persist-client
```

Note: we don't need `@tanstack/query-async-storage-persister` because MMKV is synchronous — we write our own Persister with sync reads wrapped in Promise.resolve.

### Create persister

**New file**: `apps/mobile/src/lib/queryPersister.ts`

```ts
import type { Persister, PersistedClient } from '@tanstack/react-query-persist-client'
import { storage } from './storage'  // existing MMKV instance

const QUERY_CACHE_KEY = 'tanren-query-cache-v1'

/**
 * MMKV-backed Persister for React Query.
 *
 * Why MMKV over AsyncStorage:
 * - Synchronous reads: no Promise ceremony on hot path
 * - 10x faster on writes for typical cache sizes
 * - Shared MMKV instance with Zustand stores (D2 hybrid policy)
 *
 * Cache invalidation:
 * - Bump QUERY_CACHE_KEY when the persisted shape changes (schema migration,
 *   breaking tRPC output change)
 * - PersistQueryClient's `buster` option (app version) handles most cases
 */
export const mmkvPersister: Persister = {
  persistClient: async (client: PersistedClient) => {
    try {
      storage.set(QUERY_CACHE_KEY, JSON.stringify(client))
    } catch (err) {
      console.warn('[queryPersister] persistClient failed', err)
    }
  },

  restoreClient: async (): Promise<PersistedClient | undefined> => {
    try {
      const cached = storage.getString(QUERY_CACHE_KEY)
      if (!cached) return undefined
      return JSON.parse(cached) as PersistedClient
    } catch (err) {
      console.warn('[queryPersister] restoreClient failed, clearing cache', err)
      storage.delete(QUERY_CACHE_KEY)
      return undefined
    }
  },

  removeClient: async () => {
    storage.delete(QUERY_CACHE_KEY)
  },
}
```

### Wire into the app

**File**: `apps/mobile/app/_layout.tsx` (or wherever `QueryClientProvider` is set up)

Find the existing provider setup. Replace `QueryClientProvider` with `PersistQueryClientProvider`:

```tsx
import { QueryClient } from '@tanstack/react-query'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { mmkvPersister } from '../src/lib/queryPersister'
import Constants from 'expo-constants'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,              // existing
      gcTime: 24 * 60 * 60 * 1000,    // 24h — MUST be >= persister maxAge
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
})

// App version as cache buster
const appVersion =
  Constants.expoConfig?.version ??
  process.env.EXPO_PUBLIC_APP_VERSION ??
  'dev'

// Replace <QueryClientProvider client={queryClient}> with:
<PersistQueryClientProvider
  client={queryClient}
  persistOptions={{
    persister: mmkvPersister,
    maxAge: 24 * 60 * 60 * 1000,  // 24h — cache older than this is discarded
    buster: appVersion,
    // Optionally, dehydrate options can scope what gets persisted:
    // dehydrateOptions: { shouldDehydrateQuery: (q) => q.state.status === 'success' }
  }}
  onSuccess={() => {
    // Hydration complete. Resume paused mutations if any.
    queryClient.resumePausedMutations()
  }}
>
  {/* ... existing app tree */}
</PersistQueryClientProvider>
```

**Commit**:

```bash
git add apps/mobile/package.json apps/mobile/package-lock.json
git add apps/mobile/src/lib/queryPersister.ts
git add apps/mobile/app/_layout.tsx
git commit -m "feat(mobile): React Query persistence via MMKV

- Installs @tanstack/react-query-persist-client
- MMKV-backed Persister (synchronous, shared with Zustand)
- 24h gcTime matches persister maxAge
- App version as cache buster (invalidates on updates)

Fixes Issue 3 from AUDIT.md
Scales to 100k+ users without additional infra"
```

**Verification**:
- First launch post-fix: normal loading (no cache yet, fresh install behavior)
- Close the app fully (swipe from recents), reopen: Home, Training, History, Diet tabs show data **instantly**, no spinner flicker
- Network disabled + cold launch: app still shows last-seen data
- With fresh network: queries revalidate in the background, UI updates if server data changed
- After app version bump: old cache is discarded (buster), fresh fetch on first launch

## 1.5 · Fix AI plan generation (Issue 4)

Root cause per AUDIT.md: error formatter masks real errors + stale Docker image. After 1.1 branch unification, these should be resolved, but we need to verify and harden.

### Check current state

After 1.1 cherry-picks, the tRPC error formatter should log errors with `[TRPC_ERROR]` prefix. Verify:

```bash
grep -A 25 "errorFormatter" apps/api/src/trpc.ts apps/api/src/server.ts apps/api/src/index.ts 2>/dev/null
```

**Required state**:

```ts
// apps/api/src/trpc.ts
export const t = initTRPC.context<Context>().create({
  errorFormatter({ shape, error }) {
    // Always log full error server-side for Railway observability
    console.error('[TRPC_ERROR]', {
      path: shape.data?.path,
      code: shape.data?.code,
      message: error.message,
      cause: error.cause instanceof Error ? error.cause.message : error.cause,
      stack: error.stack?.split('\n').slice(0, 5).join('\n'),  // limit stack depth
    })

    return {
      ...shape,
      data: {
        ...shape.data,
        // Pass real message through — we're pre-launch, full visibility is OK
        // In production with external users, consider masking INTERNAL_SERVER_ERROR
        // messages behind a generic "unexpected error" while still logging real one
        message: error.message || 'An error occurred',
      },
    }
  },
})
```

If the current code differs substantially, apply the shape above.

### Wrap the Anthropic call

**File**: `apps/api/src/routers/plans.ts`

Find the `generateWithAI` mutation. Wrap the Anthropic API call in explicit try/catch:

```ts
// Inside generateWithAI mutation
let rawResponse: Anthropic.Message
try {
  rawResponse = await anthropicClient.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    messages: [
      { role: 'user', content: userPromptWithSystemInstructions },
    ],
    system: systemPrompt,
  })
} catch (err) {
  console.error('[ANTHROPIC_ERROR]', {
    procedure: 'plans.generateWithAI',
    userId: ctx.userId,
    error: err instanceof Error ? err.message : String(err),
    type: err instanceof Error ? err.name : typeof err,
    // Anthropic SDK throws specific error types: APIError, RateLimitError, etc.
    statusCode: (err as any)?.status,
    stack: err instanceof Error ? err.stack?.split('\n').slice(0, 5).join('\n') : undefined,
  })
  throw new TRPCError({
    code: 'INTERNAL_SERVER_ERROR',
    message: `AI generation failed: ${err instanceof Error ? err.message : 'unknown error'}`,
    cause: err,
  })
}

// Then parse rawResponse — wrap that too:
let parsedPlan: AiGeneratedPlan
try {
  const textBlock = rawResponse.content.find(b => b.type === 'text')
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No text block in AI response')
  }
  const cleaned = textBlock.text.replace(/```json|```/g, '').trim()
  parsedPlan = JSON.parse(cleaned)
  // Validate shape with Zod schema here
} catch (err) {
  console.error('[AI_PARSE_ERROR]', {
    procedure: 'plans.generateWithAI',
    rawText: rawResponse.content.find(b => b.type === 'text')?.['text']?.slice(0, 500),
    error: err instanceof Error ? err.message : String(err),
  })
  throw new TRPCError({
    code: 'INTERNAL_SERVER_ERROR',
    message: 'AI returned malformed plan. Please retry.',
    cause: err,
  })
}
```

### Compare with diet.generateWithAI

If diet works and plans doesn't, the difference is diagnostic:

```bash
# Side-by-side compare the two procedures
diff <(grep -A 60 "generateWithAI" apps/api/src/routers/diet.ts | head -80) \
     <(grep -A 60 "generateWithAI" apps/api/src/routers/plans.ts | head -80)
```

**If diet has the try/catch + error propagation but plans doesn't**: port the exact pattern. Don't invent a new shape.

### Verify Railway env vars

```bash
railway variables

# Must include:
#   ANTHROPIC_API_KEY=sk-ant-...
#   DATABASE_URL=postgresql://...
#   REDIS_URL=redis://...
#   NODE_ENV=production
```

If `ANTHROPIC_API_KEY` is missing or has a typo (e.g., `ANTHROPIC_API_TOKEN`), that's your cause. Add it:

```bash
railway variables --set ANTHROPIC_API_KEY=sk-ant-...
```

### Deploy and observe

```bash
git add apps/api/src/routers/plans.ts apps/api/src/trpc.ts
git commit -m "fix(api): surface real errors from AI plan generation

- tRPC error formatter logs full error with [TRPC_ERROR] breadcrumb
- plans.generateWithAI wraps Anthropic call with [ANTHROPIC_ERROR]
- Response parsing wrapped with [AI_PARSE_ERROR]
- Error message propagates to client (no generic masking)

Fixes Issue 4 from AUDIT.md"

git push origin main
# Railway auto-deploys. Watch:
railway logs --tail

# In another terminal, call the endpoint from the mobile app
# Observe the logs — you'll see the real error if any
```

**Do NOT silently fall back to a different model** (e.g., haiku if sonnet fails). That hides the real problem. If it's truly a rate limit, return a clear `TOO_MANY_REQUESTS` error.

**Verification**:
- Plan AI generation succeeds on first try → no errors in logs
- Plan AI generation fails → `[ANTHROPIC_ERROR]` or `[AI_PARSE_ERROR]` log entry with specific cause → iterate on that

## 1.6 · Verify Hero card (Issue 5) — no code change, diagnostic only

Per AUDIT.md, the Hero card logic is correct. The bug symptom is DB state (phantom completed sessions). Verification:

```bash
# Open a Railway DB shell
railway connect postgres
# Or use Tableplus / DBeaver with connection string from `railway variables`
```

```sql
-- Current day of week (JS convention: 0=Sunday, 1=Monday, ..., 6=Saturday)
SELECT EXTRACT(DOW FROM NOW() AT TIME ZONE 'UTC') as js_dow;

-- Active plan for the test user (replace with real user_id)
SELECT wp.id, wp.name, wp.is_active, wp.generated_by_ai
FROM workout_plans wp
WHERE wp.user_id = '<USER_ID>'
  AND wp.is_active = true;

-- Days assigned in that plan
SELECT wpd.day_of_week, wpd.workout_template_id, wt.name
FROM workout_plan_days wpd
JOIN workout_templates wt ON wt.id = wpd.workout_template_id
WHERE wpd.plan_id = '<PLAN_ID>'
ORDER BY wpd.day_of_week;

-- Completed sessions this week (Monday 00:00 UTC onwards)
SELECT id, started_at, completed_at, workout_template_id
FROM workout_sessions
WHERE user_id = '<USER_ID>'
  AND started_at >= DATE_TRUNC('week', NOW())
  AND completed_at IS NOT NULL
ORDER BY started_at;
```

**Expected behavior**:
- Today's `js_dow` matches one of the `wpd.day_of_week` values AND no session is completed today → Hero card visible
- Session already completed today → Hero card hidden, "rest day" UI shown

**If Hero card should be visible but isn't**:
1. Identify phantom completed sessions: `SELECT * FROM workout_sessions WHERE user_id = '...' AND completed_at::date = CURRENT_DATE;`
2. If these are test data or accidental completions, delete them: `DELETE FROM workout_sessions WHERE id = '...';`
3. Re-verify in the app (after the React Query cache revalidates)

**No code change needed.** This section is operational diagnostic.

## 1.7 · Phase 1 commit sequence

Expected commits on `main` after Phase 1:

```
chore(git): consolidate tanren debug commits into main
fix(ios): public import Expo for Swift 6 strict access levels
fix(mobile): stop resuming stale workouts on app launch
feat(mobile): React Query persistence via MMKV
fix(api): surface real errors from AI plan generation
```

**STOP HERE**. Don't touch Phase 2 until Phase 1 is fully verified:

**Phase 1 acceptance checklist**:
- [ ] `git branch -r` shows only `origin/main`
- [ ] Railway deploys automatically on push to `main`
- [ ] `npx expo run:ios` builds and launches
- [ ] Cold launch lands on Home (no phantom workout resume)
- [ ] Cold launch shows data instantly (no loading spinners on tabs)
- [ ] Cold launch offline: data is still visible from cache
- [ ] AI plan generation either works OR returns a specific error message (not generic)
- [ ] `railway logs --tail` shows `[TRPC_ERROR]` breadcrumbs on any tRPC failure

If any box isn't checked, diagnose with logs/output, don't proceed. Ask the user for help if stuck.

---
# Phase 2 — Harden: stop regressions (1 day)

**Goal**: make Phase 1 fixes durable. Close the gaps that let regressions sneak in — type errors, missing CI, broken deploy pipeline.

## 2.1 · Fix the 12 real API type errors (Issue 7)

Per AUDIT.md, root-level `tsc` surfaces 311 cosmetic errors (path alias) + 12 real ones in the API. Fix the 12 real ones now.

### `exercises.ts:39` — `name` optional in input, required in DB

Find the Zod input schema for exercise creation. If `name` is `.optional()`, make it required:

```ts
// apps/api/src/routers/exercises.ts (line ~39 context)
// BEFORE
const createInputSchema = z.object({
  name: z.string().optional(),
  muscleGroups: z.array(z.string()),
  // ...
})

// AFTER
const createInputSchema = z.object({
  name: z.string().min(1).max(100),
  muscleGroups: z.array(z.string()).min(1),
  // ...
})
```

### `workouts.ts:37` — same pattern

```ts
// apps/api/src/routers/workouts.ts
// Before
name: z.string().optional(),
// After
name: z.string().min(1).max(80),
```

### `plans.ts:212, 245` — `workoutTemplateId` optional

A plan day cannot exist without a workout template. Required in input.

```ts
// apps/api/src/routers/plans.ts
const planDaySchema = z.object({
  dayOfWeek: z.number().int().min(1).max(7),
  workoutTemplateId: z.string().uuid(),  // was optional
})
```

### `diet.ts:357` — `age` optional vs required in `IntakeData`

Read the `IntakeData` type and who builds it. The resolution depends on whether age is always derivable:

**Option A** (preferred): age is always derivable from `dateOfBirth`. Make it required and compute in the procedure:

```ts
// apps/api/src/routers/diet.ts
// Before building IntakeData, derive age from user profile
const age = user.dateOfBirth
  ? Math.floor((Date.now() - new Date(user.dateOfBirth).getTime()) / (365.25 * 24 * 3600 * 1000))
  : null

if (age === null) {
  throw new TRPCError({
    code: 'BAD_REQUEST',
    message: 'Date of birth required for diet calculation',
  })
}

const intake: IntakeData = {
  // ...
  age,  // number, not undefined
  // ...
}
```

**Option B**: make `age` optional in `IntakeData` and handle null downstream. Less clean but non-breaking.

Prefer A.

### `auth.test.ts:79, 86` — readonly `NODE_ENV`

TS strict mode treats `process.env` as readonly in newer types.

```ts
// apps/api/src/routers/auth.test.ts
// Before
process.env.NODE_ENV = 'production'

// After (vitest)
vi.stubEnv('NODE_ENV', 'production')

// ... test runs

// Cleanup
vi.unstubAllEnvs()

// Or with @ts-expect-error if not using vitest's helper:
// @ts-expect-error NODE_ENV override for test
process.env.NODE_ENV = 'production'
```

### Verify

```bash
cd apps/api
npx tsc --noEmit
# Expected: 0 errors
```

**Commit**:

```bash
git commit -m "fix(api): 12 real type errors from strict typecheck

- exercises: name required in input schema
- workouts: name required in input schema
- plans: workoutTemplateId required in day schema
- diet: age derived from dateOfBirth and required in IntakeData
- tests: use vi.stubEnv for NODE_ENV override

Removes the 12 genuine TS errors from root typecheck.
Cosmetic 311 path-alias errors addressed in 2.2."
```

## 2.2 · Root tsconfig with project references (Issue 7 cosmetic)

Silence the 311 spurious errors that come from running `tsc` at repo root without project references.

**Create** `tsconfig.json` at repo root:

```json
{
  "files": [],
  "references": [
    { "path": "./apps/api" },
    { "path": "./apps/mobile" },
    { "path": "./packages/shared" }
  ]
}
```

**Update each workspace tsconfig** to enable composite builds.

`apps/api/tsconfig.json`, `apps/mobile/tsconfig.json`, `packages/shared/tsconfig.json`:

```json
{
  "compilerOptions": {
    "composite": true,
    // ... existing options
  }
}
```

When `composite: true` is set, TypeScript requires:
- `declaration: true` (may already be the case)
- All source files under `rootDir`

If the composite flag conflicts with an existing option, report the exact error to the user before resolving — there may be a reason.

**Verify**:

```bash
# From repo root
npx tsc --noEmit -b
# -b enables project-reference build mode
# Expected: 0 errors after 2.1 is done
```

**Commit**:

```bash
git commit -m "chore(ts): root tsconfig with project references

- Root typecheck no longer reports 311 cosmetic path-alias errors
- Each workspace opts into composite builds
- Enables incremental typecheck across monorepo
- Unblocks CI setup in 2.4"
```

## 2.3 · Rename `workouts.tsx` tab to `training.tsx`

Per the Training ecosystem design, the 2nd tab is named `Entraînement` (training). If the file is still called `workouts.tsx`, rename it.

```bash
# Check current state
ls apps/mobile/app/\(tabs\)/
```

If a file named `workouts.tsx` exists and it's meant to be the training hub:

```bash
git mv apps/mobile/app/\(tabs\)/workouts.tsx apps/mobile/app/\(tabs\)/training.tsx
```

Update the Tabs.Screen name in `apps/mobile/app/(tabs)/_layout.tsx`:

```tsx
<Tabs.Screen
  name="training"
  options={{
    title: 'Entraînement',
    tabBarIcon: ({ color }) => <DumbbellIcon color={color} />,
  }}
/>
```

Grep for any stale references:

```bash
grep -rn "workouts\.tsx\|(tabs)/workouts\|'/workouts'" apps/mobile/
# Fix each reference to point to training
```

**Commit**:

```bash
git commit -m "refactor(mobile): rename workouts tab to training per design"
```

## 2.4 · Verify Railway auto-deploy (Issue 9)

After 1.1 (branch unification on `main`), auto-deploy should work. Verify concretely.

1. Railway Dashboard → Project → Service → Settings → Deployments
2. Confirm:
   - **Source**: GitHub (or the connected VCS)
   - **Branch**: `main`
   - **Auto Deploy**: ON
   - **Build Command**: (as configured)

3. Test with a trivial commit:

```bash
cd apps/api
echo "// deploy test $(date -u +%Y-%m-%dT%H:%M:%SZ)" >> src/index.ts
git add src/index.ts
git commit -m "chore: deploy test"
git push origin main

# Watch Railway dashboard for new deployment starting within ~30 seconds

# Once deployed, revert
git revert --no-edit HEAD
git push origin main
```

**If auto-deploy doesn't trigger**: the GitHub app may have lost repo permissions. Re-link:
- Railway Dashboard → Service → Source → Disconnect → Reconnect
- Grant repo access
- Retry the test

**No commit for this section** — it's operational.

## 2.5 · CI typecheck on every push (proactive regression prevention)

Install a GitHub Actions workflow that fails any push with type errors.

**Create** `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Typecheck all workspaces
        run: npx tsc --noEmit -b
```

**Commit**:

```bash
git add .github/workflows/ci.yml
git commit -m "ci: typecheck on every push and PR

- GitHub Actions runs tsc on all workspaces
- Blocks merge if any type error exists
- Prevents regression of the 12 errors fixed in 2.1"
```

**Verification**:
- Push to `main` → CI runs and passes (if 2.1 + 2.2 are correct)
- Create a branch with a deliberate type error, open a PR → CI fails → PR is blocked

## 2.6 · Create DEPLOY.md runbook

Document the process so future debugging is fast.

**Create** `DEPLOY.md` at repo root:

```markdown
# Tanren Deployment & Troubleshooting Runbook

## Branches

- `main` — single source of truth. All development, all deploys.
- No feature branches for now (solo dev). Create one only for risky migrations (DB schema change, auth overhaul).

## Standard dev flow

1. All work on `main` (or a short-lived feature branch merged back quickly)
2. `git push origin main` → Railway auto-deploys in ~2 minutes
3. `railway logs --tail` to watch deployment and runtime logs for 60 seconds
4. Test the affected flow end-to-end

## When Railway doesn't auto-deploy

1. Dashboard: Settings → Deployments → Branch = `main`, Auto Deploy = ON
2. Dashboard: Deployments tab → latest attempt and its error
3. If no attempt at all: re-link GitHub app (Service → Source)
4. Manual force deploy: `railway up`

## When iOS build fails (xcodebuild exit 65)

1. Read the EXACT error from Xcode logs — not the symptom, the top of the stack
2. After SDK/Xcode upgrades, usually `pod install` is needed:
   ```
   cd apps/mobile/ios && pod install
   ```
3. Still fails → try pod repo update:
   ```
   pod repo update && pod install
   ```
4. Nuclear option (regenerates ios/ scaffold — may overwrite custom native changes):
   ```
   cd apps/mobile && rm -rf ios/Pods ios/Podfile.lock && npx expo prebuild --clean
   ```

## When a tRPC call fails

After Phase 1.5, tRPC errors always log with `[TRPC_ERROR]` prefix server-side.

1. `railway logs --tail` while triggering the call
2. Look for `[TRPC_ERROR]` lines — contains path, code, message, stack
3. If it's a Claude API call: `[ANTHROPIC_ERROR]` has specific cause (rate limit, auth, model not found, etc.)
4. If it's AI response parsing: `[AI_PARSE_ERROR]` shows the raw AI text

## When data doesn't update after a mutation

Check:
1. Did the mutation succeed? (mutation.data / mutation.error in DevTools)
2. Did an invalidation helper run in `onSuccess`? (Phase 3.2)
3. React Query DevTools (if enabled) shows stale/fresh state of affected queries

## Critical environment variables (Railway)

```
ANTHROPIC_API_KEY=sk-ant-...       # required for AI (diet + plans)
DATABASE_URL=postgresql://...       # PostgreSQL
REDIS_URL=redis://...               # sessions, rate limits
NODE_ENV=production                 # enables devSignIn block, rate limiting
EXPO_PUBLIC_APP_VERSION=1.0.0       # used for React Query cache buster
```

Verify with `railway variables`.

## Database access

```
railway connect postgres   # local tunnel to prod DB (read-only recommended)
railway run psql           # direct shell (use with care)
```

## Rollback to previous deploy

Railway Dashboard → Deployments tab → find the known-good deploy → `...` menu → Redeploy

## Mobile app version bump (cache buster)

When breaking cache shape (tRPC output change, schema migration):

1. Bump `apps/mobile/app.json` version (e.g., 1.0.0 → 1.1.0)
2. Or export `EXPO_PUBLIC_APP_VERSION` in build environment
3. On next install, React Query cache is discarded (buster mismatch)
```

**Commit**:

```bash
git add DEPLOY.md
git commit -m "docs: deploy and troubleshoot runbook

Single reference for branch policy, deploy flow, iOS build issues,
tRPC error debugging, Railway config, rollback procedure."
```

## 2.7 · Phase 2 commit sequence

```
fix(api): 12 real type errors from strict typecheck
chore(ts): root tsconfig with project references
refactor(mobile): rename workouts tab to training per design
ci: typecheck on every push and PR
docs: deploy and troubleshoot runbook
```

**STOP HERE**. Phase 2 acceptance:
- [ ] `npx tsc --noEmit -b` from repo root → 0 errors
- [ ] Push to `main` triggers Railway deploy within 2 min
- [ ] CI passes on `main`
- [ ] CI fails if someone deliberately adds a type error
- [ ] `DEPLOY.md` exists and is accurate for current setup

---

# Phase 3 — Scale readiness & offline architecture (1 day)

**Goal**: position the app for future growth without over-engineering. Introduce a data access abstraction that scales today and accommodates offline-first later. Add pre-commit guards. Clean up remaining debt.

Per D3 (architecture decision): we don't ship WatermelonDB now, but we architect so that future adoption doesn't require rewriting every screen.

## 3.1 · Pre-commit typecheck gate (Husky)

CI catches errors after push. Husky catches them before commit — faster feedback loop.

```bash
# From repo root
npm install -D husky
npx husky init
```

This creates `.husky/pre-commit` with a default command. Replace its content:

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

echo "→ Running typecheck..."
npx tsc --noEmit -b
```

Make it executable:

```bash
chmod +x .husky/pre-commit
```

Add a `prepare` script to root `package.json` so clones auto-install hooks:

```json
{
  "scripts": {
    "prepare": "husky"
  }
}
```

**Verification**:
- Make a trivial valid commit → hook runs, succeeds
- Make a commit with a type error → hook blocks, commit aborted

**Commit**:

```bash
git add .husky package.json package-lock.json
git commit -m "chore: husky pre-commit typecheck gate

Local typecheck runs before every commit.
Blocks commits that would fail CI."
```

## 3.2 · Centralized invalidation helpers

Screens shouldn't care about invalidation. Mutations should automatically propagate via named helpers.

**Create** `apps/mobile/src/lib/invalidation.ts`:

```ts
import { trpc } from './trpc'

/**
 * Centralized invalidation helpers. Every mutation uses one of these in its
 * onSuccess handler. When a new screen consumes a query, add it to the
 * relevant helper once — all existing mutations benefit automatically.
 *
 * Rule: NEVER call utils.X.invalidate() directly in a component.
 */

/** After any users.* mutation (profile, goal, target, etc.) */
export function useInvalidateUserProfile() {
  const utils = trpc.useUtils()
  return () => {
    utils.auth.me.invalidate()
    utils.plans.active.invalidate()          // active plan display depends on user context
    // Add more as consumers appear:
    // utils.nutrition.current.invalidate()
    // utils.stats.summary.invalidate()
  }
}

/** After weight.add / weight.delete */
export function useInvalidateWeight() {
  const utils = trpc.useUtils()
  return () => {
    utils.auth.me.invalidate()               // users.weight_kg is denormalized
    utils.weight.list.invalidate()
    utils.weight.stats.invalidate()
    // utils.nutrition.current.invalidate()  // TDEE depends on weight
  }
}

/** After plans.create / plans.update / plans.delete / plans.activate / plans.acceptGenerated */
export function useInvalidateActivePlan() {
  const utils = trpc.useUtils()
  return () => {
    utils.plans.active.invalidate()
    utils.plans.list.invalidate()
  }
}

/** After workouts.create / workouts.update / workouts.delete */
export function useInvalidateWorkouts() {
  const utils = trpc.useUtils()
  return () => {
    utils.workouts.list.invalidate()
    utils.plans.active.invalidate()          // active plan displays workout names
  }
}

/** After sessions.complete / sessions.abandon */
export function useInvalidateSessions() {
  const utils = trpc.useUtils()
  return () => {
    utils.sessions.list.invalidate()
    utils.plans.active.invalidate()          // streak and "next workout" depend on sessions
    utils.stats.summary.invalidate()
    utils.workouts.byId.invalidate()         // "last session" on detail view
  }
}
```

**Usage**: whenever you find a mutation, wire it to the appropriate helper. Example refactor:

```tsx
// BEFORE — scattered invalidation
const utils = trpc.useUtils()
const mutation = trpc.weight.add.useMutation({
  onSuccess: () => {
    utils.weight.list.invalidate()  // forgot auth.me
  },
})

// AFTER — centralized
const invalidateWeight = useInvalidateWeight()
const mutation = trpc.weight.add.useMutation({
  onSuccess: invalidateWeight,
})
```

Apply this pattern to every mutation. Grep to find them:

```bash
grep -rn "useMutation" apps/mobile/app apps/mobile/src | head -40
```

**Commit**:

```bash
git add apps/mobile/src/lib/invalidation.ts
# Plus all the screens you refactored to use the helpers
git commit -m "feat(mobile): centralized invalidation helpers

- useInvalidateUserProfile, useInvalidateWeight, useInvalidateActivePlan,
  useInvalidateWorkouts, useInvalidateSessions
- All mutations use one of these in onSuccess
- Adding a new screen that displays shared data = update helper once,
  all existing mutations benefit

Prevents silent drift where a mutation forgets to invalidate a consumer."
```

## 3.3 · Data access abstraction (scale readiness)

**This is the key scale-forward move.** Wrap tRPC consumption behind a domain-focused hook API. Screens call `useProfile()`, not `trpc.auth.me.useQuery()`. Later, if we swap to WatermelonDB, only the hook implementation changes — screens stay the same.

**Create** `apps/mobile/src/data/useProfile.ts`:

```ts
import { trpc } from '../lib/trpc'

/**
 * User profile hook.
 *
 * Source today: tRPC + React Query (cached via MMKV persister)
 * Source future: possibly WatermelonDB (local observable) when we need offline writes
 *
 * Screens must consume user data via this hook — never directly from trpc.auth.me.
 * This allows swapping the data layer without touching every screen.
 */
export function useProfile() {
  return trpc.auth.me.useQuery()
}

export type Profile = NonNullable<ReturnType<typeof useProfile>['data']>
```

**Create** `apps/mobile/src/data/useActivePlan.ts`:

```ts
import { trpc } from '../lib/trpc'

export function useActivePlan() {
  return trpc.plans.active.useQuery()
}
```

**Create** `apps/mobile/src/data/useWorkouts.ts`, `useSessions.ts`, `useWeight.ts`, etc.

Each hook is a 1-line wrapper today. That's intentional — the value comes later.

**Refactor screens** to use these hooks:

```tsx
// BEFORE
const { data: user } = trpc.auth.me.useQuery()

// AFTER
const { data: user } = useProfile()
```

Grep usage:

```bash
grep -rn "trpc\.auth\.me\.useQuery\|trpc\.plans\.active\.useQuery" apps/mobile/app apps/mobile/src
# Replace each with the domain hook
```

**Why this matters for scale**:

1. **Current scale (up to ~100k users)**: zero change — it's still tRPC + React Query, which already scales fine.

2. **Future WatermelonDB migration**: when you decide to add true offline-first (user can log a full session in airplane mode), you modify `useProfile`, `useActivePlan`, etc., to read from WatermelonDB observables instead of tRPC queries. The sync engine talks to the API in the background. **Not a single screen needs to be rewritten.**

3. **Testing**: the hooks can be mocked at the data layer for unit tests without mocking tRPC everywhere.

**Commit**:

```bash
git add apps/mobile/src/data/
git commit -m "feat(mobile): data access abstraction layer (useProfile, useActivePlan, etc.)

- Thin hooks wrapping tRPC queries today
- Consumers must use hooks, never trpc.X.useQuery directly
- Enables future WatermelonDB swap without rewriting screens
- Zero perf overhead: hooks are 1-line wrappers

Architected per decision D3 in stabilization plan."
```

## 3.4 · Document scale path in CLAUDE.md

Add a section to the repo's `CLAUDE.md` so future Claude sessions (and humans) know the architecture:

```markdown
## Data layer

### Current: tRPC + React Query + MMKV persist

All data flows through tRPC procedures. React Query caches responses.
MMKV persister (see apps/mobile/src/lib/queryPersister.ts) persists the cache
across app kills → instant cold-launch UI.

### Screens consume via `src/data/*` hooks

Screens MUST use the domain hooks (`useProfile`, `useActivePlan`, etc.),
not `trpc.X.useQuery` directly. This is an abstraction barrier that allows
swapping the data layer without touching screens.

See: apps/mobile/src/data/useProfile.ts (and siblings)

### Mutations MUST use invalidation helpers

Every mutation's onSuccess calls a `useInvalidateX` helper from
`src/lib/invalidation.ts`. Adding a new consumer of a shared query =
update the helper once, all mutations benefit.

### Scale path

Up to ~100k users: current stack works without changes. No action needed.

Beyond that, or if offline-first becomes critical:
1. Introduce WatermelonDB for local DB
2. Implement a sync engine (bidirectional, last-write-wins or CRDT)
3. Modify `src/data/*` hooks to observe WatermelonDB collections
4. Screens unchanged

Current React Query persister gives 80% of the offline-read experience
already. True offline writes (logging sets in airplane mode) require the
WatermelonDB step.
```

**Commit**:

```bash
git commit -m "docs: data layer architecture in CLAUDE.md

Documents tRPC + React Query + MMKV persist baseline,
abstraction via src/data hooks, and scale path."
```

## 3.5 · Phase 3 commit sequence

```
chore: husky pre-commit typecheck gate
feat(mobile): centralized invalidation helpers
feat(mobile): data access abstraction layer
docs: data layer architecture in CLAUDE.md
```

**STOP HERE**. Phase 3 acceptance:
- [ ] Commit with a type error is blocked by Husky hook locally
- [ ] At least the most-used mutations use `useInvalidate*` helpers
- [ ] At least the most-consumed queries (`auth.me`, `plans.active`) are wrapped in `src/data/*` hooks
- [ ] Screens using the old pattern have been migrated (grep should find few remaining)
- [ ] CLAUDE.md has the "Data layer" section

---

# Appendix — Process rules going forward

To prevent the "fixes come and go" pattern from returning:

## Git discipline

1. **`main` is the only branch**. Deploys come from here. No `tanren`, `TanrenV2`, `dev`, `staging` branches for now.
2. **Push often**. If a fix takes more than 4 hours, commit WIP. Long-lived dirty trees are how fixes disappear.
3. **After `pod install`, commit `Podfile.lock`** in the same commit as the dependency change. Never separate them.
4. **Never force-push** to `main`. If a commit was bad, `git revert` it.

## Deploy discipline

1. **Every push = one deploy**. If Railway doesn't deploy, fix the config — don't rely on `railway up` manually.
2. **Watch logs for 60s after every deploy**: `railway logs --tail`. If `[TRPC_ERROR]` or `[ANTHROPIC_ERROR]` appears, investigate before calling it done.
3. **Know your rollback**. Railway Dashboard → Deployments → Redeploy previous. Practice it once before you need it.

## Debug discipline

1. **Read the actual error**. Xcode logs, Railway logs, tRPC error payload. Do not guess from symptoms.
2. **One change per diagnostic step**. If you change 3 things and it works, you don't know which one was the fix — and the other two may have introduced silent bugs.
3. **No workarounds before understanding root cause**. A workaround that hides a symptom usually lets the underlying issue resurface worse.

## Code discipline

1. **Never cache server data in Zustand**. React Query already caches. Zustand is for UI state, drafts, preferences (per D2).
2. **Never call `utils.X.invalidate()` directly in a component**. Use `useInvalidate*` helpers.
3. **Never call `trpc.X.useQuery()` directly in a screen**. Use `src/data/*` hooks.
4. **Never mask errors**. Log with a category prefix and propagate the real message.

---

# Appendix — Acceptance checklist (full app)

Run through this after Phase 3 complete. This is your "is the app working?" test.

## Launch behavior

- [ ] Fresh install → Home loads, no auto-navigation
- [ ] Cold launch with completed-yesterday state → Home loads instantly, no spinner
- [ ] Cold launch offline → Home shows cached data (not empty states)
- [ ] Cold launch with active session <3h old + incomplete sets → auto-navigates to `/workout/active`
- [ ] Cold launch with session completed → Home, session state cleared
- [ ] Cold launch after session >3h old → Home, session state cleared

## Core flows

- [ ] Create workout → appears in Training tab
- [ ] Edit workout → updates everywhere (Training list, detail, plan references)
- [ ] Delete workout → removed from Training list, plan reference handled gracefully
- [ ] Create plan → appears, Hero card updates
- [ ] Activate plan → previous plan deactivated, new one active
- [ ] Complete a session → history updates, streak recomputed, Hero card reflects today done

## AI generation

- [ ] Diet AI generation → works
- [ ] Plan AI generation → works OR returns specific error (not generic)
- [ ] `railway logs --tail` during AI call → no unhandled exceptions, no silent masking

## Data correctness

- [ ] Modify weight in Profile → reflected in Home / Diet / AI prompt chips within seconds
- [ ] Modify goal → nutrition direction updates (if derivation implemented per data unification plan)
- [ ] Change active plan days → Training tab shows new schedule immediately

## Build & deploy

- [ ] iOS builds on `main` HEAD: `npx expo run:ios` → success
- [ ] Push to `main` → Railway auto-deploys in <3 min
- [ ] CI passes on `main` (typecheck green)
- [ ] DEPLOY.md is accurate and current

## Regression guards

- [ ] Husky blocks commits with type errors
- [ ] CI blocks PRs with type errors
- [ ] No direct `trpc.X.useQuery` calls in screens (migrated to `src/data/*`)
- [ ] No direct `utils.X.invalidate` calls in mutations (using helpers)

---

# Final words

Every issue in `AUDIT.md` is fixable. The stack is sound. The path forward is:

1. **Fix the foundation** (Phase 1: branches, iOS, persistence, errors) — gets the app working
2. **Harden** (Phase 2: type errors, CI, runbook) — stops regressions
3. **Scale readiness** (Phase 3: abstraction layer, invalidation helpers) — positions for growth

**Do NOT**:
- Rewrite large files when targeted edits suffice
- Propose stack migration (abandon RN, swap tRPC, replace Drizzle) — audit doesn't justify it
- Add new features during this pass — stabilize first, ship second, extend third
- Silently change behavior — every change is a commit with a verification step

**Do**:
- Read actual errors, not symptoms
- Test end-to-end after every commit
- Commit small, commit often, push often
- Ask before guessing

---

*Fix the foundation. Ship what works. Scale when needed.*

*Tanren · Une rep après l'autre.*
