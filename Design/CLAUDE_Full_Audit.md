# TANREN — Full Code Audit

> **For Claude Code.** Read-only audit pass. Verify the state of implementation across all prompts produced in this work stream:
> - `CLAUDE_Stabilization_Plan.md` (4 phases)
> - `CLAUDE_Error_Isolation.md`
> - `CLAUDE_Data_Sharing_Discovery.md` + `CLAUDE_Data_Unification_Implementation.md` (4 batches)
> - `CLAUDE_Training_Implementation.md` (4 batches)
>
> Produce a single file `AUDIT_STATE.md` at the repo root. **Do NOT fix anything.** Observe, measure, report.
>
> **Scope**: static code audit only. No running the app, no UX flow testing, no simulator launches. The user will test flows themselves once they have your report.
>
> **Output contract**: rigid structure. Machine-parseable. If a section doesn't apply (feature not implemented yet), keep the section and mark all its items `[NOT_STARTED]` — don't skip it.

---

## Output format contract

Follow this structure EXACTLY. Do not rename sections. Do not reorder. Sub-items can be added within sections but section numbering is fixed.

### Status tokens

Every check item ends with one of these tokens (uppercase, in brackets):

- `[OK]` — Implemented as specified, verified via file/grep evidence
- `[PARTIAL]` — Some aspects present, others missing — describe what's missing
- `[FAIL]` — Implemented but incorrect (wrong logic, wrong value, broken state)
- `[MISSING]` — Expected file/code/config not found at all
- `[NOT_STARTED]` — This phase/batch hasn't been started yet (valid state — don't treat as failure)
- `[UNKNOWN]` — Can't determine from static analysis (e.g., requires Railway dashboard access)
- `[N/A]` — Not applicable to current state

### Evidence rule

Every check **must cite evidence**. Back every claim with:
- A file path and line number, OR
- A shell command and its actual output, OR
- A grep result with match content

No "looks good" without data. When you can't find something, say so explicitly with `[MISSING]`.

Use fenced code blocks for command outputs:

````
- Branch topology verified:
  ```
  $ git branch -r
  origin/HEAD -> origin/main
  origin/main
  ```
  Status: [OK]
````

### Honesty rules

- If you can't verify, mark `[UNKNOWN]` with specific reason (not a vague "can't tell")
- If partial, list exactly what's missing
- Do NOT speculate, do NOT suggest fixes in this document — the user analyzes the report and decides
- If a whole phase was skipped, mark every item in that phase `[NOT_STARTED]`, don't invent stub evidence

---

## Begin the report

Start `AUDIT_STATE.md` with this exact preamble (fill placeholders from actual repo state):

```markdown
# TANREN — Full Code Audit State

Generated: <ISO datetime>
Branch: <current branch>
HEAD SHA: <short sha>
Working tree: <clean | dirty with N changes>

## Environment

| Component | Version |
|---|---|
| Node | <node --version> |
| npm | <npm --version> |
| Expo SDK | <from apps/mobile/package.json> |
| React Native | <from apps/mobile/package.json> |
| TypeScript (api) | <from apps/api/package.json> |
| TypeScript (mobile) | <from apps/mobile/package.json> |

## Phases audited

- Stabilization Plan — Phase 1, 2, 3, 4
- Error Isolation
- Data Unification — Batches 1, 2, 3, 4
- Training Ecosystem — Batches 1, 2, 3, 4
```

Then the numbered sections below, in this exact order. There are 12 sections total.

---

## 1. Repository state

### 1.1 Branch topology (Stabilization 1.1)

- [ ] Only `main` branch exists on remote
  - Command: `git branch -r`
  - Expected: `origin/main` (and `origin/HEAD -> origin/main`) only
  - Report: exact output
- [ ] No `tanren`, `TanrenV2`, `dev`, `staging` branches on remote
  - Status per branch
- [ ] Working tree clean
  - Command: `git status --porcelain`
  - Expected: empty output

### 1.2 Commit history

- [ ] List last 30 commits on `main`
  - Command: `git log --oneline -30 main`
  - Report: full output
- [ ] Identify commits corresponding to each phase/batch below
  - Stabilization Phase 1: expect commits with `fix(ios)`, `fix(mobile): stop resuming stale`, `feat(mobile): React Query persistence`, `fix(api): surface real errors`
  - Stabilization Phase 2: expect commits with `fix(api):` type errors, `chore(ts):` root tsconfig
  - Stabilization Phase 3: expect commits with `feat(mobile): centralized invalidation helpers`, `feat(mobile): data access abstraction`
  - Error Isolation: expect commits with `feat(mobile): SectionStatus`
  - Data Unification: expect commits with `feat(db):`, `feat(api): unified auth.me`, `feat(onboarding):`
  - Training Ecosystem: expect commits with `feat(db): generated_by_ai`, `feat(mobile): TapValueCell`, `feat(mobile): plan builder rewrite`

Report: which expected commits found, which missing.

### 1.3 CI presence (Stabilization 2.5)

- [ ] `.github/workflows/ci.yml` exists
- [ ] If present, report contents of the typecheck job

### 1.4 Husky hook (Stabilization 3.1)

- [ ] `.husky/pre-commit` exists and is executable
  - Command: `ls -la .husky/pre-commit`
  - Expected: executable, contains `tsc --noEmit -b`

### 1.5 Railway configuration

- [ ] `railway.toml` or `railway.json` exists at repo root (if using config-as-code)
- [ ] Report any deploy-related config files found

---

## 2. Stabilization — Phase 1 (Unblock)

### 2.1 iOS build fix (1.2)

- [ ] `apps/mobile/ios/Tanren/AppDelegate.swift` line 1 is `public import Expo`
  - Command: `head -1 apps/mobile/ios/Tanren/AppDelegate.swift`
- [ ] `apps/mobile/ios/Podfile.lock` is committed
  - Command: `git log -1 --format=%H apps/mobile/ios/Podfile.lock`
  - Report: commit SHA

### 2.2 Session resume checker (1.3)

In `apps/mobile/src/stores/activeSessionStore.ts`:

- [ ] Storage key is `active-session-v2` (not v1)
  - Command: `grep -n "active-session-" apps/mobile/src/stores/activeSessionStore.ts`

In `apps/mobile/app/_layout.tsx`:

- [ ] `SessionResumeChecker` function exists
- [ ] Checks `hasIncompleteSets` before navigating
  - Command: `grep -n "hasIncompleteSets" apps/mobile/app/_layout.tsx`
- [ ] Handles `startedAt` as both `Date` and `string`
  - Command: `grep -n "startedAt instanceof Date" apps/mobile/app/_layout.tsx`
- [ ] NaN guard present
  - Command: `grep -n "isNaN" apps/mobile/app/_layout.tsx`
- [ ] Window is 3 hours
  - Command: `grep -n "ageHours < 3" apps/mobile/app/_layout.tsx`
- [ ] Paste the current `SessionResumeChecker` function body verbatim in a code block

### 2.3 React Query persistence (1.4)

- [ ] Dependency installed
  - Command: `grep "react-query-persist-client" apps/mobile/package.json`
- [ ] `apps/mobile/src/lib/queryPersister.ts` exists
  - Command: `ls apps/mobile/src/lib/queryPersister.ts`
  - If present, report: first 20 lines (to verify MMKV usage)
- [ ] `PersistQueryClientProvider` wired in `_layout.tsx`
  - Command: `grep -n "PersistQueryClientProvider" apps/mobile/app/_layout.tsx`
- [ ] `QueryClientProvider` (non-persist) is removed
  - Command: `grep -n "QueryClientProvider" apps/mobile/app/_layout.tsx`
  - Expected: only `PersistQueryClientProvider` found; if both present, flag [PARTIAL]
- [ ] `gcTime` >= 24h
  - Command: `grep -A 10 "new QueryClient" apps/mobile/app/_layout.tsx`
  - Expected: `gcTime: 24 * 60 * 60 * 1000` or equivalent
- [ ] `buster` in `persistOptions` references app version
  - Command: `grep -A 15 "persistOptions" apps/mobile/app/_layout.tsx`

### 2.4 AI plan generation error exposure (1.5)

- [ ] tRPC `errorFormatter` contains `console.error('[TRPC_ERROR]'`
  - Command: `grep -rn "TRPC_ERROR" apps/api/src/`
- [ ] `plans.generateWithAI` wraps Anthropic call in try/catch
  - Command: `grep -B 2 -A 40 "generateWithAI" apps/api/src/routers/plans.ts`
  - Expected: visible try/catch around anthropicClient.messages.create
- [ ] Logs `[ANTHROPIC_ERROR]` on failure
  - Command: `grep -rn "ANTHROPIC_ERROR" apps/api/src/`
- [ ] `diet.generateWithAI` follows the same pattern
  - Command: `grep -B 2 -A 40 "generateWithAI" apps/api/src/routers/diet.ts`
- [ ] Both use the same Claude model string
  - Command: `grep -n "claude-sonnet\|claude-opus\|claude-haiku" apps/api/src/routers/plans.ts apps/api/src/routers/diet.ts`

---

## 3. Stabilization — Phase 2 (Harden)

### 3.1 API type errors fixed (2.1)

- [ ] `apps/api` typecheck passes
  - Command: `cd apps/api && npx tsc --noEmit 2>&1 | tail -20`
  - Report error count
- [ ] `exercises.ts` input schema: `name` required
  - Command: `grep -B 2 -A 5 "z.object" apps/api/src/routers/exercises.ts | head -20`
- [ ] `workouts.ts` input schema: `name` required
  - Similar grep on workouts.ts
- [ ] `plans.ts` input schema: `workoutTemplateId` required (not optional)
  - Grep around the plan day schema
- [ ] `diet.ts` IntakeData: age is required, derived from dateOfBirth
  - Grep around IntakeData usage line 357
- [ ] `auth.test.ts`: uses `vi.stubEnv` or `@ts-expect-error` for NODE_ENV
  - Command: `grep -n "NODE_ENV\|stubEnv" apps/api/src/routers/auth.test.ts`

### 3.2 Root tsconfig with project references (2.2)

- [ ] `tsconfig.json` at repo root exists
  - Command: `cat tsconfig.json`
  - Expected: contains `"references"` pointing to apps/api, apps/mobile, packages/shared
- [ ] Each workspace has `"composite": true`
  - Command: `grep -l "composite.*true" apps/api/tsconfig.json apps/mobile/tsconfig.json packages/shared/tsconfig.json`
- [ ] Root typecheck passes
  - Command: `npx tsc --noEmit -b 2>&1 | tail -10`
  - Report error count

### 3.3 Workouts/Training tab rename (2.3)

- [ ] `apps/mobile/app/(tabs)/training.tsx` exists
  - Command: `ls apps/mobile/app/\(tabs\)/`
- [ ] No stale references to `workouts.tsx` in router
  - Command: `grep -rn "(tabs)/workouts\|workouts\.tsx" apps/mobile/app/`
- [ ] Tab screen config uses name="training"
  - Command: `grep -A 3 "name=\"training\"\|name={'training'}" apps/mobile/app/\(tabs\)/_layout.tsx`

### 3.4 DEPLOY.md runbook (2.6)

- [ ] `DEPLOY.md` exists at repo root
  - Command: `ls DEPLOY.md`
- [ ] Contains sections: Branches, Standard dev flow, Railway troubleshooting, iOS build issues, tRPC errors, Critical env vars, Database access, Rollback
  - Command: `grep -n "^## " DEPLOY.md`

### 3.5 CI workflow exists (2.5)

- [ ] `.github/workflows/ci.yml` exists and runs typecheck
  - Command: `cat .github/workflows/ci.yml`
  - Expected: node version 22, npm ci, npx tsc --noEmit -b

---

## 4. Stabilization — Phase 3 (Data access abstraction)

### 4.1 Husky pre-commit hook (3.1)

- [ ] Already covered in 1.4 — verify executable and content

### 4.2 Invalidation helpers (3.2)

- [ ] `apps/mobile/src/lib/invalidation.ts` exists
  - Command: `ls apps/mobile/src/lib/invalidation.ts`
- [ ] Exports these named hooks:
  - `useInvalidateUserProfile`
  - `useInvalidateWeight`
  - `useInvalidateActivePlan`
  - `useInvalidateWorkouts`
  - `useInvalidateSessions`
  - Command: `grep -n "^export function useInvalidate" apps/mobile/src/lib/invalidation.ts`
- [ ] No direct `utils.X.invalidate()` calls in screen files
  - Command: `grep -rn "utils\.[a-z]*\.[a-z]*\.invalidate" apps/mobile/app/`
  - Expected: 0 results (screens should use the helpers); if any, flag [PARTIAL] and list them

### 4.3 Data access abstraction layer (3.3)

- [ ] `apps/mobile/src/data/` directory exists
  - Command: `ls apps/mobile/src/data/`
  - Report: all files in the directory
- [ ] Expected hook files present:
  - `useProfile.ts`
  - `useActivePlan.ts`
  - `useWorkouts.ts`
  - `useSessions.ts`
  - `useWeight.ts`
  - `useWeightStats.ts`
  - `useExerciseLibrary.ts`
  - `useActiveSession.ts`
- [ ] `apps/mobile/src/data/mutations/` directory exists
  - Command: `ls apps/mobile/src/data/mutations/`
  - Expected: `useLogWeight.ts`, `useSaveWorkout.ts`, `useCompleteSession.ts`, `useLogSet.ts`, `useSavePlan.ts`
- [ ] Screens do NOT import tRPC directly (only the `src/data/*` hooks do)
  - Command: `grep -rn "trpc\.[a-z]*\.[a-z]*\.use\(Query\|Mutation\)" apps/mobile/app/`
  - Expected: 0 or few results — report all findings with file + line
- [ ] Report sample file: first 20 lines of `useProfile.ts`

### 4.4 Architecture docs in CLAUDE.md (3.4)

- [ ] `CLAUDE.md` contains a "Data layer architecture" section
  - Command: `grep -n "Data layer\|## Data\|tRPC \+ React Query\|src/data/\*" CLAUDE.md`
  - Expected: multiple matches describing the data layer

---

## 5. Stabilization — Phase 4 (WatermelonDB offline-first)

Per the plan, this is a separate effort of 5-10 days, expected AFTER Phase 3 is stable. If not started, mark everything `[NOT_STARTED]` — that's a valid state.

### 5.1 WatermelonDB installed

- [ ] Dependencies present in `apps/mobile/package.json`
  - Command: `grep "watermelondb" apps/mobile/package.json`
  - Expected: `@nozbe/watermelondb` and `@nozbe/with-observables`

### 5.2 Local schema

- [ ] `apps/mobile/src/db/schema.ts` exists
- [ ] Tables defined: users, workout_templates, workout_exercises, workout_plans, workout_plan_days, workout_sessions, session_exercises, exercise_sets, weight_entries, exercises
- [ ] Each table has columns: `server_id`, `server_updated_at`, `is_synced`, `is_deleted`

### 5.3 Models

- [ ] `apps/mobile/src/db/models/` directory exists with Model classes

### 5.4 Sync engine

- [ ] API has `sync.ts` router with `pull` and `push` procedures
  - Command: `ls apps/api/src/routers/sync.ts 2>/dev/null`
- [ ] Mobile has `src/db/sync.ts` with `synchronize` call

### 5.5 Hooks rewritten to observe WatermelonDB

- [ ] `src/data/*` hooks use `database.collections` instead of tRPC
  - Check `useProfile.ts` for `useDatabase`, `withObservables`, or equivalent

### 5.6 Acceptance deferred

If 5.1-5.5 all `[NOT_STARTED]`, section 5.6 is automatically `[NOT_STARTED]` too — don't test further.

---

## 6. Error Isolation

### 6.1 SectionStatus component

- [ ] `apps/mobile/src/components/SectionStatus.tsx` exists
  - Command: `ls apps/mobile/src/components/SectionStatus.tsx`
- [ ] Exports a named `SectionStatus` component
  - Command: `grep -n "export.*SectionStatus" apps/mobile/src/components/SectionStatus.tsx`
- [ ] Props include `query`, `children`, `errorLabel`
  - Command: `grep -A 20 "type SectionStatusProps" apps/mobile/src/components/SectionStatus.tsx`
- [ ] Handles these states correctly:
  - `isPending && !data` → skeleton / spinner
  - `isError && data == null` → inline error with retry
  - `data != null` → render children (even if stale/refetching)
  - Verify by reading the component body — paste key conditional logic
- [ ] Error text is French ("Impossible de charger", "Vérifie ta connexion", "Réessayer")
  - Command: `grep -n "Impossible\|Réessayer\|Vérifie" apps/mobile/src/components/SectionStatus.tsx`
- [ ] Uses amber color (not red)
  - Command: `grep -n "amber\|#E8A900\|#D98E00" apps/mobile/src/components/SectionStatus.tsx`

### 6.2 Section extraction per screen

For each of the screens below, verify:
- No screen-level error gate that kills the whole screen
- Sections extracted into separate files under `apps/mobile/src/screens/<tab>/`
- At least some sections use `<SectionStatus>`

#### 6.2.1 Profile

- [ ] `apps/mobile/app/(tabs)/profile.tsx` does not contain `if (isError) return <FullError` or similar global guard
  - Command: paste the full content of `profile.tsx` in a code block (should be thin: scrollview + section components)
- [ ] `apps/mobile/src/screens/profile/` exists with section files
  - Command: `ls apps/mobile/src/screens/profile/ 2>/dev/null`
- [ ] At least one section uses SectionStatus
  - Command: `grep -l "SectionStatus" apps/mobile/src/screens/profile/*.tsx 2>/dev/null`

#### 6.2.2 Home

- [ ] `apps/mobile/app/(tabs)/index.tsx` refactored
- [ ] Sections extracted
- [ ] SectionStatus usage

#### 6.2.3 Training

- [ ] `apps/mobile/app/(tabs)/training.tsx` refactored
- [ ] Sections extracted
- [ ] SectionStatus usage

#### 6.2.4 Diet

- [ ] `apps/mobile/app/(tabs)/diet.tsx` refactored
- [ ] Sections extracted
- [ ] SectionStatus usage

#### 6.2.5 History

- [ ] `apps/mobile/app/(tabs)/history.tsx` refactored
- [ ] Sections extracted
- [ ] SectionStatus usage

### 6.3 tRPC leak check

- [ ] No direct `trpc.X.useQuery` calls inside `app/(tabs)/*.tsx` root files
  - Command: `grep -rn "trpc\.[a-z]*\.[a-z]*\.useQuery" apps/mobile/app/\(tabs\)/`
  - Report: each match with file + line
  - If many, this indicates sections aren't fully extracted — flag [PARTIAL]

### 6.4 React Query retry config

In `_layout.tsx` (or wherever QueryClient is instantiated):

- [ ] `retry` is a function that rejects 4xx errors
  - Command: `grep -A 10 "retry:" apps/mobile/app/_layout.tsx`
- [ ] `retryDelay` uses exponential backoff
  - Expected: `(attempt) => Math.min(1000 * 2 ** attempt, ...)`
- [ ] Mutations have `retry: 0`
  - Command: `grep -A 3 "mutations:" apps/mobile/app/_layout.tsx`

---
## 7. Data Unification — Batch 1 (Correctness)

### 7.1 Weight sync (Batch 1.1)

- [ ] `apps/api/src/routers/weight.ts` `add` mutation uses `db.transaction`
  - Command: `grep -B 2 -A 30 "add: protectedProcedure" apps/api/src/routers/weight.ts`
  - Expected: `db.transaction` wrapping insert + users.weight_kg update
- [ ] Inside the transaction, after insert, the latest entry is re-queried and `users.weight_kg` synced
  - Expected: `orderBy(desc(weightEntries.measuredAt)).limit(1)` then `tx.update(users).set({ weightKg: ... })`
- [ ] Same pattern in `delete` mutation
- [ ] Backfill script exists
  - Command: `ls apps/api/src/scripts/backfill-user-weight.ts 2>/dev/null`
- [ ] Script is in package.json
  - Command: `grep "backfill:weight" apps/api/package.json`

### 7.2 Invalidation helpers wired (Batch 1.2)

- [ ] `apps/mobile/src/lib/invalidation.ts` exists (already checked in 4.2)
- [ ] At least these mutations use the helpers:
  - `weight.add` → `useInvalidateWeight`
  - `users.updateMe` → `useInvalidateUserProfile`
  - `plans.create/update/activate` → `useInvalidateActivePlan`
  - `sessions.complete` → `useInvalidateSessions`
  - Command: `grep -rn "useInvalidate" apps/mobile/src/data/mutations/ apps/mobile/app/`
  - Report: list findings

### 7.3 Sentry breadcrumbs (Batch 1.4)

- [ ] At least one `Sentry.addBreadcrumb` call with category `data_sync`
  - Command: `grep -rn "Sentry.addBreadcrumb\|data_sync" apps/mobile/`

---

## 8. Data Unification — Batch 2 (Source of truth)

### 8.1 DB schema extensions (Batch 2.1)

- [ ] Migration file exists for unified user profile columns
  - Command: `ls apps/api/src/db/migrations/ | grep -i "unified\|user_profile\|nutrition\|activity"`
- [ ] Enums defined in Drizzle schema
  - Command: `grep -n "pgEnum.*nutrition\|pgEnum.*activity\|pgEnum.*equipment\|pgEnum.*unit_system\|pgEnum.*language" apps/api/src/db/schema.ts`
- [ ] `users` table has columns: `nutrition_direction`, `activity_level_override`, `dietary_restrictions`, `allergies`, `equipment`, `date_of_birth`, `unit_system`, `language`
  - Command: `grep -A 40 "export const users = pgTable" apps/api/src/db/schema.ts | head -60`

### 8.2 Duplicated fields removed (Batch 2.2)

- [ ] No `current_weight`, `user_weight`, `weightCurrent` columns/fields exist anywhere
  - Command: `grep -rn "current_weight\|currentWeight\|user_weight\|userWeight" apps/ packages/`
  - Expected: 0 results (all consolidated under `weight_kg`)
- [ ] Only one onboarding flag exists
  - Command: `grep -rn "onboarded\|onboarding_done\|first_login\|onboardingDone" apps/api/src/db/schema.ts`

### 8.3 Unified auth.me (Batch 2.3)

- [ ] `apps/api/src/routers/auth.ts` `me` procedure returns unified profile
  - Command: `grep -B 2 -A 60 "me: publicProcedure" apps/api/src/routers/auth.ts`
- [ ] Returns derived fields: `bmi`, `tdee`, `age`, `nutritionDirection`, `activityLevel`
  - Expected: visible computation or assignment of these fields
- [ ] `apps/api/src/utils/nutrition.ts` exists with helpers
  - Command: `ls apps/api/src/utils/nutrition.ts 2>/dev/null`
  - If present: paste exports list (grep `^export`)

### 8.4 users.me procedure removed (Batch 2.4)

- [ ] `users.me` no longer exists (only `updateMe` and `deleteMe`)
  - Command: `grep -n "^[[:space:]]*me:" apps/api/src/routers/users.ts`
  - Expected: no match
- [ ] No calls to `trpc.users.me` in mobile
  - Command: `grep -rn "trpc\.users\.me" apps/mobile/`

### 8.5 Field renames applied (Batch 2.5)

- [ ] Consistent naming for weight, goal, weeklyTarget, equipment, dateOfBirth, etc.
  - Commands:
    - `grep -rn "weightKg\|weight_kg" apps/api/src/ apps/mobile/src/ | wc -l`
    - `grep -rn "currentWeight\|weightCurrent" apps/api/src/ apps/mobile/src/ | wc -l` (expected 0)
- [ ] Report any deviation from D6 naming table

### 8.6 Shared types (Batch 2.6)

- [ ] `packages/shared/src/types.ts` (or equivalent) has unified types
  - Command: `grep -n "UserProfile\|TrainingGoal\|NutritionDirection\|ActivityLevel\|EquipmentTag\|DietaryRestriction" packages/shared/src/types.ts`

---

## 9. Data Unification — Batch 3 (Form pre-filling)

### 9.1 Onboarding store (Batch 3.1)

- [ ] `apps/mobile/src/stores/onboardingStore.ts` exists
  - Command: `ls apps/mobile/src/stores/onboardingStore.ts 2>/dev/null`
- [ ] Uses Zustand + persist + MMKV
  - Command: `grep -n "persist\|createJSONStorage\|mmkv" apps/mobile/src/stores/onboardingStore.ts`
- [ ] Fields: name, weightKg, heightCm, gender, dateOfBirth, level, goal, weeklyTarget, equipment, dietaryRestrictions, allergies, currentStep, completedSteps
- [ ] `users.completeOnboarding` batch mutation exists
  - Command: `grep -B 2 -A 40 "completeOnboarding" apps/api/src/routers/users.ts`
  - Expected: single mutation that updates user + seeds first weight_entry in transaction

### 9.2 Profile edit pre-fill (Batch 3.2)

- [ ] `apps/mobile/app/profile/edit.tsx` (or similar) calls `useProfile()` and pre-fills form
  - Command: `grep -B 2 -A 20 "useProfile\|auth.me.useQuery" apps/mobile/app/profile/edit.tsx 2>/dev/null`
- [ ] Uses `useInvalidateUserProfile` on save

### 9.3 AI prompt chips (Batch 3.3)

- [ ] Plan AI generator uses profile chips
  - Command: `grep -rn "ProfileChip\|profile-chip" apps/mobile/app/plans/`
- [ ] Diet AI prompt (if exists) shows training + nutrition chips
  - Command: `ls apps/mobile/app/diet/ 2>/dev/null`

### 9.4 Smart workout defaults (Batch 3.5)

- [ ] `trpc.exercises.suggestDefaults` procedure exists
  - Command: `grep -B 2 -A 30 "suggestDefaults" apps/api/src/routers/exercises.ts`
- [ ] `ExercisePicker` or equivalent uses it before adding to draft
  - Command: `grep -rn "suggestDefaults" apps/mobile/src/ apps/mobile/app/`

### 9.5 Training days cross-display (Batch 3.6)

- [ ] No form in nutrition/diet asks "which days do you train?" (data comes from active plan)
  - Command: `grep -rn "jours d'entraînement\|training days\|dayOfWeek" apps/mobile/app/diet/ apps/mobile/app/nutrition/ 2>/dev/null`
  - Look for "Depuis ton plan actif" or read-only display patterns
- [ ] Macro calculator reads from `auth.me`, not a separate form
  - Command: `grep -rn "macro\|TDEE\|tdee" apps/mobile/app/diet/ 2>/dev/null`

---

## 10. Data Unification — Batch 4 (Zustand cleanup)

### 10.1 Server-duplicating stores removed

- [ ] No `userStore`, `profileStore`, `plansStore`, `workoutsStore`, `sessionsStore`, `statsStore`, `prsStore`
  - Command: `ls apps/mobile/src/stores/`
  - Report: all files present
- [ ] No references in code to removed stores
  - Commands:
    - `grep -rn "useUserStore" apps/mobile/`
    - `grep -rn "useProfileStore" apps/mobile/`
    - `grep -rn "usePlansStore" apps/mobile/`
    - `grep -rn "useWorkoutsStore" apps/mobile/`

### 10.2 Surviving stores documented

- [ ] Each remaining Zustand store has a doc header explaining why it's not replaced by tRPC
  - Command: `grep -l "device-local\|NOT duplicated on the server\|device-only" apps/mobile/src/stores/*.ts`
  - Expected: all or most stores have this header comment

### 10.3 Profile hook consolidated

- [ ] Only one hook named `useProfile` exists (in `src/data/useProfile.ts`)
  - Command: `grep -rn "export function useProfile\|export const useProfile" apps/mobile/`
  - Expected: 1 match

### 10.4 Exercise library cache renamed

- [ ] Previous `exercisesStore` renamed to `exerciseCacheStore` (if it existed)
  - Command: `ls apps/mobile/src/stores/exerciseCacheStore.ts 2>/dev/null`
- [ ] Uses MMKV, not AsyncStorage
  - Command: `grep -n "mmkv\|AsyncStorage" apps/mobile/src/stores/exerciseCacheStore.ts 2>/dev/null`

### 10.5 Shared derivations

- [ ] `packages/shared/src/profile.ts` (or similar) has shared TDEE/BMI/default helpers
  - Command: `ls packages/shared/src/profile.ts packages/shared/src/nutrition.ts 2>/dev/null`
- [ ] Only one location for Mifflin-St Jeor formula
  - Command: `grep -rn "Mifflin\|10 \* weight\|weightKg \* 2" apps/ packages/`
  - Expected: 1 match (in shared package)

---

## 11. Training Ecosystem — Batch 1 (DB & shared types)

### 11.1 generated_by_ai column

- [ ] Migration file exists
  - Command: `ls apps/api/src/db/migrations/ | grep -i "ai_flag\|generated_by_ai\|workout_plans"`
- [ ] Drizzle schema has the column
  - Command: `grep -n "generatedByAi\|generated_by_ai" apps/api/src/db/schema.ts`

### 11.2 dayOfWeek utility

- [ ] `apps/api/src/utils/dayOfWeek.ts` exists
  - Command: `ls apps/api/src/utils/dayOfWeek.ts 2>/dev/null`
- [ ] Exports `dowUiToDb`, `dowDbToUi`, `DOW_UI_LABELS`, `DOW_UI_SHORT`
  - Command: `grep -n "^export" apps/api/src/utils/dayOfWeek.ts`
- [ ] Tests exist
  - Command: `ls apps/api/src/utils/dayOfWeek.test.ts 2>/dev/null`

### 11.3 Plan validation

- [ ] `plans.create` validates day uniqueness (no duplicate dayOfWeek)
  - Command: `grep -A 15 "planDaysSchema\|\\.refine" apps/api/src/routers/plans.ts`
- [ ] Validates workoutTemplateId belongs to user
  - Command: `grep -B 2 -A 10 "BAD_REQUEST.*template\|ownership" apps/api/src/routers/plans.ts`

### 11.4 Day convention on I/O

- [ ] `plans.ts` procedures use `dowUiToDb` on write and `dowDbToUi` on read
  - Command: `grep -n "dowUiToDb\|dowDbToUi" apps/api/src/routers/plans.ts`

### 11.5 DayOfWeek shared type

- [ ] `packages/shared/src/types.ts` has `DayOfWeek = 1 | 2 | 3 | 4 | 5 | 6 | 7`
  - Command: `grep -n "DayOfWeek" packages/shared/src/types.ts`

---

## 12. Training Ecosystem — Batch 2 (Workout Builder)

### 12.1 Dead code removed

- [ ] `apps/mobile/app/workout/create.tsx` does NOT exist
  - Command: `ls apps/mobile/app/workout/create.tsx 2>/dev/null`
  - Expected: no such file

### 12.2 Components created

- [ ] `apps/mobile/src/components/TapValueCell.tsx` exists
  - Command: `ls apps/mobile/src/components/TapValueCell.tsx`
- [ ] `apps/mobile/src/components/TapTimerCell.tsx` exists
- [ ] `apps/mobile/src/components/ExerciseRow.tsx` exists
- [ ] `apps/mobile/src/components/ExercisePicker.tsx` exists (consolidated)
  - Command: `ls apps/mobile/src/components/ExerciseRow.tsx apps/mobile/src/components/ExercisePicker.tsx 2>/dev/null`
- [ ] ExercisePicker has `mode: 'single' | 'multi'` prop
  - Command: `grep -B 2 -A 10 "mode.*single.*multi\|type Props" apps/mobile/src/components/ExercisePicker.tsx`

### 12.3 Workout builder screen

- [ ] `apps/mobile/app/workout/build.tsx` supports `editId` and `forPlanDay` params
  - Command: `grep -n "editId\|forPlanDay" apps/mobile/app/workout/build.tsx`
- [ ] Uses DraggableFlatList
  - Command: `grep -n "DraggableFlatList\|draggable-flatlist" apps/mobile/app/workout/build.tsx`
- [ ] `react-native-draggable-flatlist` installed
  - Command: `grep "draggable-flatlist" apps/mobile/package.json`
- [ ] Uses `useWorkoutDraftStore` from MMKV
  - Command: `grep -n "useWorkoutDraftStore" apps/mobile/app/workout/build.tsx`

### 12.4 WorkoutDraft store

- [ ] `apps/mobile/src/stores/workoutDraftStore.ts` exists
  - Command: `ls apps/mobile/src/stores/workoutDraftStore.ts`
- [ ] Persisted to MMKV
- [ ] Has `reset`, `hydrate`, `isExpired` methods

### 12.5 Workout detail view mode

- [ ] `apps/mobile/app/workout/[id].tsx` has "Modifier" action in top-right (navigates to build?editId=)
  - Command: `grep -n "Modifier\|editId" apps/mobile/app/workout/\[id\].tsx`
- [ ] CTA reads "Démarrer la séance" (not "START WORKOUT")

### 12.6 N+1 query fix

- [ ] `workouts.byId` procedure uses a single query with `sql` template for the exercises+PRs+lastSet
  - Command: `grep -B 2 -A 30 "byId: protectedProcedure" apps/api/src/routers/workouts.ts`
  - Look for `sql\`...LATERAL\`` or `LEFT JOIN` or similar consolidation

### 12.7 pendingWorkoutStore persisted

- [ ] Uses MMKV persist
  - Command: `grep -n "persist\|mmkv" apps/mobile/src/stores/pendingWorkoutStore.ts`

---

## 13. Training Ecosystem — Batch 3 (Plan Builder & Training Tab)

### 13.1 Training tab hub

- [ ] `apps/mobile/app/(tabs)/training.tsx` is a hub with TodayBlock, ActivePlanCard, WorkoutsList, AiFeatureCard
  - Command: `grep -n "TodayBlock\|ActivePlanCard\|WorkoutItemRow\|AiFeatureCard" apps/mobile/app/\(tabs\)/training.tsx`
- [ ] Tab name is "Entraînement"
  - Command: `grep -n "Entraînement" apps/mobile/app/\(tabs\)/_layout.tsx apps/mobile/app/\(tabs\)/training.tsx`

### 13.2 Plan Builder rewrite

- [ ] `apps/mobile/app/plans/create.tsx` supports `editId` param
  - Command: `grep -n "editId" apps/mobile/app/plans/create.tsx`
- [ ] Uses `usePlanDraftStore`
  - Command: `grep -n "usePlanDraftStore" apps/mobile/app/plans/create.tsx`
- [ ] `apps/mobile/src/stores/planDraftStore.ts` exists
- [ ] Inline day picker logic (selectingDayFor state)
  - Command: `grep -n "selectingDayFor" apps/mobile/app/plans/create.tsx`

### 13.3 Day picker components

- [ ] `DayPillsGrid`, `InlineDayPicker`, `ScheduleSummaryRow`, `ActivateWarning` exist as components
  - Command: `grep -rn "DayPillsGrid\|InlineDayPicker\|ScheduleSummaryRow\|ActivateWarning" apps/mobile/src/components/ apps/mobile/src/screens/`

### 13.4 Streak calculation

- [ ] `plans.active` does NOT load all user sessions for streak computation
  - Command: `grep -B 2 -A 40 "computeStreak\|streak" apps/api/src/routers/plans.ts`
  - Expected: windowed query (max 52 weeks), not full scan

---

## 14. Training Ecosystem — Batch 4 (AI Plan Generator)

### 14.1 French AI prompt with 1-7 days

- [ ] `plans.generateWithAI` system prompt is in French
  - Command: `grep -B 2 -A 50 "systemPrompt\|system:" apps/api/src/routers/plans.ts | head -80`
- [ ] Prompt explicitly uses 1-7 day convention ("1=Lundi, 2=Mardi...")
- [ ] Says "pas de superset"

### 14.2 Exercise library filtered by level

- [ ] `filterExercisesForLevel` function or equivalent exists
  - Command: `grep -n "filterExercisesForLevel\|difficulty\|easy\|medium" apps/api/src/routers/plans.ts`

### 14.3 AI rate limit on AI plans only

- [ ] Rate limit check filters by `generatedByAi = true`
  - Command: `grep -B 2 -A 10 "generated_by_ai\|generatedByAi" apps/api/src/routers/plans.ts`
  - Expected: in the rate limit check, `eq(workoutPlans.generatedByAi, true)`

### 14.4 aiCredits procedure

- [ ] `plans.aiCredits` procedure exists
  - Command: `grep -B 2 -A 20 "aiCredits" apps/api/src/routers/plans.ts`

### 14.5 Plan generator screens

- [ ] `apps/mobile/app/plans/generate.tsx` shows profile chips, textarea, suggestions, credit block
  - Command: `grep -n "ProfileChips\|CreditBlock\|SuggestionChip" apps/mobile/app/plans/generate.tsx`
- [ ] Detects refinement mode (via `aiStore.conversationHistory.length > 0`)
  - Command: `grep -n "isRefinement\|conversationHistory" apps/mobile/app/plans/generate.tsx`
- [ ] `apps/mobile/app/plans/generating.tsx` has the 4-step progress
  - Command: `grep -n "STEPS\|generatingTitle\|Analyse du profil" apps/mobile/app/plans/generating.tsx`
- [ ] `apps/mobile/app/plans/preview.tsx` has AI badge, day cards, activate warning, Modifier/Activer CTAs
  - Command: `grep -n "Généré par IA\|PreviewDayCard\|activate-warning" apps/mobile/app/plans/preview.tsx`

### 14.6 aiPlanStore

- [ ] Stores `proposedPlan`, `lastPrompt`, `conversationHistory`
  - Command: `grep -A 15 "type Store\|type.*State" apps/mobile/src/stores/aiPlanStore.ts`

---

## 15. Type safety summary

### 15.1 Package-level typecheck

- [ ] `cd apps/api && npx tsc --noEmit` — report exact error count and list first 10 errors if any
- [ ] `cd apps/mobile && npx tsc --noEmit` — report exact error count and list first 10 errors if any
- [ ] `cd packages/shared && npx tsc --noEmit` — report exact error count and list first 10 errors if any

### 15.2 Root typecheck

- [ ] From repo root: `npx tsc --noEmit -b` — report exact error count and list first 10 errors if any

---

## 16. Dependencies audit

### 16.1 Critical packages present

Verify these dependencies are in the correct package.json:

| Package | Expected in | Check |
|---|---|---|
| `@tanstack/react-query-persist-client` | apps/mobile | `grep` package.json |
| `react-native-mmkv` | apps/mobile | `grep` package.json |
| `react-native-draggable-flatlist` | apps/mobile | `grep` package.json |
| `react-native-gesture-handler` | apps/mobile | `grep` package.json |
| `@nozbe/watermelondb` | apps/mobile | `grep` package.json (expected NOT_STARTED for Phase 4) |
| `@anthropic-ai/sdk` | apps/api | `grep` package.json |
| `@fastify/rate-limit` | apps/api | `grep` package.json |
| `zustand` | apps/mobile | `grep` package.json |
| `drizzle-orm` | apps/api | `grep` package.json |

Output format: a table with Package | Present (Y/N) | Version | Status

---

## 17. Unexpected findings

Use this section for anything not in the checklist but worth flagging:

- Files that look like dead code (unused imports, components never referenced)
- TODO / FIXME / XXX comments introduced by previous work
- Inconsistencies between code and docs (e.g., CLAUDE.md says X but code does Y)
- Duplicate implementations of the same concept
- Files with `any` / `@ts-ignore` / `@ts-expect-error` that stand out
- Performance concerns visible from static analysis
- Anything surprising

Commands to run for this section:
- `grep -rn "TODO\|FIXME\|XXX" apps/ packages/ --include='*.ts' --include='*.tsx' | head -40`
- `grep -rn "as any\|@ts-ignore\|@ts-expect-error" apps/ packages/ --include='*.ts' --include='*.tsx' | head -40`
- `grep -rn "console.log" apps/ packages/ --include='*.ts' --include='*.tsx' | wc -l`

Report each finding with file + line + short description. Do NOT propose fixes.

---

## 18. Summary

End the report with a structured summary, EXACTLY this format:

```markdown
## Audit summary

### Completion rates by phase

| Phase | OK | Partial | Fail | Missing | Not started | Unknown |
|---|---|---|---|---|---|---|
| Stabilization Phase 1 | X | X | X | X | X | X |
| Stabilization Phase 2 | X | X | X | X | X | X |
| Stabilization Phase 3 | X | X | X | X | X | X |
| Stabilization Phase 4 | X | X | X | X | X | X |
| Error Isolation | X | X | X | X | X | X |
| Data Unification B1 | X | X | X | X | X | X |
| Data Unification B2 | X | X | X | X | X | X |
| Data Unification B3 | X | X | X | X | X | X |
| Data Unification B4 | X | X | X | X | X | X |
| Training B1 | X | X | X | X | X | X |
| Training B2 | X | X | X | X | X | X |
| Training B3 | X | X | X | X | X | X |
| Training B4 | X | X | X | X | X | X |

### Critical issues (FAIL only)

List every `[FAIL]` item with its section reference. If none, say "None found."

### Partial issues (PARTIAL only)

List every `[PARTIAL]` item with what's missing. If none, say "None found."

### Missing items ([MISSING] only)

List every `[MISSING]` with the expected path. If none, say "None found."

### Unknown items

List every `[UNKNOWN]` with the reason it couldn't be determined.

### Typecheck status

- apps/api: X errors
- apps/mobile: X errors
- packages/shared: X errors
- root (project references): X errors

### Phases ready to move forward

Based on completion rates:
- Stabilization Phase 1: ready / not ready
- Stabilization Phase 2: ready / not ready
- etc. for each phase

### Single most impactful next action

One sentence describing the top priority based on what's missing / broken.
```

---

## Process

1. Start from repo root. `pwd` should match the Tanren repo.
2. **Do NOT modify any code**. This is a static audit.
3. Read files, run read-only commands. Tools available: `git`, `grep`, `ls`, `cat`, `head`, `tail`, `wc`, `find`, `npx tsc`.
4. DO NOT run the app. DO NOT test flows. DO NOT build.
5. For each check, capture evidence (file content, grep output, command result) and assign a status token.
6. If a whole phase is `[NOT_STARTED]`, mark every sub-item `[NOT_STARTED]` — don't fabricate evidence.
7. Save the final report as `AUDIT_STATE.md` at repo root.

## Constraints

- Output ONLY `AUDIT_STATE.md` at repo root
- Exact section numbering (1-18)
- Every check item has a `[STATUS]` token
- Every claim has cited evidence (command + output, OR file + line)
- No fixes, no suggestions within this document
- No speculation — use `[UNKNOWN]` with reason when uncertain
- Report length: comprehensive. Expected ~800-1200 lines of markdown.

## Done criteria

- [ ] `AUDIT_STATE.md` exists at repo root
- [ ] All 18 sections present with exact numbering
- [ ] Every check has a `[STATUS]` token
- [ ] Every `[OK]`, `[PARTIAL]`, `[FAIL]` claim has evidence
- [ ] Section 17 lists concrete unexpected findings (not just "none")
- [ ] Section 18 summary table has numeric counts and actionable insights
- [ ] File is valid markdown (renders correctly)

---

*Audit the state. Evidence over assertion. Fixes come after.*

*Tanren · Une rep après l'autre.*
