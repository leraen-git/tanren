# TANREN — Comprehensive Audit (Security · Functionality · Optimization)

> **For Claude Code.** Read-only audit covering 3 dimensions: Security, Functionality, Optimization. Produce `AUDIT_FULL_STATE.md` at the repo root. No code changes. Static analysis only.
>
> **Output**: machine-parseable structured report. Fixed sections, fixed status tokens, evidence-backed claims.

---

## Output format contract

### Status tokens

Every check ends with one of:
- `[OK]` — verified working
- `[PARTIAL]` — works but with gaps (describe gap)
- `[FAIL]` — broken or incorrect
- `[MISSING]` — not implemented at all
- `[UNKNOWN]` — cannot determine statically (give reason)
- `[N/A]` — not applicable

### Evidence rule

Every claim must cite:
- File path + line number, OR
- Shell command + actual output, OR
- Grep result with match content

No assertions without evidence. When uncertain → `[UNKNOWN]` + reason.

### Honesty

- Don't speculate
- Don't suggest fixes inside the report
- Don't fabricate evidence for skipped checks
- If a section is truly N/A, say so with reason

---

## Begin the report

```markdown
# TANREN — Full Audit (Security · Functionality · Optimization)

Generated: <ISO datetime>
Branch: <current>
HEAD SHA: <short sha>
Working tree: <clean | dirty with N changes>

## Environment

| Component | Version |
|---|---|
| Node | <node --version> |
| Expo SDK | <from apps/mobile/package.json> |
| React Native | <from apps/mobile/package.json> |
| TypeScript | <from apps/api and apps/mobile> |
| PostgreSQL (target) | <from drizzle config or Railway> |
```

Then the 24 sections below in exact order.

---

# PART A — SECURITY

## 1. Authentication & session management

### 1.1 Session token storage (mobile)
- [ ] Token stored in `expo-secure-store` (iOS keychain / Android keystore), NOT in MMKV/AsyncStorage
  - Command: `grep -rn "session-token\|sessionToken" apps/mobile/src apps/mobile/app | head -10`
  - Evidence: paste storage call sites
- [ ] Token NOT logged to console anywhere
  - Command: `grep -rn "console.*token\|console.log.*[Tt]oken" apps/mobile/src`
- [ ] Token NOT included in URL parameters in any API call

### 1.2 Session token validation (API)
- [ ] `createContext` validates token against Redis AND verifies user exists in DB
  - Command: `grep -B 2 -A 25 "createContext\|extractToken" apps/api/src/`
- [ ] Deleted users have their sessions invalidated
- [ ] Session expiration is enforced (TTL in Redis)
  - Command: `grep -n "expire\|EX\|TTL" apps/api/src/routers/auth.ts apps/api/src/lib/`

### 1.3 Auth procedures
- [ ] `auth.devSignIn` blocked in production (returns NOT_FOUND if `NODE_ENV === 'production'`)
  - Command: `grep -B 2 -A 10 "devSignIn" apps/api/src/routers/auth.ts`
- [ ] OTP brute-force prevention: max attempts counter, OTP deleted after success
  - Command: `grep -B 2 -A 30 "verifyOtp" apps/api/src/routers/auth.ts`
- [ ] OTP TTL ≤ 10 minutes
- [ ] Rate limiting on `auth.requestOtp`, `auth.verifyOtp`, `auth.guestSignIn`
  - Command: `grep -rn "rateLimit\|@fastify/rate-limit" apps/api/src/`
  - Verify per-procedure limits configured

### 1.4 Auth flows
- [ ] Guest sign-in creates user with `onboardingDone = false`
- [ ] Email OTP flow: code is single-use, deleted on verify
- [ ] Apple/Google sign-in: token is verified server-side (not just trusted from client)
  - Command: `grep -B 2 -A 30 "signInWithApple\|signInWithGoogle" apps/api/src/routers/auth.ts`
- [ ] Sign-out clears: SecureStore token, Redis session, React Query cache, Zustand stores

## 2. Data protection

### 2.1 Email encryption at rest
- [ ] Email column is encrypted (AES-256-GCM)
  - Command: `grep -rn "cryptoService\|AES_ENCRYPTION_KEY\|encrypt(" apps/api/src/`
- [ ] `emailHash` column exists for deterministic lookup
  - Command: `grep -n "emailHash" apps/api/src/db/schema.ts`
- [ ] Encryption key NOT committed in repo
  - Command: `grep -rn "AES_ENCRYPTION_KEY=\|EMAIL_HASH_SALT=" .env* 2>/dev/null`
  - Expected: 0 results in committed `.env*` files
- [ ] `.env` and `.env.local` are gitignored
  - Command: `cat .gitignore | grep -E "^\.env"`

### 2.2 Sensitive data exposure
- [ ] No passwords / API keys hardcoded in source
  - Command: `grep -rn "password\s*=\s*['\"]\|api_key\s*=\s*['\"]\|sk-ant" apps/ packages/ --include='*.ts' --include='*.tsx'`
- [ ] `.env.example` exists and lists all required env vars without values
  - Command: `cat .env.example apps/api/.env.example apps/mobile/.env.example 2>/dev/null`
- [ ] Sentry DSN, Anthropic key, DB connection strings sourced from env only

### 2.3 PII in logs
- [ ] No emails, weights, personal data logged in production
  - Command: `grep -rn "console.log\|logger.info" apps/api/src/ | grep -iE "email|weight|password" | head -20`
- [ ] Sentry breadcrumbs scrub PII before sending
  - Command: `grep -B 2 -A 10 "beforeSend\|beforeBreadcrumb" apps/`

### 2.4 GDPR-related
- [ ] Soft delete with `deletedAt` column
  - Command: `grep -n "deletedAt" apps/api/src/db/schema.ts`
- [ ] `deleteMe` mutation exists and anonymizes PII
  - Command: `grep -B 2 -A 25 "deleteMe" apps/api/src/routers/users.ts`
- [ ] Hard-delete cron after 30 days (or documented procedure)
  - Command: `ls apps/api/src/jobs/ apps/api/src/scripts/ 2>/dev/null`

## 3. Network security

### 3.1 HTTPS / TLS
- [ ] Mobile API URL uses `https://`
  - Command: `grep -rn "apiUrl\|API_URL\|https?://" apps/mobile/src/lib/trpc* apps/mobile/app.json`
- [ ] No HTTP fallbacks in code

### 3.2 CORS / origin
- [ ] API has CORS configured (or is locked to mobile clients only)
  - Command: `grep -rn "cors\|origin\|allowedOrigins" apps/api/src/`

### 3.3 Input validation
- [ ] Every tRPC procedure has a Zod input schema
  - Command: `grep -rn "publicProcedure\|protectedProcedure" apps/api/src/routers/ | grep -v "input(" | head -20`
  - Expected: each procedure followed by `.input(z.object(...))`
- [ ] String inputs have `.max()` constraints to prevent DoS via huge payloads
  - Command: `grep -rn "z.string()" apps/api/src/routers/ | grep -v "max\|email\|uuid\|datetime" | head -20`

## 4. Auth/authz integrity

### 4.1 Protected procedures
- [ ] All non-auth procedures use `protectedProcedure` (not `publicProcedure`)
  - Command: `grep -rn "publicProcedure" apps/api/src/routers/ | grep -v "auth.ts" | head -20`
  - Each match must be justified (e.g., `health` endpoint)
- [ ] User ID always comes from `ctx.userId`, never from client input
  - Command: `grep -rn "userId.*z\.string\|userId.*input\." apps/api/src/routers/`
  - Expected: 0 results (or only in admin/internal procedures)

### 4.2 Resource ownership
- [ ] Every procedure that fetches/modifies user data validates ownership
  - Pick 5 random procedures (workouts.byId, plans.update, sessions.complete, weight.delete, exercises.create) and verify they include `eq(table.userId, ctx.userId)` in WHERE clauses
  - Command: `grep -B 2 -A 15 "byId:\|update:\|delete:" apps/api/src/routers/workouts.ts apps/api/src/routers/plans.ts | head -60`

## 5. Secret & dependency hygiene

### 5.1 Dependencies
- [ ] `npm audit --production` summary
  - Command: `cd apps/api && npm audit --production --json 2>/dev/null | jq '.metadata.vulnerabilities' || npm audit --production 2>&1 | tail -10`
  - Same for `apps/mobile`
- [ ] No critical/high vulnerabilities unfixed

### 5.2 Outdated critical packages
- [ ] Check Expo SDK, React Native, tRPC, Drizzle for known security advisories
  - Command: `cd apps/mobile && npm outdated --depth=0 2>&1 | head -20`

---

# PART B — FUNCTIONALITY

## 6. Auth flows end-to-end

### 6.1 Sign-in screens
- [ ] `apps/mobile/app/sign-in.tsx` (or auth group equivalent) exists
  - Command: `find apps/mobile/app -name "sign-in*" -o -name "(auth)*"`
- [ ] All sign-in handlers (guest, email, Apple, Google) await `auth.me.invalidate()` after token storage
  - Command: `grep -B 2 -A 25 "guestSignIn\|verifyOtp\|signInWith" apps/mobile/src apps/mobile/app | grep -iE "invalidate|onSuccess"`
- [ ] No imperative `router.replace('/')` in sign-in handlers
  - Command: `grep -rn "router.replace\|router.push" apps/mobile/app/sign-in.tsx 2>/dev/null`

### 6.2 AuthRedirect component
- [ ] Handles 3 states: unauthenticated / needs_onboarding / authenticated
  - Command: `grep -B 2 -A 50 "AuthRedirect" apps/mobile/app/_layout.tsx`
- [ ] Segment guards prevent infinite redirect loops
- [ ] Reads reactive state (not stale ref or static value)
- [ ] tokenRef updated synchronously during render (not in useEffect)
  - Command: `grep -B 2 -A 5 "tokenRef" apps/mobile/app/_layout.tsx`

### 6.3 Onboarding flow
- [ ] All onboarding steps exist
  - Command: `ls apps/mobile/app/onboarding/ 2>/dev/null || ls apps/mobile/app/\(onboarding\)/ 2>/dev/null`
- [ ] Final step calls a batch mutation that updates user + sets `onboardingDone = true`
  - Command: `grep -B 2 -A 25 "completeOnboarding" apps/api/src/routers/users.ts`
- [ ] Progress persisted via MMKV (kill app + reopen mid-flow → resume at correct step)
  - Command: `grep -n "onboardingStore\|persist" apps/mobile/src/stores/onboardingStore.ts 2>/dev/null`

## 7. Core feature flows

### 7.1 Workout management
- [ ] Create workout (`workout/build.tsx`) supports edit mode via `editId` query param
- [ ] Drag-and-drop reordering via `react-native-draggable-flatlist`
- [ ] Tap-only inputs for Sets/Reps/Weight/Rest (no +/− steppers)
  - Command: `grep -rn "TapValueCell\|TapTimerCell" apps/mobile/src/components/`
- [ ] Draft persistence via `workoutDraftStore` (MMKV)
- [ ] Delete confirmation alert in French

### 7.2 Plan management
- [ ] Plan create supports `editId` and `forPlanDay` params
- [ ] Active plan toggle activates only one at a time (others deactivated)
  - Command: `grep -B 2 -A 20 "is_active\|isActive" apps/api/src/routers/plans.ts`
- [ ] Activation warning shows when user has an existing active plan
- [ ] Day-of-week mapping consistent (DB 0-6 ↔ UI 1-7)
  - Command: `grep -n "dowUiToDb\|dowDbToUi" apps/api/src/routers/plans.ts`

### 7.3 Session execution
- [ ] `activeSessionStore` persists in-progress session via MMKV
- [ ] `SessionResumeChecker` only resumes if: <3h old + has incomplete sets
  - Command: `grep -B 2 -A 25 "SessionResumeChecker" apps/mobile/app/_layout.tsx`
- [ ] Set logging hits `sessions.logSet` per set (not bulk on complete)
- [ ] Session completion clears `activeSessionStore`

### 7.4 AI generators (workout plan + diet)
- [ ] Both procedures wrap Anthropic call in try/catch with `[ANTHROPIC_ERROR]` logging
  - Command: `grep -rn "ANTHROPIC_ERROR\|anthropicClient" apps/api/src/routers/`
- [ ] Same Claude model used (consistency)
  - Command: `grep -n "claude-sonnet\|claude-opus\|claude-haiku" apps/api/src/routers/plans.ts apps/api/src/routers/diet.ts`
- [ ] Rate limit: counts only AI-generated artifacts, not manual ones (separate counter)
- [ ] French system prompt with explicit rules ("pas de superset" etc.)
  - Command: `grep -n "Pas de superset\|pas de superset" apps/api/src/routers/plans.ts`
- [ ] Response parsing wrapped in try/catch with `[AI_PARSE_ERROR]` logging

### 7.5 Profile & body data
- [ ] Weight add/delete is transactional (insert/delete + sync `users.weightKg`)
  - Command: `grep -B 2 -A 30 "add: protectedProcedure\|delete: protectedProcedure" apps/api/src/routers/weight.ts`
- [ ] `auth.me` returns unified profile with derived fields (BMI, TDEE, age)
- [ ] Profile edit screen pre-fills from `auth.me` (no blank fields on open)

## 8. Cross-feature data sharing

### 8.1 Form pre-filling
- [ ] AI prompt screens show user profile chips (no re-asking known data)
  - Command: `grep -rn "ProfileChips\|profile-chip" apps/mobile/app/`
- [ ] Diet/nutrition forms read training days from active plan (not asking again)
  - Command: `grep -rn "Depuis ton plan actif" apps/mobile/`

### 8.2 Invalidation propagation
- [ ] `useInvalidateUserProfile`, `useInvalidateWeight`, `useInvalidateActivePlan`, etc. exist
  - Command: `grep -n "^export function useInvalidate" apps/mobile/src/lib/invalidation.ts 2>/dev/null`
- [ ] Mutations use these helpers (not direct `utils.X.invalidate()`)
  - Command: `grep -rn "utils\.[a-z]*\.[a-z]*\.invalidate" apps/mobile/app/ apps/mobile/src/screens/ 2>/dev/null`
  - Expected: 0 (or few) — they should use helpers

## 9. Error handling & resilience

### 9.1 Per-section error isolation
- [ ] `SectionStatus` component exists
  - Command: `ls apps/mobile/src/components/SectionStatus.tsx 2>/dev/null`
- [ ] Used in all multi-section tabs: Profile, Home, Training, Diet, History
  - Command: `for tab in profile index training diet history; do echo "$tab:"; grep -c "SectionStatus" apps/mobile/app/\(tabs\)/$tab.tsx 2>/dev/null; done`
- [ ] No screen-level `if (error) return <FullError />` patterns
  - Command: `grep -rn "if (error)\|if (isError)" apps/mobile/app/\(tabs\)/ | grep -i "return.*FullError\|return.*Global"`

### 9.2 React Query retry
- [ ] Smart retry: skip 4xx, exponential backoff on 5xx
  - Command: `grep -A 10 "retry:" apps/mobile/app/_layout.tsx`
- [ ] Mutations have `retry: 0`
- [ ] React Query persist: MMKV-backed, `buster` tied to app version
  - Command: `grep -A 10 "persistOptions\|PersistQueryClientProvider" apps/mobile/app/_layout.tsx`

### 9.3 tRPC error formatter
- [ ] All errors logged server-side with `[TRPC_ERROR]` prefix
  - Command: `grep -B 2 -A 20 "errorFormatter" apps/api/src/`
- [ ] Real error message propagated to client (not generic "An internal error occurred")

### 9.4 User-visible feedback
- [ ] Mutations show error toasts/alerts on failure (no silent swallowing)
  - Command: `grep -rn "onError" apps/mobile/app apps/mobile/src/data/mutations 2>/dev/null | head -20`
- [ ] No empty `catch {}` blocks
  - Command: `grep -rn "catch *(.*) *{[\s]*}" apps/mobile/src/ apps/api/src/ --include='*.ts' --include='*.tsx'`

## 10. i18n & content

### 10.1 French strings
- [ ] No hardcoded English in user-facing screens
  - Command: `grep -rn '"Cancel"\|"Save"\|"Delete"\|"Workout"\|"Plan"' apps/mobile/app/ apps/mobile/src/screens/ apps/mobile/src/components/ | grep -v "test\|spec"`
- [ ] `apps/mobile/src/locales/fr.ts` exists with full key coverage
  - Command: `ls apps/mobile/src/locales/fr.ts 2>/dev/null && wc -l apps/mobile/src/locales/fr.ts`

## 11. Navigation & routing

### 11.1 Tab structure
- [ ] 5 tabs: Home, Training (Entraînement), History (Historique), Diet, Profile (Profil)
  - Command: `grep -A 5 "Tabs.Screen" apps/mobile/app/\(tabs\)/_layout.tsx | head -50`
- [ ] No stale references to old tab names
  - Command: `grep -rn "(tabs)/workouts\|workouts.tsx" apps/mobile/app/`

### 11.2 Deep links / navigation params
- [ ] `editId` and `forPlanDay` query params handled in workout/build
- [ ] Plan create handles `id` param for edit mode
- [ ] Detail views use `[id].tsx` dynamic routes

---

# PART C — OPTIMIZATION & PERFORMANCE

## 12. Database performance

### 12.1 Indexes
- [ ] Critical indexes present on:
  - `workout_sessions(user_id, started_at DESC)`
  - `exercise_sets(session_exercise_id, set_number)`
  - `personal_records(user_id, exercise_id)`
  - `session_exercises(session_id, order_index)`
  - `weight_entries(user_id, measured_at DESC)`
  - Command: `grep -rn "CREATE INDEX\|index(" apps/api/src/db/schema.ts apps/api/src/db/migrations/ 2>/dev/null | head -30`

### 12.2 Query patterns
- [ ] No N+1 queries in `workouts.byId`, `plans.active`, `sessions.list`
  - Inspect each procedure: a single query (or 1+1) is OK; a loop with per-iteration query is N+1
  - Command: paste the relevant procedure bodies

### 12.3 Data types
- [ ] `weight_kg`, `height_cm` use `numeric(5,2)` or `real` (not unconstrained float)
  - Command: `grep -n "weightKg\|heightCm\|weight_kg\|height_cm" apps/api/src/db/schema.ts`
- [ ] `auth_provider` is a Postgres enum (not free text)
  - Command: `grep -n "authProvider\|auth_provider\|pgEnum" apps/api/src/db/schema.ts`

## 13. Mobile bundle & startup

### 13.1 Bundle size
- [ ] Expo SDK 55 + RN 0.83.6 with Hermes enabled
  - Command: `grep -n "hermes\|jsEngine" apps/mobile/app.json apps/mobile/ios/Podfile 2>/dev/null`
- [ ] No unused large dependencies
  - Command: `cd apps/mobile && npx depcheck --skip-missing 2>&1 | head -30`

### 13.2 Cold start performance
- [ ] React Query persistence enabled (instant cold launch)
- [ ] Splash screen properly hidden after fonts/auth ready
  - Command: `grep -rn "SplashScreen.hideAsync\|preventAutoHide" apps/mobile/app/`

### 13.3 Re-render hygiene
- [ ] No anonymous functions in tab/screen render bodies that cause downstream re-renders
  - Spot check: 5 random screens, look for `style={{ ... }}` inline objects in lists
- [ ] FlatList / SectionList for long lists (not ScrollView with map)
  - Command: `grep -rn "ScrollView" apps/mobile/app/\(tabs\)/ | head -10`
  - Each match: confirm it's not iterating a long list

## 14. Mobile state hygiene

### 14.1 Zustand stores
- [ ] List all Zustand stores
  - Command: `ls apps/mobile/src/stores/`
- [ ] Each store classified: UI state / draft / device-only / server cache
- [ ] No store duplicates server data without justification (e.g., no `userStore` cache of `auth.me`)
  - Command: `grep -rn "useUserStore\|useProfileStore\|usePlansStore\|useWorkoutsStore" apps/mobile/`

### 14.2 Data access abstraction
- [ ] Screens import from `src/data/*` hooks (not `trpc.X.useQuery` directly)
  - Command: `grep -rn "trpc\.[a-z]*\.[a-z]*\.use\(Query\|Mutation\)" apps/mobile/app/\(tabs\)/`
  - Expected: minimal (ideally 0)
- [ ] All `src/data/*` and `src/data/mutations/*` files exist for the main flows
  - Command: `ls apps/mobile/src/data/ apps/mobile/src/data/mutations/ 2>/dev/null`

## 15. API performance

### 15.1 Caching opportunities
- [ ] Static-ish queries (exercise library) have appropriate cache headers or React Query staleTime
  - Command: `grep -rn "staleTime" apps/mobile/src/data/`

### 15.2 Heavy procedures
- [ ] AI generation has explicit timeout (avoid hanging)
  - Command: `grep -B 2 -A 10 "anthropicClient" apps/api/src/routers/ | grep -i "timeout"`
- [ ] Streak calculation uses windowed query (not full table scan)
  - Command: `grep -B 2 -A 30 "computeStreak\|streak" apps/api/src/routers/plans.ts`

### 15.3 Connection pooling
- [ ] DB connection pool configured (Drizzle/postgres default is usually OK)
  - Command: `grep -rn "Pool\|max:.*\|connections" apps/api/src/db/`

---

# PART D — INFRASTRUCTURE & OPERATIONS

## 16. CI / type safety

### 16.1 Typecheck
- [ ] `apps/api` typecheck passes
  - Command: `cd apps/api && npx tsc --noEmit 2>&1 | tail -5`
- [ ] `apps/mobile` typecheck passes
  - Command: `cd apps/mobile && npx tsc --noEmit 2>&1 | tail -5`
- [ ] Root `tsc -b --noEmit` passes
  - Command: `npx tsc -b --noEmit 2>&1 | tail -5`

### 16.2 CI workflow
- [ ] `.github/workflows/ci.yml` exists and runs typecheck on push/PR
  - Command: `cat .github/workflows/ci.yml 2>/dev/null`
- [ ] Husky pre-commit hook runs typecheck
  - Command: `cat .husky/pre-commit 2>/dev/null`

## 17. Tests

### 17.1 API tests
- [ ] Vitest configured
  - Command: `ls apps/api/vitest.config.ts 2>/dev/null`
- [ ] Tests exist for: auth router, weight router, plans router, dayOfWeek utility
  - Command: `find apps/api/src -name "*.test.ts" | head -20`
- [ ] All tests pass
  - Command: `cd apps/api && npx vitest run 2>&1 | tail -10`

### 17.2 Mobile tests
- [ ] Pure utility tests exist (format, historyGrouping, syncQueue)
  - Command: `find apps/mobile/src -name "*.test.ts" -o -name "*.test.tsx" | head -10`

## 18. Observability

### 18.1 Sentry
- [ ] API: `@sentry/node` initialized in `apps/api/src/index.ts`
  - Command: `grep -n "Sentry.init\|@sentry/node" apps/api/src/`
- [ ] Mobile: `@sentry/react-native` initialized in `apps/mobile/app/_layout.tsx`
  - Command: `grep -n "Sentry.init\|@sentry/react-native" apps/mobile/`
- [ ] Sentry DSN sourced from env vars only

### 18.2 Health check
- [ ] `GET /health` endpoint exists, validates DB + Redis
  - Command: `grep -rn "/health\|healthcheck" apps/api/src/`

### 18.3 Logging
- [ ] Structured logging (pino or equivalent), not raw console.log
  - Command: `grep -rn "import.*pino\|logger" apps/api/src/ | head -10`

## 19. Repository hygiene

### 19.1 Branches
- [ ] Single deploy branch (`main`)
  - Command: `git branch -r`
- [ ] Working tree clean
  - Command: `git status --porcelain`

### 19.2 Documentation
- [ ] `CLAUDE.md` reflects current architecture
  - Command: `cat CLAUDE.md | head -50`
- [ ] `DEPLOY.md` exists and is accurate
  - Command: `cat DEPLOY.md 2>/dev/null | head -50`
- [ ] `SECURITY.md` exists with key rotation runbook
  - Command: `cat apps/api/SECURITY.md 2>/dev/null | head -50`

### 19.3 .gitignore
- [ ] `.env*`, `node_modules`, `ios/build`, `ios/Pods`, `dist-types`, `.expo` ignored
  - Command: `cat .gitignore`

---

# PART E — UNEXPECTED FINDINGS & SUMMARY

## 20. Unexpected findings

Things noticed but not in the checklist. Be specific (file + line):
- TODO / FIXME / XXX comments
  - Command: `grep -rn "TODO\|FIXME\|XXX" apps/ packages/ --include='*.ts' --include='*.tsx' | head -30`
- `as any` / `@ts-ignore` / `@ts-expect-error`
  - Command: `grep -rn "as any\|@ts-ignore\|@ts-expect-error" apps/ packages/ --include='*.ts' --include='*.tsx' | head -30`
- `console.log` in production paths
  - Command: `grep -rn "console.log" apps/ packages/ --include='*.ts' --include='*.tsx' | wc -l`
- Dead files (never imported)
- Inconsistencies between docs and code
- Files >500 lines (refactor candidates)
  - Command: `find apps/ packages/ -name "*.ts" -o -name "*.tsx" | xargs wc -l 2>/dev/null | sort -rn | head -20`

Report each with file path + brief description. No fixes proposed.

## 21. Recent commit activity

- [ ] Last 30 commits on `main`
  - Command: `git log --oneline -30 main`
- [ ] Commits since last audit (if known)

## 22. Dependency status

| Package | Workspace | Version | Status |
|---|---|---|---|

Fill the table with:
- `expo`, `react-native`, `react`, `@trpc/server`, `@trpc/react-query`, `@tanstack/react-query`, `drizzle-orm`, `zustand`, `@nozbe/watermelondb`, `@sentry/react-native`, `@anthropic-ai/sdk`, `react-native-mmkv`, `react-native-draggable-flatlist`, `expo-secure-store`, `expo-router`, `fastify`, `redis`/`ioredis`

For each: workspace it's in, current version, whether it's a major version behind latest.

## 23. Critical risk register

List every `[FAIL]` and high-impact `[PARTIAL]` from sections 1-19 grouped by severity:

### CRITICAL (security or data loss)
- ...

### HIGH (broken core functionality)
- ...

### MEDIUM (broken edge cases or perf issues)
- ...

### LOW (cosmetic / dev experience)
- ...

## 24. Audit summary

Exact format:

```markdown
## Summary

### Status counts by part

| Part | OK | Partial | Fail | Missing | Unknown |
|---|---|---|---|---|---|
| A — Security | X | X | X | X | X |
| B — Functionality | X | X | X | X | X |
| C — Optimization | X | X | X | X | X |
| D — Infrastructure | X | X | X | X | X |

### Top 3 critical issues
1. ...
2. ...
3. ...

### Top 3 functional gaps
1. ...
2. ...
3. ...

### Top 3 optimization opportunities
1. ...
2. ...
3. ...

### Typecheck status
- apps/api: X errors
- apps/mobile: X errors
- root: X errors

### Test status
- API tests: X pass / X fail / X total
- Mobile tests: X pass / X fail / X total

### Production readiness assessment
- Security: [ready / not ready] — reason
- Core functionality: [ready / not ready] — reason
- Performance: [acceptable / needs work] — reason

### Single most impactful next action
[one sentence]
```

---

## Process

1. Start at repo root
2. Read-only: no code changes, no migrations, no `npm install`, no app builds
3. Cite evidence for every check
4. If a section's prerequisites aren't met (e.g., feature truly not implemented), mark items appropriately and move on
5. Save output as `AUDIT_FULL_STATE.md` at repo root
6. Expected length: ~1000-1500 lines

## Done criteria

- [ ] `AUDIT_FULL_STATE.md` exists at repo root
- [ ] All 24 sections present in exact order
- [ ] Every check has a `[STATUS]` token + evidence
- [ ] Section 23 risk register populated
- [ ] Section 24 summary table has numeric counts and actionable insights

---

*Audit. Cite. Score. Don't fix.*

*Tanren · Une rep après l'autre.*
