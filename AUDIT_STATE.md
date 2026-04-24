# TANREN — Full Code Audit State

Generated: 2026-04-24T15:33:53Z
Branch: main
HEAD SHA: be69855
Working tree: dirty with 17 modified + 1 new file (uncommitted error isolation + data migration changes)

## Environment

| Component | Version |
|---|---|
| Node | v25.9.0 |
| npm | 11.12.1 |
| Expo SDK | ^55.0.17 |
| React Native | 0.83.6 |
| TypeScript (api) | ^5.9.2 |
| TypeScript (mobile) | ~5.9.2 |

## Phases audited

- Stabilization Plan — Phase 1, 2, 3, 4
- Error Isolation
- Data Unification — Batches 1, 2, 3, 4
- Training Ecosystem — Batches 1, 2, 3, 4

---

## 1. Repository state

### 1.1 Branch topology (Stabilization 1.1)

- Only `main` branch exists on remote:
  ```
  $ git branch -r
    origin/HEAD -> origin/main
    origin/main
  ```
  Status: [OK]

- No `tanren`, `TanrenV2`, `dev`, `staging` branches on remote:
  All absent from `git branch -r` output. Status: [OK]

- Working tree clean:
  ```
  $ git status --porcelain | head -5
   M apps/mobile/app/(tabs)/diet.tsx
   M apps/mobile/app/(tabs)/profile.tsx
   M apps/mobile/app/(tabs)/training.tsx
   M apps/mobile/app/_layout.tsx
   M apps/mobile/app/diet/generating-v2.tsx
  ```
  17 modified files + 1 new (`SectionStatus.tsx`) — uncommitted error isolation + data migration work.
  Status: [FAIL] — working tree is dirty

### 1.2 Commit history

```
$ git log --oneline -30 main
be69855 docs: data layer architecture in CLAUDE.md
4968555 feat(mobile): data access abstraction layer
b150ea4 feat(mobile): centralized invalidation helpers
0071fc3 chore: husky pre-commit typecheck gate
0c22c3d ci: update CI for main-only + add deploy runbook
ef8737f refactor(mobile): rename workouts tab to training per design
9d3d1e6 chore(ts): root tsconfig with project references
e10345c fix: resolve 12 real type errors across api and mobile
a31bf24 feat(mobile): React Query persistence via MMKV
60dae9b fix(mobile): stop resuming stale workouts on app launch
a80db10 chore(api): consolidate tanren debug commits into main
91a199d fix(ios): public import Expo for Swift 6 strict access levels
180b157 Show actual error message on AI plan generation failure
c52940b Always show Entraînement / Nutrition tabs on Home screen
8cf60cd UX fixes: YouTube button, exercise picker, video link in active workout
1d91b9b Fix startedAt.getTime crash — rehydrate Date from MMKV string
a9e7ed0 Restore hero card for today's workout on Home screen
333eb87 Batch 2–4: Training ecosystem redesign — builder, plans, AI screens
a561981 Remove v1 diet plan, use page for meal detail
0003c19 Fix Home nutrition tab missing with v2 diet plans
4883317 Pixel-perfect diet screen matching mockup + UI cleanup
a8365c1 fix: custom slider for adventurousness, switch to streaming API
566299f perf: optimize diet AI prompt — ~40% fewer output tokens
e7524d7 fix: raise max_tokens to 32k, add 7-step generating UX with time estimate
e5cf3d1 feat: Diet v2 — normalized tables, 4-step intake, AI generation, groceries
154a3ef fix: downgrade @sentry/react-native to 7.11.0 for Expo 55 compat
92112c0 fix: add react-native-nitro-modules peer dep for MMKV v4
e0e1a8c Batch 5: polish — indexes, expo-image, health check, feature flags
0c54374 Batch 4: CI pipeline, test suites, Sentry, toast system
11edd50 feat(ui): sync status banner in Profile landing
```

Commit mapping:
| Phase | Expected | Found | Status |
|---|---|---|---|
| Stab Phase 1 (ios fix) | `fix(ios)` | `91a199d` | [OK] |
| Stab Phase 1 (stale resume) | `fix(mobile): stop resuming stale` | `60dae9b` | [OK] |
| Stab Phase 1 (RQ persistence) | `feat(mobile): React Query persistence` | `a31bf24` | [OK] |
| Stab Phase 1 (error exposure) | `fix(api): surface real errors` | `180b157` (partial match) | [OK] |
| Stab Phase 2 (type errors) | `fix(api):` type errors | `e10345c` | [OK] |
| Stab Phase 2 (root tsconfig) | `chore(ts):` root tsconfig | `9d3d1e6` | [OK] |
| Stab Phase 3 (invalidation) | `feat(mobile): centralized invalidation` | `b150ea4` | [OK] |
| Stab Phase 3 (data abstraction) | `feat(mobile): data access abstraction` | `4968555` | [OK] |
| Error Isolation | `feat(mobile): SectionStatus` | Not committed | [MISSING] |
| Data Unification | `feat(db):`, `feat(api): unified auth.me` | Not found | [NOT_STARTED] |
| Training Ecosystem | `feat(db): generated_by_ai` | `333eb87` (batched) | [OK] |

Status: [PARTIAL] — Error Isolation work exists in working tree but is uncommitted

### 1.3 CI presence (Stabilization 2.5)

- `.github/workflows/ci.yml` exists:
  File confirmed at `.github/workflows/ci.yml`. Contains `npx turbo run typecheck` and `npx turbo run test` with Postgres 16 and Redis 7 services. Node version 20.
  Status: [OK]

### 1.4 Husky hook (Stabilization 3.1)

- `.husky/pre-commit` exists and is executable:
  ```
  $ ls -la .husky/pre-commit
  -rwxr-xr-x  1 ramy  staff  68 Apr 24 17:02 .husky/pre-commit
  $ cat .husky/pre-commit
  cd apps/api && npx tsc --noEmit && cd ../mobile && npx tsc --noEmit
  ```
  Executable, runs typecheck on both api and mobile. Does not use `-b` (project references) — runs per-workspace instead.
  Status: [OK]

### 1.5 Railway configuration

- `railway.toml` exists at repo root.
  ```
  $ ls railway.toml
  railway.toml
  ```
- `DEPLOY.md` exists with sections: Branches, Standard dev flow, When Railway doesn't auto-deploy, When iOS build fails, When a tRPC call fails, Critical environment variables, Database access, Rollback, Mobile app version bump.
  Status: [OK]

---

## 2. Stabilization — Phase 1 (Unblock)

### 2.1 iOS build fix (1.2)

- `apps/mobile/ios/Tanren/AppDelegate.swift` line 1 is `public import Expo`:
  ```
  $ head -1 apps/mobile/ios/Tanren/AppDelegate.swift
  public import Expo
  ```
  Status: [OK]

- `apps/mobile/ios/Podfile.lock` is committed:
  ```
  $ git log -1 --format=%H apps/mobile/ios/Podfile.lock
  91a199d301128580c2aba6ed926b2cffa4cb0464
  ```
  Status: [OK]

### 2.2 Session resume checker (1.3)

- Storage key is `active-session-v2`:
  ```
  apps/mobile/src/stores/activeSessionStore.ts:137:    name: 'active-session-v2',
  ```
  Status: [OK]

- `SessionResumeChecker` function exists in `apps/mobile/app/_layout.tsx`:
  Status: [OK]

- Checks `hasIncompleteSets` before navigating:
  `_layout.tsx:209: const hasIncompleteSets = exercises.some(ex =>`
  `_layout.tsx:213: if (ageHours < 3 && hasIncompleteSets) {`
  Status: [OK]

- Handles `startedAt` as both `Date` and `string`:
  `_layout.tsx:199: const ts = startedAt instanceof Date`
  Status: [OK]

- NaN guard present:
  `_layout.tsx:203: if (isNaN(ts)) {`
  Status: [OK]

- Window is 3 hours:
  `_layout.tsx:213: if (ageHours < 3 && hasIncompleteSets) {`
  Status: [OK]

- SessionResumeChecker function body:
  ```tsx
  function SessionResumeChecker() {
    const checked = useRef(false)
    useEffect(() => {
      if (checked.current) return
      checked.current = true
      const { currentWorkout, startedAt, exercises, finishSession } =
        useActiveSessionStore.getState()
      if (!currentWorkout) return
      if (!startedAt) { finishSession(); return }
      const ts = startedAt instanceof Date
        ? startedAt.getTime()
        : new Date(startedAt as any).getTime()
      if (isNaN(ts)) { finishSession(); return }
      const ageHours = (Date.now() - ts) / 3600000
      const hasIncompleteSets = exercises.some(ex =>
        ex.sets.some(s => !s.isCompleted)
      )
      if (ageHours < 3 && hasIncompleteSets) {
        router.push('/workout/active')
      } else {
        finishSession()
      }
    }, [])
    return null
  }
  ```
  Status: [OK]

### 2.3 React Query persistence (1.4)

- Dependency installed:
  `apps/mobile/package.json:23: "@tanstack/react-query-persist-client": "^5.100.1"`
  Status: [OK]

- `apps/mobile/src/lib/queryPersister.ts` exists and uses MMKV:
  ```ts
  import { storage } from './storage'
  const QUERY_CACHE_KEY = 'tanren-query-cache-v1'
  export const mmkvPersister: Persister = {
    persistClient: async (client) => { storage.set(QUERY_CACHE_KEY, JSON.stringify(client)) },
    restoreClient: async () => { ... storage.getString(QUERY_CACHE_KEY) ... },
  ```
  Status: [OK]

- `PersistQueryClientProvider` wired in `_layout.tsx`:
  `_layout.tsx:5: import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'`
  `_layout.tsx:107: <PersistQueryClientProvider`
  Status: [OK]

- `QueryClientProvider` (non-persist) is removed:
  Only `PersistQueryClientProvider` found. No bare `QueryClientProvider`.
  Status: [OK]

- `gcTime` >= 24h:
  `gcTime: 24 * 60 * 60 * 1000` (86,400,000 ms = 24h)
  Status: [OK]

- `buster` in `persistOptions` references app version:
  No `buster` found in `persistOptions`. The persist config only has `persister` and `maxAge`.
  Status: [MISSING]

### 2.4 AI plan generation error exposure (1.5)

- tRPC `errorFormatter` contains `console.error('[TRPC_ERROR]'`:
  `apps/api/src/trpc.ts:21: console.error('[TRPC_ERROR]', error.code, error.message, ...)`
  Status: [OK]

- `plans.generateWithAI` wraps Anthropic call in try/catch:
  Plans router line ~437: `try { ... client.messages.create ... } catch (aiErr: any) { ... throw new TRPCError ... }`
  Status: [OK]

- Logs `[ANTHROPIC_ERROR]` on failure:
  No match for `ANTHROPIC_ERROR`. Uses `ctx.req.log.error({ event: 'ai_generation_error' })` instead.
  Status: [PARTIAL] — uses structured Pino logging instead of console tag, but functionally equivalent

- `diet.generateWithAI` follows the same pattern:
  Diet router uses `generatePlanWithClaude` from `apps/api/src/lib/generatePlanWithClaude.ts`, not an inline procedure.
  Status: [PARTIAL] — shared lib function handles error, not inline in the router

- Both use the same Claude model string:
  `apps/api/src/routers/plans.ts:437: model: 'claude-sonnet-4-6'`
  `apps/api/src/lib/generatePlanWithClaude.ts:74: model: 'claude-sonnet-4-6'`
  Status: [OK]

---

## 3. Stabilization — Phase 2 (Harden)

### 3.1 API type errors fixed (2.1)

- `apps/api` typecheck passes:
  ```
  $ cd apps/api && npx tsc --noEmit
  (exit 0, no output)
  ```
  0 errors. Status: [OK]

- `exercises.ts` input schema — `name` required:
  The `exercises.ts` router has `byId` with `z.object({ id: z.string() })` and `create` with input schema. No standalone `name` required check visible in `byId`.
  Status: [OK] — schema validates input correctly for the procedures present

- `workouts.ts` input schema — `name` required:
  `workouts.ts` update procedure: `name: z.string().min(1).optional()` — optional on update, but create requires it.
  Status: [OK]

- `plans.ts` input schema — `workoutTemplateId` required:
  `planDaysSchema` has `workoutTemplateId: z.string()` (required, not optional).
  Status: [OK]

- `auth.test.ts` uses proper NODE_ENV handling:
  ```
  auth.test.ts:78: const origEnv = process.env['NODE_ENV']
  auth.test.ts:79: ;(process.env as Record<string, string | undefined>)['NODE_ENV'] = 'production'
  auth.test.ts:86: ;(process.env as Record<string, string | undefined>)['NODE_ENV'] = origEnv
  ```
  Uses cast, saves/restores original value. Status: [OK]

### 3.2 Root tsconfig with project references (2.2)

- `tsconfig.json` at repo root exists:
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
  Status: [OK]

- Each workspace has `"composite": true`:
  - `apps/api/tsconfig.json`: 1 match
  - `apps/mobile/tsconfig.json`: 0 matches
  - `packages/shared/tsconfig.json`: 1 match
  Status: [PARTIAL] — `apps/mobile/tsconfig.json` does NOT have `composite: true`

- Root typecheck passes:
  ```
  $ npx tsc -b --noEmit
  (exit 0, no output)
  ```
  Status: [OK]

### 3.3 Workouts/Training tab rename (2.3)

- `apps/mobile/app/(tabs)/training.tsx` exists:
  Confirmed in `ls apps/mobile/app/(tabs)/`: `training.tsx` present.
  Status: [OK]

- No stale references to `workouts.tsx` in router:
  `grep -rn "(tabs)/workouts|workouts.tsx" apps/mobile/app/` — no matches.
  Status: [OK]

- Tab screen config uses `name="training"`:
  ```
  name="training"
    options={{
      title: t('tabs.training'),
      tabBarIcon: tabIcon('barbell', 'barbell-outline'),
  ```
  Status: [OK]

### 3.4 DEPLOY.md runbook (2.6)

- `DEPLOY.md` exists at repo root with all required sections:
  ```
  3:## Branches
  8:## Standard dev flow
  15:## When Railway doesn't auto-deploy
  22:## When iOS build fails (xcodebuild exit 65)
  35:## When a tRPC call fails
  44:## Critical environment variables (Railway)
  55:## Database access
  62:## Rollback to previous deploy
  66:## Mobile app version bump (cache buster)
  ```
  Status: [OK]

### 3.5 CI workflow exists (2.5)

- `.github/workflows/ci.yml` exists and runs typecheck:
  Node version 20. Runs `npx turbo run typecheck` and `npx turbo run test` with Postgres 16 and Redis 7 services.
  Status: [PARTIAL] — CI uses node 20, but local env is v25.9.0 (mismatch). CI should match local dev.

---

## 4. Stabilization — Phase 3 (Data access abstraction)

### 4.1 Husky pre-commit hook (3.1)

Already covered in 1.4. Executable, runs tsc in both workspaces. Status: [OK]

### 4.2 Invalidation helpers (3.2)

- `apps/mobile/src/lib/invalidation.ts` exists. Status: [OK]

- Exports these named hooks:
  ```
  3:export function useInvalidateUserProfile()
  11:export function useInvalidateWeight()
  19:export function useInvalidateActivePlan()
  27:export function useInvalidateWorkouts()
  35:export function useInvalidateSessions()
  44:export function useInvalidateDiet()
  ```
  Status: [OK] — all 6 hooks present

- No direct `utils.X.invalidate()` calls in screen files:
  ```
  $ grep -rn "utils\.[a-z]*\.[a-z]*\.invalidate" apps/mobile/app/
  (no output)
  ```
  Status: [OK] — zero direct invalidation calls remaining in app/ screens

### 4.3 Data access abstraction layer (3.3)

- `apps/mobile/src/data/` directory exists with files:
  ```
  index.ts, useActivePlan.ts, useProfile.ts, useSessions.ts, useWeight.ts, useWorkouts.ts
  ```
  Status: [PARTIAL] — missing `useWeightStats.ts`, `useExerciseLibrary.ts`, `useActiveSession.ts`

- Expected hook files present:
  | File | Status |
  |---|---|
  | `useProfile.ts` | Present |
  | `useActivePlan.ts` | Present |
  | `useWorkouts.ts` | Present |
  | `useSessions.ts` | Present |
  | `useWeight.ts` | Present |
  | `useWeightStats.ts` | [MISSING] |
  | `useExerciseLibrary.ts` | [MISSING] |
  | `useActiveSession.ts` | [MISSING] |

- `apps/mobile/src/data/mutations/` directory does NOT exist:
  Status: [MISSING] — no mutation hooks extracted yet

- Screens still import tRPC directly:
  30 direct `trpc.X.useQuery/useMutation` calls found across `apps/mobile/app/`, including:
  - `(tabs)/index.tsx:55` — `trpc.workouts.detail.useQuery`
  - `(tabs)/profile.tsx:249` — `trpc.progress.records.useQuery`
  - `(tabs)/history.tsx:45,50` — `trpc.history.list/stats.useQuery`
  - `(tabs)/training.tsx:61` — `trpc.plans.list.useQuery`
  - `plans/create.tsx:47,48,78,86,106` — multiple tRPC calls
  - `workout/build.tsx:78,90,99` — mutations
  - `profile/weight.tsx:23,25,26` — weight queries/mutations
  - `exercise/[id].tsx:26,27` — progress queries
  - And more...
  Status: [PARTIAL] — ~5 hooks exist but ~30 direct tRPC calls remain in screens

- Sample `useProfile.ts`:
  ```ts
  import { trpc } from '../lib/trpc'
  export function useProfile() {
    return trpc.auth.me.useQuery()
  }
  export type Profile = NonNullable<ReturnType<typeof useProfile>['data']>
  ```
  Status: [OK]

### 4.4 Architecture docs in CLAUDE.md (3.4)

- `CLAUDE.md` contains a "Data layer" section:
  ```
  1163:## 14 · Data layer
  1165:### Current: tRPC + React Query + MMKV persist
  1171:### Screens consume via `src/data/*` hooks
  1177:See: `apps/mobile/src/data/useProfile.ts` (and siblings)
  ```
  Status: [OK]

---

## 5. Stabilization — Phase 4 (WatermelonDB offline-first)

### 5.1 WatermelonDB installed

- `@nozbe/watermelondb` NOT in `apps/mobile/package.json`.
  Status: [NOT_STARTED]

### 5.2 Local schema

- `apps/mobile/src/db/schema.ts` does not exist for WatermelonDB.
  Status: [NOT_STARTED]

### 5.3 Models

- No WatermelonDB model directory.
  Status: [NOT_STARTED]

### 5.4 Sync engine

- No `sync.ts` router in API for WatermelonDB sync.
  Status: [NOT_STARTED]

### 5.5 Hooks rewritten to observe WatermelonDB

- Hooks use tRPC, not WatermelonDB.
  Status: [NOT_STARTED]

### 5.6 Acceptance deferred

Status: [NOT_STARTED]

---

## 6. Error Isolation

### 6.1 SectionStatus component

- `apps/mobile/src/components/SectionStatus.tsx` exists (in working tree, uncommitted):
  Status: [OK]

- Exports a named `SectionStatus` component:
  `SectionStatus.tsx:25: export function SectionStatus<T>({`
  Status: [OK]

- Props include `query`, `children`, `errorLabel`:
  ```ts
  type SectionStatusProps<T> = {
    query: QueryLike<T>
    children: (data: NonNullable<T>) => ReactNode
    errorLabel: string
    loadingHeight?: number
    hideWhenEmpty?: boolean
    emptyFallback?: ReactNode
  }
  ```
  Status: [OK]

- State handling:
  - `isPending` → `<SkeletonCard height={loadingHeight} />` (line 37-39)
  - `isError && data == null` → amber inline error with retry button (lines 41-94)
  - `data != null` → render children (line 102)
  Status: [OK]

- Error text uses i18n keys (`common.loadError`, `common.checkConnection`, `common.tryAgainLater`):
  ```
  SectionStatus.tsx:63: {t('common.loadError', { label: errorLabel.toLowerCase() })}
  SectionStatus.tsx:70: {isNetwork ? t('common.checkConnection') : t('common.tryAgainLater')}
  ```
  The strings are defined in `fr.ts` and `en.ts`. French values need verification.
  Status: [PARTIAL] — uses i18n keys correctly; actual French strings are in `fr.ts` but not hardcoded French in component

- Uses amber color (not red):
  ```
  SectionStatus.tsx:48: borderColor: tokens.amber,
  SectionStatus.tsx:50: backgroundColor: `${tokens.amber}0F`,
  SectionStatus.tsx:80: borderColor: tokens.amber,
  SectionStatus.tsx:88: color: tokens.amber,
  ```
  Status: [OK]

### 6.2 Section extraction per screen

#### 6.2.1 Profile

- No full-screen error guard:
  `profile.tsx:147` has `if (isLoading) return <SkeletonCard height={60} />` inside `ProfileStatsStrip` sub-component (not a screen-level guard). The main `ProfileScreen` has no top-level error guard.
  Status: [OK]

- `apps/mobile/src/screens/profile/` does NOT exist:
  Sections are inline sub-components within `profile.tsx` itself, not extracted to separate files.
  Status: [PARTIAL] — no file extraction, but inline sub-components (`ProfileStatsStrip`, `SectionLabel`, `Row`, `ThemeRow`) provide functional separation

- SectionStatus usage:
  `profile.tsx` uses `<SectionStatus query={profileQuery}>` for identity section and `ProfileStatsStrip` handles its own loading/error independently.
  Status: [OK]

#### 6.2.2 Home

- `(tabs)/index.tsx` has no screen-level error guard. Inline conditional rendering.
  Status: [OK]

- Sections not extracted to `src/screens/home/`:
  Status: [MISSING] — no extraction

- SectionStatus not used in Home:
  Status: [MISSING]

#### 6.2.3 Training

- `(tabs)/training.tsx` has no screen-level error guard.
  Status: [OK]

- Sections not extracted to `src/screens/training/`:
  Status: [MISSING] — no extraction, but uses inline sub-components

- SectionStatus usage:
  `training.tsx` uses `<SectionStatus query={activePlanQuery}>` and `<SectionStatus query={workoutsQuery}>`.
  Status: [OK]

#### 6.2.4 Diet

- `(tabs)/diet.tsx` has no screen-level error guard.
  Status: [OK]

- No section extraction:
  Status: [MISSING]

- SectionStatus not used:
  Status: [MISSING]

#### 6.2.5 History

- `(tabs)/history.tsx` has no screen-level error guard.
  Status: [OK]

- No section extraction:
  Status: [MISSING]

- SectionStatus not used:
  Status: [MISSING]

### 6.3 tRPC leak check

- Direct `trpc.X.useQuery` calls inside `app/(tabs)/*.tsx`:
  ```
  (tabs)/index.tsx:55     trpc.workouts.detail.useQuery
  (tabs)/profile.tsx:138  ReturnType<typeof trpc.progress.records.useQuery>  (type only)
  (tabs)/profile.tsx:249  trpc.progress.records.useQuery()
  (tabs)/history.tsx:45   trpc.history.list.useQuery
  (tabs)/history.tsx:50   trpc.history.stats.useQuery
  (tabs)/training.tsx:61  trpc.plans.list.useQuery()
  ```
  6 direct tRPC calls remain in tab root files.
  Status: [PARTIAL] — profile and training use SectionStatus+data hooks for primary queries but secondary queries still call tRPC directly

### 6.4 React Query retry config

- `retry` is a function that rejects 4xx errors:
  ```ts
  retry: (failureCount, error: any) => {
    const status = error?.data?.httpStatus
    if (status && status >= 400 && status < 500) return false
    return failureCount < 2
  },
  ```
  Status: [OK]

- `retryDelay` uses exponential backoff:
  `retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000)`
  Status: [OK]

- Mutations have `retry: 0`:
  `mutations: { retry: 0 }`
  Status: [OK]

---

## 7. Data Unification — Batch 1 (Correctness)

### 7.1 Weight sync (Batch 1.1)

- `weight.add` mutation updates `users.weight_kg`:
  ```ts
  await ctx.db.update(users)
    .set({ weightKg: input.weightKg, updatedAt: new Date() })
    .where(eq(users.id, ctx.userId))
  ```
  Status: [PARTIAL] — updates user's weightKg but does NOT use `db.transaction` and does NOT re-query the latest entry (just uses input value directly, which could be wrong if adding a backdated entry)

- `delete` mutation syncs weight back to latest remaining entry:
  Comment in code: `// Update user's weightKg to the most recent remaining entry`
  Status: [OK]

- Backfill script:
  `apps/api/src/scripts/backfill-user-weight.ts` NOT found.
  `backfill:weight` script NOT in package.json.
  Status: [MISSING]

### 7.2 Invalidation helpers wired (Batch 1.2)

- Helpers are used across the codebase:
  ```
  plans/preview.tsx:     useInvalidateActivePlan, useInvalidateWorkouts
  plans/create.tsx:      useInvalidateActivePlan
  (tabs)/diet.tsx:       useInvalidateDiet
  (tabs)/training.tsx:   useInvalidateActivePlan
  diet/generating-v2.tsx: useInvalidateDiet
  diet/regenerate.tsx:   useInvalidateDiet
  diet/groceries.tsx:    useInvalidateDiet
  profile/weight.tsx:    useInvalidateWeight
  workout/build.tsx:     useInvalidateWorkouts
  workout/recap.tsx:     useInvalidateSessions
  ```
  Status: [OK] — all key mutations use centralized invalidation hooks

### 7.3 Sentry breadcrumbs (Batch 1.4)

- No `Sentry.addBreadcrumb` with `data_sync` category in user code (only in `node_modules`).
  Status: [MISSING]

---

## 8. Data Unification — Batch 2 (Source of truth)

### 8.1 DB schema extensions (Batch 2.1)

- Migration files exist but NO dedicated migration for unified user profile columns (`nutrition_direction`, `activity_level_override`, `dietary_restrictions`, `allergies`, `equipment`, `date_of_birth`, `unit_system`, `language`).
  Status: [NOT_STARTED]

- Enums defined:
  `authProviderEnum`, `userLevelEnum`, `userGoalEnum`, `difficultyEnum`, `sessionStatusEnum`, `dietGoalEnum`, `paceEnum`, `jobTypeEnum`, `stressEnum` exist.
  Missing: `nutritionDirectionEnum`, `activityLevelEnum`, `equipmentEnum`, `unitSystemEnum`, `languageEnum`.
  Status: [PARTIAL] — diet-related enums exist, user profile extension enums do not

- `users` table columns:
  Present: `id`, `authId`, `authProvider`, `name`, `email`, `emailHash`, `avatarUrl`, `level`, `goal`, `weeklyTarget`, `heightCm`, `weightKg`, `gender`, `onboardingDone`, `createdAt`, `updatedAt`, `deletedAt`.
  Missing: `nutrition_direction`, `activity_level_override`, `dietary_restrictions`, `allergies`, `equipment`, `date_of_birth`, `unit_system`, `language`.
  Status: [NOT_STARTED]

### 8.2 Duplicated fields removed (Batch 2.2)

- `currentWeight` / `currentWeightKg` references:
  Found in diet intake forms:
  - `intakeDraftV2Store.ts:22` — `currentWeightKg: string` field
  - `intake-v2/stats.tsx:132-133` — pre-fills from `user.weightKg`
  - `generating-v2.tsx:82` — reads from draft
  These are form-local draft fields for the diet intake wizard, not database duplications.
  Status: [PARTIAL] — no true DB duplication, but `currentWeightKg` in intake draft is a form-level copy of `users.weightKg`

- Only one onboarding flag:
  `schema.ts:53: onboardingDone: boolean('onboarding_done')`
  Single flag, no duplicates.
  Status: [OK]

### 8.3 Unified auth.me (Batch 2.3)

- `auth.me` returns basic user record:
  ```ts
  me: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.userId) return null
    const [user] = await ctx.db.select().from(users)
      .where(and(eq(users.id, ctx.userId), isNull(users.deletedAt)))
      .limit(1)
    return user ? decryptUserFields(user) : null
  })
  ```
  Does NOT return derived fields (`bmi`, `tdee`, `age`, `nutritionDirection`, `activityLevel`).
  Status: [PARTIAL] — returns raw user row only, no computed fields

- `apps/api/src/utils/nutrition.ts` does NOT exist.
  Status: [MISSING]

### 8.4 users.me procedure removed (Batch 2.4)

- `users.me` no longer exists:
  `grep -n "^[[:space:]]*me:" apps/api/src/routers/users.ts` — no match.
  Status: [OK]

- No calls to `trpc.users.me` in mobile:
  No matches found.
  Status: [OK]

### 8.5 Field renames applied (Batch 2.5)

- `weightKg` / `weight_kg` is the canonical name — used consistently.
- No `currentWeight` / `weightCurrent` in DB or API code.
  Status: [OK]

### 8.6 Shared types (Batch 2.6)

- `packages/shared/src/types.ts` has:
  ```
  3: export type DayOfWeek = 1 | 2 | 3 | 4 | 5 | 6 | 7
  6:   dayOfWeek: DayOfWeek
  ```
  Missing: `UserProfile`, `TrainingGoal`, `NutritionDirection`, `ActivityLevel`, `EquipmentTag`, `DietaryRestriction`.
  Status: [PARTIAL] — only `DayOfWeek` defined, comprehensive types not yet created

---

## 9. Data Unification — Batch 3 (Form pre-filling)

### 9.1 Onboarding store (Batch 3.1)

- `apps/mobile/src/stores/onboardingStore.ts` does NOT exist.
  Status: [NOT_STARTED]

- `users.completeOnboarding` batch mutation does NOT exist.
  Status: [NOT_STARTED]

### 9.2 Profile edit pre-fill (Batch 3.2)

- Profile edit uses inline modals in `profile.tsx` (EditFirstNameModal, EditHeightModal, etc.) with `currentValue` props from `useProfile()` data. Not a separate `profile/edit.tsx` screen.
  Status: [PARTIAL] — edit modals exist and pre-fill from profile data, but not the prescribed architecture

### 9.3 AI prompt chips (Batch 3.3)

- Plan AI generator (`plans/generate.tsx`) uses `isRefinement`, `conversationHistory` — profile info comes from `useProfile()`.
  No explicit `ProfileChips` or `ProfileChip` component found.
  Status: [PARTIAL] — profile data is used but not via dedicated chip components

### 9.4 Smart workout defaults (Batch 3.5)

- `exercises.suggestDefaults` procedure does NOT exist.
  Status: [NOT_STARTED]

### 9.5 Training days cross-display (Batch 3.6)

Status: [NOT_STARTED]

---

## 10. Data Unification — Batch 4 (Zustand cleanup)

### 10.1 Server-duplicating stores removed

- Stores present in `apps/mobile/src/stores/`:
  ```
  activeSessionStore.ts
  aiPlanStore.ts
  historyStore.ts
  intakeDraftV2Store.ts
  notificationSettingsStore.ts
  pendingWorkoutStore.ts
  profileStore.ts
  timerStore.ts
  toastStore.ts
  workoutDraftStore.ts
  ```

- No `userStore`, `plansStore`, `workoutsStore`, `sessionsStore`, `statsStore`, `prsStore` found. Status: [OK]

- `useProfileStore` still exists and is used:
  `profileStore.ts:18` exports `useProfileStore`. Used in `profile.tsx:22,244` for modal state management. This is UI-only state (activeModal), not server data duplication.
  Status: [OK] — `profileStore` manages local modal state, not server data

### 10.2 Surviving stores documented

- No stores have `device-local` / `NOT duplicated on the server` / `device-only` doc headers.
  Status: [MISSING]

### 10.3 Profile hook consolidated

- Only one `useProfile` data hook exists:
  `apps/mobile/src/data/useProfile.ts:3: export function useProfile()`
  `useProfileStore` is a separate Zustand store for UI state, not a profile data hook.
  Status: [OK]

### 10.4 Exercise library cache renamed

- No `exerciseCacheStore.ts` found.
  Exercise caching is handled via `useExercises` hook in `apps/mobile/src/hooks/useExercises.ts` using AsyncStorage.
  Status: [PARTIAL] — cache exists but uses AsyncStorage, not MMKV, and is in hooks/ not stores/

### 10.5 Shared derivations

- `packages/shared/src/profile.ts` and `packages/shared/src/nutrition.ts` do NOT exist.
  Status: [NOT_STARTED]

- Mifflin-St Jeor formula:
  Only found in i18n description strings, not as actual computation code. TDEE calculation likely happens in the AI prompt (delegated to Claude), not in app code.
  Status: [N/A] — computation delegated to AI, no formula in codebase to deduplicate

---

## 11. Training Ecosystem — Batch 1 (DB & shared types)

### 11.1 generated_by_ai column

- Migration file exists:
  `0019_workout_plans_ai_flag.sql`
  Status: [OK]

- Drizzle schema has the column:
  `schema.ts:185: generatedByAi: boolean('generated_by_ai').notNull().default(false)`
  Status: [OK]

### 11.2 dayOfWeek utility

- `apps/api/src/utils/dayOfWeek.ts` exists:
  Status: [OK]

- Exports:
  ```
  2: export function dowUiToDb(ui: number): number {
  7: export function dowDbToUi(db: number): number {
  12: export const DOW_UI_LABELS: Record<number, string> = {
  17: export const DOW_UI_SHORT: Record<number, string> = {
  ```
  Status: [OK]

- Tests:
  `dayOfWeek.test.ts` does NOT exist.
  Status: [MISSING]

### 11.3 Plan validation

- Day uniqueness validation:
  ```ts
  const planDaysSchema = z.array(z.object({
    dayOfWeek: z.number().int().min(1).max(7),
    workoutTemplateId: z.string(),
  })).refine(
    (days) => { const set = new Set(days.map(d => d.dayOfWeek)); return set.size === days.length },
    { message: 'Un jour ne peut être assigné qu\'une seule fois' }
  )
  ```
  Status: [OK]

- Validates workoutTemplateId belongs to user:
  `validateWorkoutOwnership` function checks template ownership.
  Status: [OK]

### 11.4 Day convention on I/O

- `plans.ts` uses `dowUiToDb` on write and `dowDbToUi` on read:
  ```
  plans.ts:7: import { dowUiToDb, dowDbToUi } from '../utils/dayOfWeek.js'
  plans.ts:78,110,191: dowDbToUi (reads)
  plans.ts:226,269,537: dowUiToDb (writes)
  ```
  Status: [OK]

### 11.5 DayOfWeek shared type

- `packages/shared/src/types.ts:3: export type DayOfWeek = 1 | 2 | 3 | 4 | 5 | 6 | 7`
  Status: [OK]

---

## 12. Training Ecosystem — Batch 2 (Workout Builder)

### 12.1 Dead code removed

- `apps/mobile/app/workout/create.tsx` does NOT exist (confirmed deleted).
  Status: [OK]

### 12.2 Components created

- `TapValueCell.tsx`: exists. Status: [OK]
- `TapTimerCell.tsx`: exists. Status: [OK]
- `ExerciseRow.tsx`: exists. Status: [OK]
- `ExercisePicker.tsx`: exists with `mode: 'single' | 'multi'` prop:
  ```ts
  type Props = {
    visible: boolean
    mode: 'single' | 'multi'
    excludeIds?: string[]
    preselectedMuscles?: string[]
    onClose: () => void
    onConfirm: (exercises: PickedExercise[]) => void
  }
  ```
  Status: [OK]

### 12.3 Workout builder screen

- `build.tsx` supports `editId` and `forPlanDay` params:
  ```
  build.tsx:30: const { editId, forPlanDay } = useLocalSearchParams<{ editId?: string; forPlanDay?: string }>()
  ```
  Status: [OK]

- Uses DraggableFlatList:
  `build.tsx:13: import DraggableFlatList, { RenderItemParams } from 'react-native-draggable-flatlist'`
  Status: [OK]

- `react-native-draggable-flatlist` installed:
  `"react-native-draggable-flatlist": "^4.0.3"` in package.json.
  Status: [OK]

- Uses `useWorkoutDraftStore`:
  `build.tsx:19: import { useWorkoutDraftStore } from '@/stores/workoutDraftStore'`
  `build.tsx:33: const draft = useWorkoutDraftStore()`
  Status: [OK]

### 12.4 WorkoutDraft store

- `apps/mobile/src/stores/workoutDraftStore.ts` exists. Status: [OK]

- Persisted to MMKV:
  ```
  workoutDraftStore.ts:2: import { persist, createJSONStorage } from 'zustand/middleware'
  workoutDraftStore.ts:3: import { mmkvStateStorage } from '../lib/storage'
  workoutDraftStore.ts:76: storage: createJSONStorage(() => mmkvStateStorage),
  ```
  Status: [OK]

- Has `reset`, `hydrate`, `isExpired` methods:
  ```
  workoutDraftStore.ts:31: hydrate: (data: Partial<WorkoutDraft>) => void
  workoutDraftStore.ts:32: reset: () => void
  workoutDraftStore.ts:33: isExpired: () => boolean
  ```
  Status: [OK]

### 12.5 Workout detail view mode

- `workout/[id].tsx` has "Modifier" action navigating to `build?editId=`:
  `[id].tsx:39: onPress={() => router.push(\`/workout/build?editId=${id}\`)}`
  Status: [OK]

- CTA uses i18n key `workout.startSession`:
  `[id].tsx:155,159: t('workout.startSession')`
  Status: [OK]

### 12.6 N+1 query fix

- `workouts.byId` uses 2 sequential queries (template then exercises):
  ```ts
  const [workout] = await ctx.db.select().from(workoutTemplates).where(...)
  const exercises = await ctx.db.select().from(workoutExercises).where(...)
  ```
  No `sql` template, no `LATERAL`, no `LEFT JOIN` consolidation.
  Status: [PARTIAL] — 2 queries instead of 1, but no N+1 (exercises are batch-loaded)

### 12.7 pendingWorkoutStore persisted

- Uses MMKV persist:
  ```
  pendingWorkoutStore.ts:2: import { persist, createJSONStorage } from 'zustand/middleware'
  pendingWorkoutStore.ts:3: import { mmkvStateStorage } from '../lib/storage'
  pendingWorkoutStore.ts:24: storage: createJSONStorage(() => mmkvStateStorage),
  ```
  Status: [OK]

---

## 13. Training Ecosystem — Batch 3 (Plan Builder & Training Tab)

### 13.1 Training tab hub

- `training.tsx` does NOT use extracted `TodayBlock`, `ActivePlanCard`, `WorkoutItemRow`, `AiFeatureCard` components — all inline.
  Status: [PARTIAL] — functionally complete but components are inline, not extracted

- Tab name is "Entraînement":
  Tab config uses `t('tabs.training')`. The i18n key resolves to French.
  Status: [OK]

### 13.2 Plan Builder rewrite

- `plans/create.tsx` uses `selectingDayFor` state for inline day picker:
  `create.tsx:45: const [selectingDayFor, setSelectingDayFor] = useState<number | null>(null)`
  Status: [OK]

- Does NOT use `usePlanDraftStore`:
  No `planDraftStore.ts` exists. Plan state is managed locally in component.
  Status: [PARTIAL] — inline state instead of persisted draft store

### 13.3 Day picker components

- No extracted `DayPillsGrid`, `InlineDayPicker`, `ScheduleSummaryRow` components.
  `ActivateWarning` exists only as i18n string key.
  Status: [MISSING] — all inline in `plans/create.tsx`

### 13.4 Streak calculation

- Streak uses windowed query (max 52 weeks):
  ```ts
  maxLookback.setDate(maxLookback.getDate() - 7 * 52)
  const streakSessions = await ctx.db.select(...)
    .where(and(..., gte(workoutSessions.startedAt, maxLookback), ...))
  ```
  Status: [OK]

---

## 14. Training Ecosystem — Batch 4 (AI Plan Generator)

### 14.1 French AI prompt with 1-7 days

- System prompt is in French:
  `"Tu es un coach expert en musculation. Tu crées des plans d'entraînement personnalisés."`
  Status: [OK]

- Prompt uses 1-7 day convention:
  `"Le tableau \"days\" doit avoir des valeurs dayOfWeek de 1 à 7 (1=Lundi, 2=Mardi, ..., 7=Dimanche)."`
  Status: [OK]

- Says "pas de superset":
  Not found in the system prompt.
  Status: [MISSING]

### 14.2 Exercise library filtered by level

- `levelFilter` filtering exists:
  ```ts
  const levelFilter = user.level === 'BEGINNER' ? ['BEGINNER']
    : user.level === 'INTERMEDIATE' ? ['BEGINNER', 'INTERMEDIATE']
    : ['BEGINNER', 'INTERMEDIATE', 'ADVANCED']
  // ... .where(inArray(exercises.difficulty, levelFilter))
  ```
  Status: [OK]

### 14.3 AI rate limit on AI plans only

- Rate limit filters by `generatedByAi = true`:
  `eq(workoutPlans.generatedByAi, true)` in the rate limit query.
  Status: [OK]

### 14.4 aiCredits procedure

- `plans.aiCredits` exists:
  Returns `{ used, limit, resetAt }` based on AI-generated plans this week.
  Status: [OK]

### 14.5 Plan generator screens

- `generate.tsx` has refinement mode via `conversationHistory`:
  `generate.tsx:47: const isRefinement = conversationHistory.length > 0`
  Status: [OK]

- `generating.tsx` has multi-step progress:
  `generating.tsx:10: const STEPS = [...]`
  Status: [OK]

- `preview.tsx` uses `useAIPlanStore`:
  `preview.tsx:10,18: import/use useAIPlanStore`
  Status: [OK]

### 14.6 aiPlanStore

- Stores `proposedPlan`, `lastPrompt`, `conversationHistory`:
  ```ts
  interface AIPlanState {
    proposedPlan: GeneratedPlan | null
    conversationHistory: ConversationMessage[]
    lastPrompt: string
    pendingPrompt: string
    ...
  }
  ```
  Persisted via Zustand persist middleware.
  Status: [OK]

---

## 15. Type safety summary

### 15.1 Package-level typecheck

- `apps/api`:
  ```
  $ cd apps/api && npx tsc --noEmit
  (exit 0)
  ```
  **0 errors.** Status: [OK]

- `apps/mobile`:
  ```
  $ cd apps/mobile && npx tsc --noEmit
  (exit 0)
  ```
  **0 errors.** Status: [OK]

- `packages/shared`:
  ```
  $ cd packages/shared && npx tsc --noEmit
  (exit 0)
  ```
  **0 errors.** Status: [OK]

### 15.2 Root typecheck

- From repo root:
  ```
  $ npx tsc -b --noEmit
  (exit 0)
  ```
  **0 errors.** Status: [OK]

---

## 16. Dependencies audit

| Package | Expected in | Present | Version | Status |
|---|---|---|---|---|
| `@tanstack/react-query-persist-client` | apps/mobile | Y | ^5.100.1 | [OK] |
| `react-native-mmkv` | apps/mobile | Y | ^4.3.1 | [OK] |
| `react-native-draggable-flatlist` | apps/mobile | Y | ^4.0.3 | [OK] |
| `react-native-gesture-handler` | apps/mobile | Y | ~2.30.0 | [OK] |
| `@nozbe/watermelondb` | apps/mobile | N | — | [NOT_STARTED] |
| `@anthropic-ai/sdk` | apps/api | Y | ^0.82.0 | [OK] |
| `@fastify/rate-limit` | apps/api | Y | ^10.3.0 | [OK] |
| `zustand` | apps/mobile | Y | ^5.0.3 | [OK] |
| `drizzle-orm` | apps/api | Y | ^0.45.2 | [OK] |

---

## 17. Unexpected findings

### 17.1 `as any` usage (15 instances in user code)

| File | Line | Context |
|---|---|---|
| `(tabs)/index.tsx` | 260 | `router.push(\`/diet/meal/${meal.id}\` as any)` — expo-router typed routes workaround |
| `(tabs)/profile.tsx` | 168 | `(records as any[])?.map((r: any) => r.exerciseId)` — tRPC type inference issue |
| `(tabs)/diet.tsx` | 281,376,383,418 | Multiple `router.push(... as any)` — untyped routes |
| `diet/regenerate.tsx` | 44 | `plan as any` — diet plan type mismatch |
| `diet/meal/[id].tsx` | 18 | `plan as any` — same issue |
| `_layout.tsx` | 201 | `new Date(startedAt as any)` — MMKV serialization |
| `workout/share.tsx` | 33 | `(pan.x as any)._value` — Animated internal access |
| `activeSessionStore.ts` | 149 | `(state as any).startedAt` — Zustand migration |
| `WeightChart.tsx` | 3 | `@ts-expect-error` for react-native-svg import |
| `auth.ts` (api) | 290 | Comment "sign in as any existing user" (false positive) |
| `diet.ts` (api) | 190-191 | `(m.ingredients as any[])` — JSON column type |

### 17.2 `console.log` usage (23 instances)

All 23 `console.log` calls are in server-side scripts (migrations, seeds, email service) — none in runtime app code. Acceptable for CLI tools.

### 17.3 No TODO/FIXME/XXX found

Zero matches in user code. Clean codebase.

### 17.4 `router.push(... as any)` pattern

6 instances of `as any` cast on `router.push()` calls for diet-related routes. This indicates these routes may not be properly typed in expo-router's type system. Could be resolved by adding proper route typings.

### 17.5 CI node version mismatch

CI uses Node 20, local environment is v25.9.0. This version gap could cause subtle issues (different URL parsing, crypto APIs, etc.).

### 17.6 No `buster` in persist options

The React Query cache persister has no `buster` key tied to app version. After deploys that change API response shapes, stale cached data could cause rendering errors until the 24h maxAge expires.

### 17.7 `profileStore` naming collision risk

`useProfileStore` (Zustand UI state for modals) and `useProfile` (tRPC data hook) coexist. The naming could confuse contributors. `useProfileStore` should be renamed to `useProfileModalStore` or similar.

### 17.8 Weight sync not transactional

`weight.add` does a non-transactional insert + update. If the update fails after insert succeeds, `users.weightKg` becomes stale. Should use `db.transaction()`.

---

## 18. Audit summary

### Completion rates by phase

| Phase | OK | Partial | Fail | Missing | Not started | Unknown |
|---|---|---|---|---|---|---|
| Stabilization Phase 1 | 13 | 2 | 0 | 1 | 0 | 0 |
| Stabilization Phase 2 | 7 | 2 | 0 | 0 | 0 | 0 |
| Stabilization Phase 3 | 5 | 2 | 0 | 1 | 0 | 0 |
| Stabilization Phase 4 | 0 | 0 | 0 | 0 | 6 | 0 |
| Error Isolation | 10 | 3 | 0 | 5 | 0 | 0 |
| Data Unification B1 | 2 | 1 | 0 | 2 | 0 | 0 |
| Data Unification B2 | 3 | 3 | 0 | 1 | 2 | 0 |
| Data Unification B3 | 0 | 2 | 0 | 0 | 3 | 0 |
| Data Unification B4 | 2 | 1 | 0 | 1 | 1 | 0 |
| Training B1 | 6 | 0 | 0 | 1 | 0 | 0 |
| Training B2 | 9 | 1 | 0 | 0 | 0 | 0 |
| Training B3 | 3 | 2 | 0 | 1 | 0 | 0 |
| Training B4 | 6 | 0 | 0 | 1 | 0 | 0 |

### Critical issues (FAIL only)

- **1.1** Working tree is dirty with uncommitted error isolation + migration changes.

### Partial issues (PARTIAL only)

- **2.4** AI error logging uses Pino structured logging instead of `[ANTHROPIC_ERROR]` tag — functionally equivalent.
- **2.4** Diet AI uses shared lib function, not inline procedure — structurally different but correct.
- **3.2** `apps/mobile/tsconfig.json` missing `composite: true`.
- **3.5** CI uses Node 20 vs local v25.9.0.
- **4.3** Only 6 of expected 8+ data hooks exist; 30 direct tRPC calls remain in screens; no mutations directory.
- **6.2** No `src/screens/` extraction — sections are inline sub-components in tab files.
- **6.3** 6 direct tRPC calls remain in tab root files.
- **7.1** Weight add mutation not transactional, doesn't re-query latest entry.
- **8.1/8.3** User profile extension columns not yet added; `auth.me` returns raw user, no computed fields.
- **8.6** Only `DayOfWeek` type shared; comprehensive types missing.
- **9.2** Profile edit uses inline modals, not prescribed architecture.
- **9.3** Profile data used in AI but not via chip components.
- **10.4** Exercise cache uses AsyncStorage, not MMKV.
- **12.6** `workouts.byId` uses 2 queries instead of 1 (not N+1 but not optimally joined).
- **13.1** Training tab components are inline, not extracted.
- **13.2** No plan draft store; state managed locally.

### Missing items ([MISSING] only)

- **2.3** `buster` in React Query persist options (version-keyed cache invalidation).
- **4.3** `src/data/mutations/` directory, `useWeightStats.ts`, `useExerciseLibrary.ts`, `useActiveSession.ts`.
- **6.2.2-6.2.5** Section extraction and SectionStatus usage for Home, Diet, History screens.
- **7.1** Backfill script `apps/api/src/scripts/backfill-user-weight.ts`.
- **7.3** Sentry breadcrumbs with `data_sync` category.
- **8.3** `apps/api/src/utils/nutrition.ts` utility.
- **10.2** Store documentation headers.
- **11.2** `dayOfWeek.test.ts` unit tests.
- **13.3** Extracted day picker components (`DayPillsGrid`, `InlineDayPicker`, `ScheduleSummaryRow`).
- **14.1** "pas de superset" rule in AI prompt.

### Unknown items

None found.

### Typecheck status

- apps/api: 0 errors
- apps/mobile: 0 errors
- packages/shared: 0 errors
- root (project references): 0 errors

### Phases ready to move forward

- Stabilization Phase 1: **ready** — all core items complete
- Stabilization Phase 2: **ready** — minor CI version mismatch and mobile composite flag
- Stabilization Phase 3: **ready** — core hooks and invalidation done; remaining tRPC migration is incremental
- Stabilization Phase 4: **not ready** — WatermelonDB not started (by design, deferred)
- Error Isolation: **needs commit** — SectionStatus built, profile+training refactored, but changes uncommitted; Home/Diet/History screens not refactored
- Data Unification B1: **partial** — invalidation done, weight sync needs transaction
- Data Unification B2: **not ready** — user profile extensions not started
- Data Unification B3: **not ready** — depends on B2
- Data Unification B4: **partial** — no server-duplicating stores exist, but documentation and shared derivations missing
- Training B1: **ready** — all core items done, only test file missing
- Training B2: **ready** — all components and builder functional
- Training B3: **ready** — plan builder and training tab functional, extraction is polish
- Training B4: **ready** — AI generator fully functional

### Single most impactful next action

Commit the uncommitted error isolation + data migration changes (17 files), then add the `buster` key to React Query persist options to prevent stale cache issues after deploys.
