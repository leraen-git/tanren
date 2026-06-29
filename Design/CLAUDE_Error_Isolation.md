# TANREN — Error Isolation per Section

> **For Claude Code.** Currently, when a single API query fails on a multi-section screen (Profile, Home, Training, Diet, History), the entire screen shows a global error and becomes unusable. This is wrong. Users should see every section that loads successfully, with inline error indicators only on the sections that failed.
>
> **Goal**: isolate error states to the sections that actually have the problem. Keep the rest of the screen functional. Offer per-section retry.
>
> **Prerequisites**:
> - Phase 1 of `CLAUDE_Stabilization_Plan.md` should be done (React Query persistence installed)
> - Ideally Phase 3.3 done (`src/data/*` hooks exist) — but this prompt works standalone too
>
> **Execution model**: 1 PR, ~3-4 hours of work. No stop-points — the whole change lands together.

---

## Diagnostic — why the whole screen breaks today

The likely current pattern (verify by opening Profile screen code):

```tsx
// Bad — single error path for the whole screen
export default function ProfileScreen() {
  const { data: profile, isLoading, error } = trpc.auth.me.useQuery()
  const { data: stats } = trpc.stats.summary.useQuery()
  const { data: weight } = trpc.weight.list.useQuery()
  // ... 5 more queries

  if (error) return <FullScreenError />   // ← kills the whole screen
  if (isLoading) return <Spinner />        // ← blocks everything
  // ... render sections
}
```

When `trpc.weight.list` fails but `trpc.auth.me` succeeds, the user sees nothing — because the screen-level error guard triggers on the first error it finds.

## The fix — per-section error boundaries

Each section manages its own loading/error state independently. A failure in one section does not affect its siblings.

```tsx
// Good — per-section isolation
export default function ProfileScreen() {
  return (
    <ScrollView>
      <IdentitySection />   {/* its own query, its own error UI */}
      <StatsSection />      {/* independent */}
      <WeightSection />     {/* if this fails, only this shows inline error */}
      <ActivePlanSection /> {/* independent */}
      <PreferencesSection />{/* independent */}
    </ScrollView>
  )
}
```

---

## Architecture decisions (locked)

### D1 · Required vs optional sections

Not all sections are equal. Some carry data without which the screen is meaningless (the user's name for a Profile header). Some are side info (monthly stats, weight trend).

- **Required sections**: if the query fails, show a single screen-level error with a "Réessayer" button. Example: user identity on Profile — can't render anything meaningful without a name.
- **Optional sections**: if the query fails, show inline error **within that section only**. The rest of the screen remains functional. Example: weight trend, stats, achievements.

**Rule of thumb**: if removing the section still leaves a usable screen, it's optional.

For Tanren:
- **Profile**: identity = required. Everything else = optional.
- **Home**: nothing is truly required — even if all queries fail, show a fallback "Hi! Start a workout" state
- **Training**: nothing required — if active plan query fails, show workouts list; if workouts fail, show plan; if both fail, show "+ New workout" CTA
- **Diet**: nothing required — show empty states per section
- **History**: nothing required — each tab (sessions/weight/measurements) is an independent section

### D2 · The `<SectionStatus>` component pattern

Every section renders through a reusable component that handles loading / error / success uniformly:

```tsx
<SectionStatus
  query={query}
  loadingHeight={80}          // skeleton height hint
  errorLabel="Poids"          // what failed, for the error message
>
  {(data) => <WeightChart data={data} />}
</SectionStatus>
```

This centralizes the three states per section and makes the error UI consistent across the whole app.

### D3 · Loading behavior during refetch

When the query is refetching (stale data, revalidating in the background), **do NOT show the loader or unmount the content**. Keep the previous data visible. Only show the loader on the very first fetch (no data yet).

React Query's `isPending` (never had data) vs `isLoading` (is currently fetching) distinction matters here.

### D4 · Error UX — inline, compact, actionable

Pattern (per GitHub / Linear):

```
┌─────────────────────────────────────────────┐
│ ⚠  Impossible de charger le poids           │
│    Vérifie ta connexion                     │
│                                   Réessayer │
└─────────────────────────────────────────────┘
```

- Ambre/warning color, not red (red = destructive)
- Short, actionable message in French
- "Réessayer" button on the right, triggers `query.refetch()`
- **Doesn't shift other sections** — the error block occupies roughly the same vertical space as the loaded content would

### D5 · No global error boundary hiding content

React's ErrorBoundary is for rendering crashes (thrown exceptions in render), not for query errors. Keep an ErrorBoundary at the screen root for crash safety, but query errors surface through `<SectionStatus>`, not the boundary.

---

## Implementation

### 1. Create the `<SectionStatus>` component

**New file**: `apps/mobile/src/components/SectionStatus.tsx`

```tsx
import { View, Text, Pressable, ActivityIndicator, StyleSheet } from 'react-native'
import { ReactNode } from 'react'
import type { UseQueryResult } from '@tanstack/react-query'
import { tokens } from '../design/tokens'  // use your existing design tokens

type SectionStatusProps<T> = {
  /** The React Query result object */
  query: UseQueryResult<T>
  /** Content to render when data is available */
  children: (data: NonNullable<T>) => ReactNode
  /** What failed (used in error message e.g. "Impossible de charger {label}") */
  errorLabel: string
  /** Height to reserve for the loading skeleton. Prevents layout shift. */
  loadingHeight?: number
  /** If true, hide the section entirely when data is null/undefined (vs error) */
  hideWhenEmpty?: boolean
  /** Optional override of the fallback shown when data is empty */
  emptyFallback?: ReactNode
}

export function SectionStatus<T>({
  query,
  children,
  errorLabel,
  loadingHeight = 80,
  hideWhenEmpty = false,
  emptyFallback,
}: SectionStatusProps<T>) {
  const { data, isPending, isError, error, refetch, isRefetching } = query

  // First-time loading: no data yet, show skeleton
  if (isPending) {
    return (
      <View style={[styles.skeleton, { height: loadingHeight }]}>
        <ActivityIndicator color={tokens.textMute} />
      </View>
    )
  }

  // Error path — only triggers when there's no data to show
  // If we have stale data AND an error (background refetch failed), prefer to show the data
  if (isError && data == null) {
    const message = error instanceof Error ? error.message : String(error)
    return (
      <View style={styles.errorBlock}>
        <View style={styles.errorContent}>
          <Text style={styles.errorIcon}>⚠</Text>
          <View style={styles.errorText}>
            <Text style={styles.errorTitle}>
              Impossible de charger {errorLabel.toLowerCase()}
            </Text>
            <Text style={styles.errorDetail}>
              {isNetworkError(message) ? 'Vérifie ta connexion' : 'Réessaie dans un instant'}
            </Text>
          </View>
        </View>
        <Pressable
          onPress={() => refetch()}
          style={styles.retryBtn}
          disabled={isRefetching}
        >
          <Text style={styles.retryText}>
            {isRefetching ? '…' : 'Réessayer'}
          </Text>
        </Pressable>
      </View>
    )
  }

  // Data is present (even if stale + refetching in background)
  if (data == null) {
    if (hideWhenEmpty) return null
    return emptyFallback ?? null
  }

  return <>{children(data as NonNullable<T>)}</>
}

function isNetworkError(message: string): boolean {
  const m = message.toLowerCase()
  return (
    m.includes('network') ||
    m.includes('fetch') ||
    m.includes('timeout') ||
    m.includes('failed to fetch') ||
    m.includes('econnrefused')
  )
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: tokens.surface1,
    borderRadius: 0,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  errorBlock: {
    borderWidth: 1,
    borderColor: tokens.amber,
    borderLeftWidth: 3,
    backgroundColor: 'rgba(232, 169, 0, 0.06)',
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  errorContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  errorIcon: {
    color: tokens.amber,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 18,
  },
  errorText: {
    flex: 1,
  },
  errorTitle: {
    color: tokens.text,
    fontWeight: '700',
    fontSize: 13,
    letterSpacing: 0.2,
    marginBottom: 2,
  },
  errorDetail: {
    color: tokens.textMute,
    fontSize: 11,
    letterSpacing: 0.1,
  },
  retryBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: tokens.amber,
  },
  retryText: {
    color: tokens.amber,
    fontWeight: '700',
    fontSize: 10,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
})
```

**Key behaviors**:
- `isPending && !data` → skeleton
- `isError && !data` → inline error with retry
- `data != null` (even if stale + refetching) → render children, silent background refresh
- `data == null && !isError` → empty fallback or nothing

### 2. Refactor Profile screen

**File**: `apps/mobile/app/(tabs)/profile.tsx` (or wherever Profile lives)

Before: monolithic screen with one big error path.

After: a shell screen with independent section components, each owning its own query.

```tsx
// apps/mobile/app/(tabs)/profile.tsx
import { ScrollView, RefreshControl, View } from 'react-native'
import { useState, useCallback } from 'react'
import { IdentitySection } from '../../src/screens/profile/IdentitySection'
import { StatsSection } from '../../src/screens/profile/StatsSection'
import { WeightSection } from '../../src/screens/profile/WeightSection'
import { ActivePlanSection } from '../../src/screens/profile/ActivePlanSection'
import { PreferencesSection } from '../../src/screens/profile/PreferencesSection'
import { trpc } from '../../src/lib/trpc'

export default function ProfileScreen() {
  const utils = trpc.useUtils()
  const [refreshing, setRefreshing] = useState(false)

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    // Invalidate everything Profile cares about, in parallel
    await Promise.all([
      utils.auth.me.invalidate(),
      utils.stats.summary.invalidate(),
      utils.weight.list.invalidate(),
      utils.plans.active.invalidate(),
      // ... anything else
    ])
    setRefreshing(false)
  }, [utils])

  return (
    <ScrollView
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* IdentitySection is REQUIRED — if it fails, the screen falls back globally */}
      <IdentitySection />

      {/* All other sections are independent. Each has its own loading/error/success state. */}
      <StatsSection />
      <WeightSection />
      <ActivePlanSection />
      <PreferencesSection />
    </ScrollView>
  )
}
```

### 3. Create one section component per logical block

Each section component contains its own query + rendering, wrapped in `<SectionStatus>`.

**Example** — `apps/mobile/src/screens/profile/WeightSection.tsx`:

```tsx
import { View, Text } from 'react-native'
import { trpc } from '../../lib/trpc'
import { SectionStatus } from '../../components/SectionStatus'
import { WeightChart } from '../../components/WeightChart'

export function WeightSection() {
  const query = trpc.weight.list.useQuery()

  return (
    <View>
      <Text style={styles.sectionLabel}>Évolution du poids</Text>
      <SectionStatus
        query={query}
        errorLabel="le poids"
        loadingHeight={140}
        hideWhenEmpty  // don't show anything if user has no weight entries yet
      >
        {(entries) => <WeightChart entries={entries} />}
      </SectionStatus>
    </View>
  )
}
```

**Example — required section** (`IdentitySection.tsx`):

```tsx
import { View, Text, ActivityIndicator, Pressable } from 'react-native'
import { trpc } from '../../lib/trpc'
import { router } from 'expo-router'

export function IdentitySection() {
  const { data: profile, isPending, isError, refetch } = trpc.auth.me.useQuery()

  if (isPending) {
    return (
      <View style={styles.identityLoader}>
        <ActivityIndicator />
      </View>
    )
  }

  if (isError || !profile) {
    // Identity is REQUIRED — fallback to full-block error with retry
    // (not an inline section error, because there's no content to render beneath)
    return (
      <View style={styles.identityError}>
        <Text style={styles.errorIcon}>⚠</Text>
        <Text style={styles.errorTitle}>Impossible de charger ton profil</Text>
        <Text style={styles.errorDetail}>Vérifie ta connexion internet</Text>
        <Pressable onPress={() => refetch()} style={styles.retryBtnLarge}>
          <Text style={styles.retryTextLarge}>Réessayer</Text>
        </Pressable>
      </View>
    )
  }

  return (
    <View style={styles.identity}>
      <Avatar url={profile.avatarUrl} />
      <Text style={styles.name}>{profile.name}</Text>
      <Text style={styles.email}>{profile.email}</Text>
    </View>
  )
}
```

**Do the same** for:
- `StatsSection` — consumes `trpc.stats.summary` or equivalent
- `ActivePlanSection` — consumes `trpc.plans.active`
- `PreferencesSection` — local UI state + optional tRPC if preferences are persisted server-side
- Any other section on the Profile screen

Each is a standalone file in `apps/mobile/src/screens/profile/`.

### 4. Apply the same pattern to other tabs

Repeat for tabs that have multiple independent sections.

#### Home tab (`apps/mobile/app/(tabs)/index.tsx`)

Probable sections:
- **TodayHeroCard** — consumes `trpc.plans.active` (for next workout) + `trpc.sessions.list` (to check if today is done)
- **StatsStrip** — consumes `trpc.stats.summary`
- **AiSuggestionCard** — static, no query
- **QuickActions** — static

Refactor to:

```tsx
export default function HomeScreen() {
  return (
    <ScrollView refreshControl={...}>
      <TodayHeroCard />
      <StatsStrip />
      <AiSuggestionCard />
      <QuickActions />
    </ScrollView>
  )
}
```

#### Training tab (`apps/mobile/app/(tabs)/training.tsx`)

Sections:
- **TodayBlock** — only shown if there's a next workout today (depends on `plans.active`)
- **ActivePlanCard** — depends on `plans.active`
- **WorkoutsList** — depends on `trpc.workouts.list`
- **AiPlanCard** — static

Each wrapped in `<SectionStatus>`. If `plans.active` fails but `workouts.list` succeeds, the user still sees their workouts and the AI card — they just see an inline error in the active plan slot.

#### Diet tab and History tab

Same pattern. List the sections, one component per section, each with its own query.

### 5. React Query default retry — configure carefully

Per `_layout.tsx` (where QueryClient is set up), configure smart retry defaults so transient errors auto-recover before the user sees them:

```ts
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 24 * 60 * 60 * 1000,
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx client errors (bad input, unauthorized, etc.)
        if (error?.data?.httpStatus >= 400 && error?.data?.httpStatus < 500) {
          return false
        }
        // Retry up to 2 times on 5xx/network errors
        return failureCount < 2
      },
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000), // 1s, 2s, 4s...
      refetchOnWindowFocus: false,
      // Keep previous data visible during refetch (React Query v5 behavior)
      // by default placeholderData: (previousData) => previousData
    },
    mutations: {
      retry: 0,  // never auto-retry mutations (risk of duplicate writes)
    },
  },
})
```

**Why**: if the user's phone briefly loses network (elevator, train), the query silently retries and the section never flashes an error. Only if all retries fail does `<SectionStatus>` show the error UI.

### 6. When offline entirely (Phase 4 consideration)

Until Phase 4 (WatermelonDB) ships, if the user is fully offline AND has no cached data, sections will show the error state. That's correct behavior for now.

**With Phase 1.4 React Query persistence in place**: most sections will show cached data silently, never hitting the error state even offline. The error only surfaces on sections that have never loaded before (new user, new screen).

---

## Refactor checklist per screen

For every multi-section screen (Profile, Home, Training, Diet, History):

- [ ] Remove the screen-level `error` / `isLoading` guard that kills the whole screen
- [ ] Extract each section into its own component in `src/screens/<tab>/`
- [ ] Each section owns its `trpc.X.useQuery()` call
- [ ] Each section wraps its content in `<SectionStatus>`
- [ ] The screen file is just a `<ScrollView>` with a `<RefreshControl>` and the section components stacked
- [ ] Required sections (identity) handle errors with their own full-block fallback
- [ ] Optional sections (stats, weight, etc.) use `<SectionStatus>` inline errors
- [ ] Pull-to-refresh invalidates all relevant queries in parallel

---

## Verification

### Manual testing

1. **Launch the app with network**: all sections load normally, no errors.

2. **Disable network, kill app, reopen**: sections that had cached data (Phase 1.4 persistence) show the cache; sections that didn't show inline errors per section. The screen remains scrollable and usable.

3. **Simulate partial API failure**:
   - Comment out the response in ONE backend procedure (e.g., `weight.list` throws)
   - Redeploy
   - Open Profile: identity + stats + plan all visible and functional. Weight section shows inline ⚠ with Réessayer. Tapping Réessayer retries that query only.

4. **Simulate slow network (Chrome DevTools Network throttling → Slow 3G)**:
   - Each section loads independently at its own pace
   - No single slow query blocks the rest
   - User sees progressive rendering, not a monolithic spinner

5. **Pull to refresh**:
   - All queries refetch in parallel
   - Existing data stays visible during refetch (no flicker)
   - Errors that previously failed get retried

### Automated testing (optional — if time permits)

Add tests for `<SectionStatus>`:

```ts
// apps/mobile/__tests__/SectionStatus.test.tsx
import { render, fireEvent } from '@testing-library/react-native'
import { SectionStatus } from '../src/components/SectionStatus'

test('renders children when data is present', () => { /* ... */ })
test('renders skeleton when pending with no data', () => { /* ... */ })
test('renders inline error when error and no data', () => { /* ... */ })
test('calls refetch when retry pressed', () => { /* ... */ })
test('keeps data visible during background refetch', () => { /* ... */ })
```

---

## Commit sequence

```
feat(mobile): SectionStatus component for per-section error isolation
refactor(mobile): Profile screen split into independent sections
refactor(mobile): Home screen split into independent sections
refactor(mobile): Training tab split into independent sections
refactor(mobile): Diet and History tabs split into independent sections
chore(mobile): smarter React Query retry (skip 4xx, exponential backoff on 5xx)
```

One PR, all commits together. It's a single conceptual change.

---

## What this does NOT cover

- **Mutation error UI** — this prompt is about QUERY errors (reads). Mutations (writes) have their own error handling (toast, inline form error). If you see mutation errors poorly handled, that's a follow-up.
- **Crash recovery** (React errors thrown in render) — handled by a top-level `<ErrorBoundary>` which should already exist. Not the same as query errors.
- **True offline writes** — handled in Phase 4 of `CLAUDE_Stabilization_Plan.md`.
- **Global connectivity indicator** (small banner "Connexion perdue" at the top of the screen) — nice-to-have, not in this scope. Can be added later via `@react-native-community/netinfo`.

---

## Rules going forward

After this refactor:

1. **Every new multi-section screen** follows the same pattern: one component per section, each with its own query, wrapped in `<SectionStatus>`.
2. **Never put multiple `trpc.X.useQuery` calls at the screen-level** with a single error gate. That re-creates the problem.
3. **Required vs optional is a design decision**. Document it in the section component header comment.
4. **Pull-to-refresh invalidates all queries in parallel** — don't chain them sequentially.

---

*Fail gracefully. Recover cleanly. Never block the user from what works.*

*Tanren · Une rep après l'autre.*
