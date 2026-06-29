# Tanren — Full Technical Audit (2026-04-24)

## Environment

| Component | Version |
|---|---|
| Node | v25.9.0 |
| Xcode | 26.4 (Build 17E192) |
| Expo SDK | 55 |
| React Native | 0.83.6 |
| macOS | Darwin 25.4.0 |
| Branch (dev) | `TanrenV2` |
| Branch (deploy) | `tanren` (Railway) |

---

## ISSUE 1 — iOS build fails (`xcodebuild` exit code 65)

**Error:**
```
ios/Tanren/AppDelegate.swift:1:8
import Expo
       ^ ambiguous implicit access level for import of 'Expo'; it is imported as 'internal' elsewhere
```

**Root cause:** Xcode 26 / Swift 6 enforces stricter import access levels. The `Expo` module is imported as `internal` by CocoaPods-generated code, but `AppDelegate.swift` imports it without an explicit access level, creating an ambiguity.

**Current state:** `public import Expo` was applied to AppDelegate.swift (uncommitted change), but then `pod install` made Podfile.lock drift, causing a second build failure: "The sandbox is not in sync with the Podfile.lock." `pod install` was run successfully, but the build hasn't been retried yet.

**Fix:**
1. Keep `public import Expo` in `ios/Tanren/AppDelegate.swift` (line 1)
2. Ensure `pod install` has been run after any dependency change
3. Rebuild with `npx expo run:ios`

**Uncommitted files:**
- `apps/mobile/ios/Tanren/AppDelegate.swift` (the `public import` fix)
- `apps/mobile/ios/Podfile.lock` (updated by `pod install`)

---

## ISSUE 2 — App launches into stale workout on startup

**Root cause:** `SessionResumeChecker` in `_layout.tsx` (line 157) reads persisted `activeSessionStore` via MMKV. If a previous workout session was not properly finished, the persisted state contains a `currentWorkout` and `startedAt`, and the checker auto-navigates to `/workout/active`.

**Current state (NOT fixed — previous fixes were lost):**
- Storage key is still `active-session-v1` (line 137 of `activeSessionStore.ts`)
- `SessionResumeChecker` uses a 6-hour window (line 165), no `hasIncompleteSets` check, no NaN guard

**Code at `_layout.tsx:157-173`:**
```tsx
function SessionResumeChecker() {
  const checked = useRef(false)
  useEffect(() => {
    if (checked.current) return
    checked.current = true
    const { currentWorkout, startedAt, finishSession } = useActiveSessionStore.getState()
    if (currentWorkout && startedAt) {
      const ageHours = (Date.now() - new Date(startedAt).getTime()) / 3600000
      if (ageHours < 6) {              // <-- too generous, should be 3
        router.push('/workout/active')
      } else {
        finishSession()
      }
    }
  }, [])
  return null
}
```

**Fix needed:**
1. Bump MMKV key from `active-session-v1` to `active-session-v2` in `activeSessionStore.ts` (line 137) — orphans any stale persisted session
2. Add `hasIncompleteSets` check — only resume if there are incomplete sets
3. Add NaN guard on `startedAt` parsing
4. Tighten window from 6 hours to 3 hours
5. Proposed code:
```tsx
function SessionResumeChecker() {
  const checked = useRef(false)
  useEffect(() => {
    if (checked.current) return
    checked.current = true
    const { currentWorkout, startedAt, exercises, finishSession } = useActiveSessionStore.getState()
    if (!currentWorkout) return
    if (!startedAt) { finishSession(); return }
    const ts = startedAt instanceof Date ? startedAt.getTime() : new Date(startedAt as any).getTime()
    if (isNaN(ts)) { finishSession(); return }
    const ageHours = (Date.now() - ts) / 3600000
    const hasIncompleteSets = exercises.some(ex => ex.sets.some(s => !s.isCompleted))
    if (ageHours < 3 && hasIncompleteSets) {
      router.push('/workout/active')
    } else {
      finishSession()
    }
  }, [])
  return null
}
```

---

## ISSUE 3 — No React Query persistence (data reloads on every app launch)

**Problem:** Every time the app launches, all screens show loading states while tRPC queries re-fetch from the server. There is no offline cache. This is visible as "no data" flicker on Home, Workouts, History, Diet tabs.

**Current state:**
- `QueryClient` has `staleTime: 30_000` (30s) but no persistence layer
- `@tanstack/react-query-persist-client` is NOT installed
- MMKV storage adapter exists at `src/lib/storage.ts` (used by Zustand stores)
- No `PersistQueryClientProvider` wrapping the app

**Fix needed:**
1. Install `@tanstack/query-sync-storage-persister` and `@tanstack/react-query-persist-client`
2. Create an MMKV-based persister using the existing `storage.ts` adapter
3. Wrap the app with `PersistQueryClientProvider` instead of `QueryClientProvider`
4. Set `gcTime` (garbage collection time) to match persistence TTL (e.g. 24 hours)
5. This gives instant UI on app launch with stale-while-revalidate behavior

---

## ISSUE 4 — AI workout plan generation fails intermittently

**Symptoms:** "An internal error occurred" when calling `plans.generateWithAI`

**Root cause (previously identified):** The deployed Docker image on Railway sometimes serves stale compiled JS. The `tRPC` error formatter masks all DB errors as "An internal error occurred" in production.

**Current state:**
- Error logging was added to tRPC error formatter on `tanren` branch (console.error `[TRPC_ERROR]`)
- Model is `claude-sonnet-4-6` (confirmed working for diet generation)
- `tanren` branch has a merge of `TanrenV2` + 3 debug commits ahead

**Fix needed:**
1. After any code change, always run `railway up` (not just git push) to force a clean Docker build
2. Consider removing the DB error masking in the error formatter, or at least logging the original error in all cases
3. Verify ANTHROPIC_API_KEY is set in Railway environment variables
4. Add try/catch with explicit error message around the Anthropic API call (may already be present on `tanren` branch)

---

## ISSUE 5 — Hero workout card not showing on Home screen

**Logic (index.tsx line 325):**
```tsx
{nextWorkout && isTodayWorkout && ( <HeroCard ... /> )}
```
Where:
```tsx
const todayUiDow = jsDowToUi(new Date().getDay())  // 1=Mon, 7=Sun
const isTodayWorkout = nextWorkout?.dayOfWeek === todayUiDow && !isTodayWorkoutDone
```

**Previous fix:** Deleted all 13 test sessions from the database so `isTodayWorkoutDone` would be `false` and `nextWorkout` would point to today's workout.

**Potential ongoing issue:**
- The `plans.active` API endpoint sorts undone workouts by proximity to today using DB-format days, converts to UI format via `dowDbToUi()`, and returns the nearest undone workout as `nextWorkout`
- If all workouts for the week are marked done (sessions exist), `nextWorkout` is null and the hero card won't show
- The week boundary is calculated from Monday 00:00 UTC — timezone issues could cause incorrect "done" detection

**Day-of-week conventions (verified consistent):**
- DB: 0-6 (Sun=0, Mon=1) — matches JavaScript `Date.getDay()`
- UI: 1-7 (Mon=1, Sun=7) — used in API responses and mobile
- Conversions: `dowUiToDb()` and `dowDbToUi()` in `apps/api/src/utils/dayOfWeek.ts`
- Mobile: `jsDowToUi()` in `index.tsx` — same logic as `dowDbToUi()`

---

## ISSUE 6 — Branch divergence (TanrenV2 vs tanren)

**Current state:**
- `TanrenV2` is the development branch (all new code goes here)
- `tanren` is the Railway deploy branch
- `tanren` has 4 commits ahead of `TanrenV2` (3 debug commits + 1 merge commit)
- `TanrenV2` has 0 commits ahead of `tanren` (tanren includes all TanrenV2 code)

**Commits only on `tanren` (not on TanrenV2):**
```
8453aae Merge branch 'TanrenV2' into tanren
6a439d2 Add console.error logging to tRPC error formatter for debugging
f0675e7 Revert model to claude-sonnet-4-6, keep error logging
bf06d4f Fix AI generation: use claude-sonnet-4-5 model, add error logging
```

**Risk:** The extra debug `console.error` in the tRPC error formatter on `tanren` is NOT on `TanrenV2`. If TanrenV2 is merged into tanren again, this debug logging will be preserved (merge, not rebase). But if tanren is reset to TanrenV2, the logging is lost.

---

## ISSUE 7 — TypeScript errors at monorepo root level

**Count:** 323 errors when running `npx tsc --noEmit` from repo root

**Breakdown:**
- 311 are TS2307 (Cannot find module) — all `@/*` path aliases that only resolve within `apps/mobile/`
- 12 are real type errors in the API (optional vs required properties in Zod schemas / Drizzle inserts)

**Per-package check:**
- `apps/mobile/` — 0 errors (path aliases resolve correctly)
- `apps/api/` — 0 errors

**Root cause:** No root `tsconfig.json` with project references. Running `tsc` from root picks up files from both packages but doesn't know about mobile's `@/*` path alias.

**Impact:** Low — CI/builds run per-package. But confusing for debugging.

**Real API type errors (would surface if someone ran tsc differently):**
1. `exercises.ts:39` — `name` is optional in input but required in Drizzle insert
2. `workouts.ts:37` — same pattern, `name` optional vs required
3. `plans.ts:212,245` — `workoutTemplateId` optional in Zod schema but required in downstream code
4. `diet.ts:357` — `age` optional in input but required in `IntakeData` type
5. `auth.test.ts:79,86` — assigning to readonly `NODE_ENV`

---

## ISSUE 8 — MMKV Date serialization fragility

**Problem:** `activeSessionStore` persists `startedAt` as ISO string via `partialize`, and rehydrates it as `Date` via `onRehydrateStorage`. But `SessionResumeChecker` calls `new Date(startedAt).getTime()` without checking if `startedAt` is already a Date or still a string (race between rehydration and checker).

**Current rehydration code (activeSessionStore.ts:147-149):**
```tsx
onRehydrateStorage: () => (state) => {
  if (state?.startedAt && typeof state.startedAt === 'string') {
    (state as any).startedAt = new Date(state.startedAt as any)
```

**Risk:** If rehydration hasn't completed when `SessionResumeChecker` runs, `startedAt` may still be a string, causing `startedAt.getTime()` to fail (no such method on strings). The current checker does `new Date(startedAt).getTime()` which handles both, but it's fragile.

---

## ISSUE 9 — Railway auto-deploy not triggering on git push

**Problem:** Pushing to `tanren` branch doesn't always trigger a Railway deployment. Manual `railway up` is needed.

**Fix:** Check Railway dashboard → Settings → ensure the `tanren` branch is configured as the deploy trigger. Alternatively, always use `railway up` after merging.

---

## ISSUE 10 — No offline-first architecture (WatermelonDB not implemented)

**Per CLAUDE.md Step 17:** WatermelonDB was planned for offline-first sync. It is NOT implemented. The app relies entirely on tRPC API calls with no local database.

**Impact:** Without network, the app shows empty states. Combined with Issue 3 (no React Query persistence), every app launch requires a server round-trip.

**Pragmatic fix:** React Query persistence (Issue 3) gives 80% of the benefit without WatermelonDB's complexity. Full offline-first with WatermelonDB is a larger effort for later.

---

## Summary — Priority Order

| # | Issue | Severity | Effort | Blocking? |
|---|---|---|---|---|
| 1 | iOS build fails (Swift import) | Critical | 5 min | YES — can't run the app |
| 2 | Stale workout auto-resume | High | 15 min | Breaks UX on every launch |
| 3 | No React Query persistence | High | 30 min | Data flickers on every launch |
| 4 | AI plan generation fails | Medium | 10 min | Needs `railway up` after changes |
| 5 | Hero card not showing | Medium | 5 min | Depends on DB state |
| 6 | Branch divergence | Low | 10 min | Maintenance overhead |
| 7 | Root TS errors | Low | 15 min | Cosmetic — per-package is clean |
| 8 | MMKV Date fragility | Low | 5 min | Fixed by Issue 2 fix |
| 9 | Railway auto-deploy | Low | 5 min | Config check |
| 10 | No offline-first (WatermelonDB) | Low | Days | Mitigated by Issue 3 |
