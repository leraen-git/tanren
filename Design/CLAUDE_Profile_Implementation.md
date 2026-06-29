# TANREN — Profile Feature Implementation Prompt

> **For Claude Code.** Complete implementation of the Tanren Profile feature: React Native frontend, Fastify backend, Prisma schema updates, and weight tracking algorithms.
>
> **Visual source of truth**: `/design/Tanren_Profile_Secondary_Screens.html` — open this file before starting. It contains 22 mockups (dark + light) describing the pixel-perfect target state for the 10 secondary screens.
>
> **Existing landing reference**: `/design/Tanren_Lot2_Data_Tabs.html` section 19 — the Profile landing screen already exists and **must not be modified visually**. This implementation only builds the secondary screens accessible via row taps.
>
> **Graphic charter**: respect `/CLAUDE_Charter_Application.md` which defines tokens, components, and global visual rules.

---

## 📋 Contents

1. [Scope and deliverables](#1--scope-and-deliverables)
2. [Shared data contracts (Zod)](#2--shared-data-contracts-zod)
3. [Prisma schema updates](#3--prisma-schema-updates)
4. [Backend — Fastify endpoints](#4--backend--fastify-endpoints)
5. [Critical algorithms](#5--critical-algorithms)
6. [Frontend — screen structure](#6--frontend--screen-structure)
7. [Frontend — components to create](#7--frontend--components-to-create)
8. [Frontend — Zustand store](#8--frontend--zustand-store)
9. [Frontend — custom hooks](#9--frontend--custom-hooks)
10. [i18n — strings to add](#10--i18n--strings-to-add)
11. [Implementation order](#11--implementation-order)
12. [Validation checklist](#12--validation-checklist)
13. [Important notes](#13--important-notes)

---

## 1 · Scope and deliverables

### ✅ What you will implement

- **9 active secondary screens** accessible from the Profile tab landing:
  - 1 full-screen: Weight tracking (`/profile/weight`)
  - 6 bottom-sheet modals: Edit First Name, Height, Level, Goal, Sessions per Week, Add Weight Entry
  - 1 full-screen: Health & Sync (**DISABLED** state only — see section 1.2)
  - 1 centered modal: Logout confirmation
- **Backend**: 5 Fastify endpoints (`PATCH /profile`, `GET /profile/weight`, `POST /profile/weight`, `DELETE /profile/weight/:id`, `POST /auth/logout`)
- **DB**: Prisma migration to add `WeightEntry` table + extend `User` with profile fields
- **Algorithms**: weight aggregation (min/avg/max + delta), period filtering, optimistic updates pattern
- **Store**: 1 Zustand store `profileStore` (UI state only, data via TanStack Query)
- **Hooks**: 4 custom hooks (`useProfile`, `useWeightHistory`, `useAddWeight`, `useUpdateProfile`)

### ❌ Out of scope (intentionally excluded)

These items are **not** to be implemented in this iteration:

- **Health & Sync** is **disabled / coming soon**. The row appears in the Profile landing but is **non-tappable** with a "Bientôt" badge. The full-screen `/profile/health` route exists but only renders a "Coming Soon" state. **Do not implement HealthKit/Health Connect integrations.** See section 1.2 for exact behavior.
- **Export Data** is **completely removed** for this iteration. **Do not add the row to the Profile landing**, do not create the `/profile/export` route, do not create components or backend endpoints related to data export. This will come in a future release.

### 1.2 · Health & Sync disabled state — exact spec

The "Santé & sync" row in the Profile landing must:
- **Remain visible** in the Réglages section
- Display a small **"Bientôt" badge** (gray, not accent — this isn't a feature announcement, just an availability indicator) on the right side instead of the chevron
- Be **non-tappable** — `onPress` is undefined, `disabled` prop is true, the row has reduced opacity (0.5 on the label)
- The route `/profile/health` exists but renders a minimal "Coming Soon" screen with:
  - Standard ScreenHeader with back button and "Santé & sync" title
  - Centered content: kanji 鍛 (40px, 0.4 opacity), label "BIENTÔT DISPONIBLE" in accent uppercase, short text "La synchronisation avec Apple Santé et Google Health Connect arrive dans une prochaine version de Tanren."
  - No CTA, no toggles, no further interaction

This is a **deliberate UX choice**: keeping the row visible signals the feature is planned, while preventing access avoids partial implementation that would confuse users.

### Out of broader scope (handled elsewhere)

- The Profile landing UI (Lot 2 §19) — **already implemented**, do not modify
- Reminders screen — already implemented (Lot 3 §20)
- Explore Tanren screen — already implemented (Lot 4 §21)
- Privacy Policy screen — already implemented (Lot 4 §22)
- Delete Account screen — already implemented (Lot 4 §19b)
- Auth provider integration — handled by existing `useAuth` hook
- WatermelonDB sync — handled by existing `useSync` hook

---

## 2 · Shared data contracts (Zod)

Create these schemas in `packages/shared-schemas/src/profile.ts`. They are used identically by mobile and backend — **strict identity guaranteed**.

```ts
// packages/shared-schemas/src/profile.ts
import { z } from 'zod';

// === Enums ===

export const TrainingLevelEnum = z.enum([
  'BEGINNER',
  'INTERMEDIATE',
  'ADVANCED',
]);
export type TrainingLevel = z.infer<typeof TrainingLevelEnum>;

export const TrainingGoalEnum = z.enum([
  'MUSCLE',
  'STRENGTH',
  'FAT_LOSS',
  'MAINTENANCE',
]);
export type TrainingGoal = z.infer<typeof TrainingGoalEnum>;

export const WeightPeriodEnum = z.enum([
  '7d',
  '30d',
  '3m',
  '1y',
]);
export type WeightPeriod = z.infer<typeof WeightPeriodEnum>;

// === Profile ===

export const ProfileSchema = z.object({
  id: z.string().cuid(),
  email: z.string().email(),
  firstName: z.string().min(1).max(40),
  heightCm: z.number().int().min(120).max(230),
  trainingLevel: TrainingLevelEnum,
  trainingGoal: TrainingGoalEnum,
  sessionsPerWeek: z.number().int().min(2).max(7),
  authProvider: z.enum(['APPLE', 'GOOGLE', 'EMAIL', 'GUEST']),
  createdAt: z.string().datetime(),
});
export type Profile = z.infer<typeof ProfileSchema>;

export const ProfileUpdateSchema = ProfileSchema.pick({
  firstName: true,
  heightCm: true,
  trainingLevel: true,
  trainingGoal: true,
  sessionsPerWeek: true,
}).partial();
export type ProfileUpdate = z.infer<typeof ProfileUpdateSchema>;

// === Weight tracking ===

export const WeightEntrySchema = z.object({
  id: z.string().cuid(),
  weightKg: z.number().min(30).max(300),  // realistic human range
  measuredAt: z.string().datetime(),
  source: z.enum(['MANUAL', 'HEALTH_SYNC']),  // future-proofing for Health
  createdAt: z.string().datetime(),
});
export type WeightEntry = z.infer<typeof WeightEntrySchema>;

export const WeightEntryCreateSchema = WeightEntrySchema.pick({
  weightKg: true,
  measuredAt: true,
});
export type WeightEntryCreate = z.infer<typeof WeightEntryCreateSchema>;

// === Weight history response ===

export const WeightHistoryQuerySchema = z.object({
  period: WeightPeriodEnum.default('30d'),
});
export type WeightHistoryQuery = z.infer<typeof WeightHistoryQuerySchema>;

export const WeightStatsSchema = z.object({
  current: z.number().nullable(),         // most recent entry, null if no entries
  currentMeasuredAt: z.string().datetime().nullable(),
  min: z.number().nullable(),
  avg: z.number().nullable(),
  max: z.number().nullable(),
  deltaKg: z.number().nullable(),         // current - first entry of period
  trendDirection: z.enum(['UP', 'DOWN', 'FLAT']).nullable(),
});
export type WeightStats = z.infer<typeof WeightStatsSchema>;

export const WeightHistoryResponseSchema = z.object({
  entries: z.array(WeightEntrySchema),
  stats: WeightStatsSchema,
  period: WeightPeriodEnum,
});
export type WeightHistoryResponse = z.infer<typeof WeightHistoryResponseSchema>;
```

---

## 3 · Prisma schema updates

The base schema (from the master file) should already have a `User` model. Extend it with the profile fields and create the new `WeightEntry` model.

```prisma
model User {
  // ... existing fields (id, email, authProvider, etc.)

  firstName       String   @db.VarChar(40)
  heightCm        Int
  trainingLevel   TrainingLevel
  trainingGoal    TrainingGoal
  sessionsPerWeek Int      @default(3)

  weightEntries   WeightEntry[]
}

enum TrainingLevel {
  BEGINNER
  INTERMEDIATE
  ADVANCED
}

enum TrainingGoal {
  MUSCLE
  STRENGTH
  FAT_LOSS
  MAINTENANCE
}

model WeightEntry {
  id          String        @id @default(cuid())
  userId      String
  user        User          @relation(fields: [userId], references: [id], onDelete: Cascade)

  weightKg    Decimal       @db.Decimal(5,2)   // e.g. 82.40
  measuredAt  DateTime      // when the user actually weighed in (not when saved)
  source      WeightSource  @default(MANUAL)
  createdAt   DateTime      @default(now())

  @@index([userId, measuredAt])  // CRITICAL for period queries
}

enum WeightSource {
  MANUAL
  HEALTH_SYNC   // reserved for future Health integration
}
```

**Migration to create:**

```bash
npx prisma migrate dev --name add_profile_fields_and_weight_entries
```

If `firstName`, `heightCm`, `trainingLevel`, `trainingGoal`, `sessionsPerWeek` are not present on User, add them with the defaults above. The `WeightEntry` table is brand new.

---

## 4 · Backend — Fastify endpoints

### 4.1 · Routes structure

Create `apps/api/src/routes/profile.ts` with the 5 endpoints. Each endpoint:
- Validates query/body params with the corresponding Zod schema
- Returns the corresponding Zod response schema
- Uses `userId` extracted from JWT (never from query)
- Returns 401 if no JWT, 400 if invalid params, 404 if resource not found, 500 if server error

```ts
// apps/api/src/routes/profile.ts
import { FastifyPluginAsync } from 'fastify';
import {
  ProfileSchema,
  ProfileUpdateSchema,
  WeightHistoryQuerySchema,
  WeightHistoryResponseSchema,
  WeightEntryCreateSchema,
  WeightEntrySchema,
} from '@tanren/shared-schemas';
import {
  getProfile,
  updateProfile,
  getWeightHistory,
  addWeightEntry,
  deleteWeightEntry,
  logout,
} from '../services/profile';

export const profileRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', app.authenticate);

  // GET /profile
  app.get('/profile', async (req) => {
    const profile = await getProfile(req.user.id);
    return ProfileSchema.parse(profile);
  });

  // PATCH /profile
  app.patch('/profile', async (req) => {
    const updates = ProfileUpdateSchema.parse(req.body);
    const profile = await updateProfile(req.user.id, updates);
    return ProfileSchema.parse(profile);
  });

  // GET /profile/weight?period=30d
  app.get('/profile/weight', async (req) => {
    const query = WeightHistoryQuerySchema.parse(req.query);
    const result = await getWeightHistory(req.user.id, query.period);
    return WeightHistoryResponseSchema.parse(result);
  });

  // POST /profile/weight
  app.post('/profile/weight', async (req) => {
    const body = WeightEntryCreateSchema.parse(req.body);
    const entry = await addWeightEntry(req.user.id, body);
    return WeightEntrySchema.parse(entry);
  });

  // DELETE /profile/weight/:id
  app.delete('/profile/weight/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const deleted = await deleteWeightEntry(req.user.id, id);
    if (!deleted) return reply.code(404).send({ error: 'Not found' });
    return { success: true };
  });

  // POST /auth/logout (lives here even though /auth — invalidates JWT, optional)
  app.post('/auth/logout', async (req) => {
    await logout(req.user.id);
    return { success: true };
  });
};
```

Mount these routes in `apps/api/src/server.ts` under `/api`.

### 4.2 · Service layer

Create `apps/api/src/services/profile.ts` with these functions:

- `getProfile(userId)` → returns `Profile` (404 if user deleted)
- `updateProfile(userId, updates)` → atomic partial update, returns updated `Profile`
- `getWeightHistory(userId, period)` → returns paginated entries + computed stats. Implementation in section 5.1.
- `addWeightEntry(userId, data)` → creates entry, validates `measuredAt` is not in the future
- `deleteWeightEntry(userId, entryId)` → deletes entry only if it belongs to userId (security)
- `logout(userId)` → invalidates JWT (if you maintain a token blacklist) or no-op (if pure JWT)

### 4.3 · Query optimizations

The weight history query must use the `@@index([userId, measuredAt])`:

```ts
const entries = await prisma.weightEntry.findMany({
  where: {
    userId,
    measuredAt: { gte: periodStart, lte: now },
  },
  orderBy: { measuredAt: 'desc' },
  take: 100,  // hard cap to avoid huge responses
});
```

For the stats computation (min/avg/max/delta), do it in JavaScript on the entries array — Prisma aggregations are slower for small datasets like this.

---

## 5 · Critical algorithms

### 5.1 · Weight history stats computation

This is the central algorithm of the Weight tracking feature. Computes min/avg/max plus a delta vs the start of the period (used to display "−1.6 kg over 30 days" in the hero).

```ts
// apps/api/src/services/weightStats.ts
import { WeightEntry, WeightStats } from '@tanren/shared-schemas';

export function computeWeightStats(entries: WeightEntry[]): WeightStats {
  if (entries.length === 0) {
    return {
      current: null,
      currentMeasuredAt: null,
      min: null,
      avg: null,
      max: null,
      deltaKg: null,
      trendDirection: null,
    };
  }

  // entries are sorted desc by measuredAt (newest first)
  const current = entries[0];
  const oldest = entries[entries.length - 1];

  const weights = entries.map(e => Number(e.weightKg));

  const min = Math.min(...weights);
  const max = Math.max(...weights);
  const avg = Math.round(
    (weights.reduce((sum, w) => sum + w, 0) / weights.length) * 10
  ) / 10;

  // Delta is current - oldest of period (intuitive: "where you started vs where you are")
  // Negative = lost weight over period, positive = gained
  const deltaKg = entries.length > 1
    ? Math.round((Number(current.weightKg) - Number(oldest.weightKg)) * 10) / 10
    : 0;

  // Trend threshold: ±0.2 kg considered "flat" to avoid jitter from daily fluctuations
  const trendDirection: 'UP' | 'DOWN' | 'FLAT' =
    Math.abs(deltaKg) < 0.2 ? 'FLAT'
    : deltaKg > 0 ? 'UP'
    : 'DOWN';

  return {
    current: Number(current.weightKg),
    currentMeasuredAt: current.measuredAt.toString(),
    min,
    avg,
    max,
    deltaKg,
    trendDirection,
  };
}
```

**Intelligence behind this**: the `deltaKg` is computed against the **first entry of the selected period**, not the previous entry. This gives the user the answer to "Am I making progress?" rather than "Did I lose since yesterday?" — much more meaningful for body weight tracking. The 0.2 kg threshold for FLAT prevents the trend from flipping every day due to normal water weight fluctuations.

### 5.2 · Period filtering

```ts
// apps/api/src/services/weightHistory.ts
export function getPeriodStart(period: WeightPeriod, now: Date = new Date()): Date {
  const start = new Date(now);
  switch (period) {
    case '7d':  start.setDate(start.getDate() - 7); break;
    case '30d': start.setDate(start.getDate() - 30); break;
    case '3m':  start.setMonth(start.getMonth() - 3); break;
    case '1y':  start.setFullYear(start.getFullYear() - 1); break;
  }
  start.setHours(0, 0, 0, 0);
  return start;
}
```

### 5.3 · Coaching tip logic for sessions/week

The "Edit Sessions per Week" bottom-sheet shows a coaching tip below the stepper that adapts to the chosen value. The intelligence is a simple lookup, but the **content matters** — it gives the user context on what their choice implies in terms of training split.

```ts
// apps/mobile/utils/sessionsPerWeekTip.ts

export function getSessionsCoachingTip(n: number): {
  title: string;
  description: string;
} {
  if (n === 2) return {
    title: '2 séances/sem',
    description: 'Minimum pour progresser. Idéal en Full Body — chaque séance touche tout le corps.',
  };
  if (n === 3) return {
    title: '3 séances/sem',
    description: 'Très bon volume. Full Body ou Push/Pull/Legs alterné une semaine sur deux.',
  };
  if (n === 4) return {
    title: '4 séances/sem',
    description: "Idéal pour l'hypertrophie en split Push/Pull/Legs/Upper.",
  };
  if (n === 5) return {
    title: '5 séances/sem',
    description: 'Volume élevé. Bro split (1 muscle/jour) ou PPL+Upper/Lower.',
  };
  if (n === 6) return {
    title: '6 séances/sem',
    description: 'PPL classique × 2. Demande une bonne récupération et nutrition.',
  };
  if (n === 7) return {
    title: '7 séances/sem',
    description: 'Niveau avancé. Volume très élevé, repose sur un programme bien construit.',
  };
  return { title: '', description: '' };
}
```

**Intelligence behind this**: instead of a generic message, each tip references a real-world training split that maps to common bodybuilding/strength culture (PPL, Bro split, Upper/Lower). This makes the user feel the app understands their world. Used in `EditSessionsPerWeekModal` — the tip updates **live** as the stepper value changes.

### 5.4 · Optimistic updates pattern

For all profile edits (firstName, heightCm, trainingLevel, etc.), use optimistic updates so the UI feels instant. Pattern:

```ts
// apps/mobile/hooks/useUpdateProfile.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Profile, ProfileUpdate } from '@tanren/shared-schemas';
import { api } from '../api/client';

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: ProfileUpdate) => {
      const res = await api.patch<Profile>('/profile', updates);
      return res.data;
    },
    onMutate: async (updates) => {
      // 1. Cancel any in-flight queries
      await queryClient.cancelQueries({ queryKey: ['profile'] });

      // 2. Snapshot the previous value (for rollback on error)
      const previous = queryClient.getQueryData<Profile>(['profile']);

      // 3. Optimistically update the cache
      if (previous) {
        queryClient.setQueryData<Profile>(['profile'], {
          ...previous,
          ...updates,
        });
      }

      return { previous };
    },
    onError: (err, updates, context) => {
      // Rollback on error
      if (context?.previous) {
        queryClient.setQueryData(['profile'], context.previous);
      }
    },
    onSettled: () => {
      // Refetch in background to sync with server
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });
}
```

**Intelligence behind this**: profile edits are low-stakes (you're not transferring money, just updating your name). Optimistic updates give a feel of zero latency — the modal closes and the new value is visible before the network round trip completes. If the request fails, the value silently rolls back and a toast appears. Same pattern reused for `useAddWeight`, `useDeleteWeight`.

---

## 6 · Frontend — screen structure

### 6.1 · `app/profile/edit/[field].tsx` — DOES NOT EXIST

Don't create dynamic edit routes. Each edit is a **bottom-sheet modal** triggered from the Profile landing, not a separate route. Use a single `EditModalProvider` at the app root that takes a `field` prop.

### 6.2 · `app/profile/weight.tsx`

The full-screen weight tracking screen. Reference mockup: `/design/Tanren_Profile_Secondary_Screens.html` **section 03**.

```tsx
<Screen showKanji kanjiChar="錬">
  <ScreenHeader
    onBack={() => router.back()}
    title="Poids"
    rightAction={
      <Pressable onPress={() => setAddSheetOpen(true)}>
        <Text>+ Ajouter</Text>
      </Pressable>
    }
  />

  <WeightHero
    currentKg={stats.current}
    measuredAt={stats.currentMeasuredAt}
    deltaKg={stats.deltaKg}
    trendDirection={stats.trendDirection}
    period={period}
  />

  <PeriodTabs value={period} onChange={setPeriod} />

  <WeightChart entries={entries} />

  <WeightChartStats
    min={stats.min}
    avg={stats.avg}
    max={stats.max}
  />

  <SecLabel>Historique</SecLabel>
  <WeightEntryList
    entries={entries}
    onLongPress={(entry) => setDeleteConfirmEntry(entry)}
  />

  {addSheetOpen && (
    <AddWeightModal
      lastEntry={entries[0]}
      onClose={() => setAddSheetOpen(false)}
    />
  )}
</Screen>
```

### 6.3 · `app/profile/health.tsx`

The Health & Sync **disabled placeholder** screen. Reference mockup: see section 1.2 of this document.

```tsx
<Screen showKanji kanjiChar="錬">
  <ScreenHeader
    onBack={() => router.back()}
    title="Santé & sync"
  />

  <View style={{
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  }}>
    <Kanji char="鍛" size="xl" style={{ opacity: 0.4 }} />
    <Text style={{
      color: tokens.accent,
      fontSize: 11,
      letterSpacing: 0.4 * 11,
      textTransform: 'uppercase',
      fontWeight: '700',
      marginTop: 24,
      marginBottom: 12,
    }}>
      Bientôt disponible
    </Text>
    <Text style={{
      fontSize: 13,
      color: tokens.textDim,
      lineHeight: 20,
      textAlign: 'center',
      maxWidth: 260,
    }}>
      La synchronisation avec Apple Santé et Google Health Connect arrive dans une prochaine version de Tanren.
    </Text>
  </View>
</Screen>
```

**Critical**: do NOT add toggles, do NOT add a "Connect" CTA, do NOT add any logic. This is a placeholder, nothing more.

### 6.4 · Bottom-sheet modals (overlay on Profile landing)

These don't have their own routes — they overlay on whichever screen is active. Use a global modal provider or per-screen state.

The 6 bottom-sheet modals to create (each with its own component file):

| Component | Triggered from | Mockup section |
|---|---|---|
| `EditFirstNameModal` | Profile landing — Personnel > Prénom row | `/design/Tanren_Profile_Secondary_Screens.html` §01 |
| `EditHeightModal` | Profile landing — Personnel > Taille row | `/design/Tanren_Profile_Secondary_Screens.html` §02 |
| `AddWeightModal` | Weight tracking — "+ Ajouter" button | `/design/Tanren_Profile_Secondary_Screens.html` §04 |
| `EditTrainingLevelModal` | Profile landing — Entraînement > Niveau row | `/design/Tanren_Profile_Secondary_Screens.html` §05 |
| `EditTrainingGoalModal` | Profile landing — Entraînement > Objectif row | `/design/Tanren_Profile_Secondary_Screens.html` §06 |
| `EditSessionsPerWeekModal` | Profile landing — Entraînement > Séances/sem. row | `/design/Tanren_Profile_Secondary_Screens.html` §07 |

### 6.5 · Centered confirmation modal

`LogoutConfirmModal` — overlay triggered from Profile landing > Compte > Se déconnecter row. Reference mockup: `/design/Tanren_Profile_Secondary_Screens.html` **section 10**.

Different from bottom-sheets — this is a **centered modal** because it's a confirmation that demands attention.

---

## 7 · Frontend — components to create

All components must use the existing design system (`useTheme()`, tokens, etc.) and respect `/CLAUDE_Charter_Application.md`.

### 7.1 · Atoms (likely already existing — verify)

Check whether these atoms exist before creating. They're shared across the app:
- `Kanji` — for the 鍛 character display
- `Stepper` — generic [-] value [+] component
- `Button` — primary / outline / danger / ghost variants
- `Input` — underlined text input
- `RadioItem` — single selectable item with title + description + check

### 7.2 · Molecules (Profile-specific)

#### `ProfileRow`
Used in the Profile landing for each row. Props:

```tsx
type ProfileRowProps = {
  label: string;
  value?: string | React.ReactNode;
  onPress?: () => void;
  disabled?: boolean;          // true for Health & sync row
  badge?: 'soon' | 'new';      // displays "Bientôt" or "Nouvelle"
  danger?: boolean;            // for "Supprimer mon compte"
  showChevron?: boolean;       // default true
};
```

**Critical for disabled state**: when `disabled === true`:
- `onPress` is not called even if defined
- The label has `opacity: 0.5`
- The chevron is hidden
- A "Bientôt" badge is shown instead (gray surface2 background, 9px uppercase, letter-spacing 0.2em)

This is the component that handles the Health & sync row gracefully without complex conditionals in the parent.

#### `BottomSheetShell`
Reusable shell for all bottom-sheet modals. Provides:
- Backdrop with `--overlay` opacity
- Sheet container with top-only border-radius 12px
- Handle (40×4) at the top
- Title (17px Black uppercase, centered)
- Slot for content
- Slot for actions row (`Annuler` outline + `Enregistrer` primary)
- Swipe-down to close
- Backdrop tap to close

```tsx
type BottomSheetShellProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;  // typically the 2 buttons
};
```

**Implementation note**: use `react-native-reanimated` and `react-native-gesture-handler` for smooth swipe-down animation. Do not use `Modal` from React Native core — its presentation is broken on iOS for bottom-sheets in 2026.

#### `WeightHero`
Hero block for the Weight tracking screen. Displays:
- Current weight (56px JetBrains Mono Bold)
- Last measurement date/time meta line
- Delta line colored by trend direction (DOWN=green, UP=amber, FLAT=mute)

```tsx
type WeightHeroProps = {
  currentKg: number | null;
  measuredAt: string | null;
  deltaKg: number | null;
  trendDirection: 'UP' | 'DOWN' | 'FLAT' | null;
  period: WeightPeriod;
};
```

When `currentKg === null` (no entries yet), display empty state: dash placeholders + "Aucune pesée pour le moment".

#### `PeriodTabs`
4-tab segmented control for weight period selection. Props:

```tsx
type PeriodTabsProps = {
  value: WeightPeriod;
  onChange: (period: WeightPeriod) => void;
};
```

Visual: grid of 4 cells separated by 1px border background, active cell with accent bg + white text.

#### `WeightChart`
SVG line chart with area fill. Props:

```tsx
type WeightChartProps = {
  entries: WeightEntry[];   // sorted desc by measuredAt
  height?: number;          // default 130
};
```

Rendering details (per mockup §03):
- SVG with `viewBox="0 0 300 120" preserveAspectRatio="none"`
- 3 horizontal grid lines at y=30/60/90 in `--border` color, dashed (`stroke-dasharray="2,2"`)
- Area fill polygon: accent at 10% opacity (dark) / 8% opacity (light)
- Line: accent color, 1.8px stroke
- Last data point highlighted: circle r=4 filled accent + outer ring r=6, 1px stroke, 0.4 opacity
- Y-axis labels: JetBrains Mono 8px, `--text-mute` color, showing 3 weight values (max, mid, min)

**Intelligence behind this**: the chart is purely visual reference, not interactive. Tap on a data point doesn't do anything for V1. Adding tooltips/interactions would require a heavier charting library (Victory, Recharts) — keep raw SVG for V1.

The Y-axis labels should be computed from the actual data range, not hardcoded. If min weight is 80 and max is 85, show "85.0", "82.5", "80.0".

#### `WeightChartStats`
3-cell row showing Min / Avg / Max. Props:

```tsx
type WeightChartStatsProps = {
  min: number | null;
  avg: number | null;
  max: number | null;
};
```

Min in `--green`, Max in `--amber`, Avg neutral. All values in JetBrains Mono Bold 14px.

#### `WeightEntry`
Single row in the history list. Props:

```tsx
type WeightEntryProps = {
  entry: WeightEntry;
  previousEntry?: WeightEntry;   // to compute delta vs previous
  onLongPress?: () => void;       // for delete confirmation
};
```

Shows: relative date ("Hier · 7h12") + weight value in mono + delta vs previous entry colored.

**Intelligence behind this**: the delta shown next to each entry is **vs the previous entry chronologically** (i.e., the next one in the list). This shows daily fluctuations. This is different from the hero delta which is vs the start of the period.

#### `QuickSetButton`
Button used in the AddWeightModal. Increments/decrements weight by a fixed amount.

```tsx
type QuickSetButtonProps = {
  label: string;     // e.g. "+0,5 kg"
  delta: number;     // e.g. 0.5 or -1
  onPress: (delta: number) => void;
};
```

#### `CoachingTip`
Reusable tip block (might already exist as `VolumeFeedback`-style component). Used in `EditSessionsPerWeekModal`. Props:

```tsx
type CoachingTipProps = {
  kanji: '鍛' | '錬';
  title: string;
  description: string;
};
```

Visual: dashed accent border, padding 10px 12px, kanji 18px accent + text block (title accent uppercase + description textDim).

### 7.3 · Modal-specific components

These are the modal contents — the shell is `BottomSheetShell`.

- **`EditFirstNameModal`** — uses `Input` + helper text + actions
- **`EditHeightModal`** — uses `Stepper` (cm) + helper text + actions
- **`EditTrainingLevelModal`** — uses 3 `RadioItem` + actions
- **`EditTrainingGoalModal`** — uses 4 `RadioItem` + actions
- **`EditSessionsPerWeekModal`** — uses `Stepper` (sessions) + `CoachingTip` (live) + actions
- **`AddWeightModal`** — uses `Stepper` (0.1 step) + 6 `QuickSetButton` (3×2 grid) + date row + actions

### 7.4 · `LogoutConfirmModal`
Centered modal (NOT bottom-sheet). Reference mockup §10. Different visual structure:

- Position: centered with `top: 50%; transform: translateY(-50%)`
- Width: full minus 60px margin (30px each side)
- Stamp 鍛 錬 (10px accent letter-spacing 0.4em) centered top
- Title: "Se déconnecter ?" (20px Black uppercase, centered)
- Description: rationale text (12px textDim, centered, line-height 1.5)
- Actions: 2 buttons in `1fr 1fr` grid — Annuler (outline) + Déconnecter (danger red)

---

## 8 · Frontend — Zustand store

### 8.1 · `profileStore`

Manages **UI state only** for the profile screens (which modal is open, which period selected, etc.). Profile data and weight history come from TanStack Query hooks.

```ts
// apps/mobile/stores/profileStore.ts
import { create } from 'zustand';
import { WeightPeriod } from '@tanren/shared-schemas';

type ProfileModalType =
  | null
  | 'editFirstName'
  | 'editHeight'
  | 'editLevel'
  | 'editGoal'
  | 'editSessions'
  | 'addWeight'
  | 'logoutConfirm';

type ProfileState = {
  // Modal management
  activeModal: ProfileModalType;
  openModal: (type: ProfileModalType) => void;
  closeModal: () => void;

  // Weight tracking
  weightPeriod: WeightPeriod;
  setWeightPeriod: (period: WeightPeriod) => void;
};

export const useProfileStore = create<ProfileState>((set) => ({
  activeModal: null,
  openModal: (activeModal) => set({ activeModal }),
  closeModal: () => set({ activeModal: null }),

  weightPeriod: '30d',
  setWeightPeriod: (weightPeriod) => set({ weightPeriod }),
}));
```

**Intelligence behind this**: by centralizing modal state in the store, any screen can trigger any modal without prop drilling. The Profile landing can dispatch `openModal('editFirstName')` and the modal renders globally over whatever screen is active.

---

## 9 · Frontend — custom hooks

### 9.1 · `useProfile`

```ts
// apps/mobile/hooks/useProfile.ts
import { useQuery } from '@tanstack/react-query';
import { Profile } from '@tanren/shared-schemas';
import { api } from '../api/client';

export function useProfile() {
  return useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const res = await api.get<Profile>('/profile');
      return res.data;
    },
    staleTime: 5 * 60 * 1000,  // profile changes are rare
  });
}
```

### 9.2 · `useUpdateProfile`

See section 5.4 — full implementation with optimistic updates pattern.

### 9.3 · `useWeightHistory`

```ts
// apps/mobile/hooks/useWeightHistory.ts
import { useQuery } from '@tanstack/react-query';
import { useProfileStore } from '../stores/profileStore';
import { WeightHistoryResponse } from '@tanren/shared-schemas';
import { api } from '../api/client';

export function useWeightHistory() {
  const { weightPeriod } = useProfileStore();

  return useQuery({
    queryKey: ['profile', 'weight', weightPeriod],
    queryFn: async () => {
      const res = await api.get<WeightHistoryResponse>('/profile/weight', {
        params: { period: weightPeriod },
      });
      return res.data;
    },
    staleTime: 60 * 1000,  // 1 min
  });
}
```

### 9.4 · `useAddWeight`

```ts
// apps/mobile/hooks/useAddWeight.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { WeightEntry, WeightEntryCreate } from '@tanren/shared-schemas';
import { api } from '../api/client';

export function useAddWeight() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: WeightEntryCreate) => {
      const res = await api.post<WeightEntry>('/profile/weight', data);
      return res.data;
    },
    onSuccess: () => {
      // Invalidate all weight queries (any period)
      queryClient.invalidateQueries({ queryKey: ['profile', 'weight'] });
    },
  });
}
```

### 9.5 · `useDeleteWeight`

```ts
// apps/mobile/hooks/useDeleteWeight.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';

export function useDeleteWeight() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (entryId: string) => {
      await api.delete(`/profile/weight/${entryId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', 'weight'] });
    },
  });
}
```

### 9.6 · `useLogout`

```ts
// apps/mobile/hooks/useLogout.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { api } from '../api/client';
import { clearAuthTokens } from '../utils/auth';

export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await api.post('/auth/logout');
    },
    onSettled: async () => {
      // Always clear local state, even if backend call fails
      await clearAuthTokens();
      queryClient.clear();
      router.replace('/login');
    },
  });
}
```

**Intelligence behind this**: even if the backend logout call fails (network error, 401 because token already expired), we **always clear local state**. The user clicked "Disconnect" — that's the source of truth, not the backend response.

---

## 10 · i18n — strings to add

Add these entries in `apps/mobile/locales/fr.ts`:

```ts
export const fr = {
  // ... existing strings

  profile: {
    // ... existing landing strings (don't touch)

    // Edit modals
    editFirstNameTitle: 'Prénom',
    editFirstNameHelper: 'Ton prénom apparaît dans les share cards et emails.',

    editHeightTitle: 'Taille',
    editHeightHelper: 'Par pas de 1 cm. Maintiens pour défiler plus vite.',
    editHeightUnit: 'cm',

    editLevelTitle: 'Niveau',
    levelBeginnerLabel: 'Débutant',
    levelBeginnerDesc: '0 à 1 an de muscu régulière',
    levelIntermediateLabel: 'Intermédiaire',
    levelIntermediateDesc: '1 à 3 ans, tu connais les bases',
    levelAdvancedLabel: 'Avancé',
    levelAdvancedDesc: '3+ ans, tu gères tes cycles',

    editGoalTitle: 'Objectif',
    goalMuscleLabel: 'Muscle',
    goalMuscleDesc: 'Hypertrophie, prise de masse',
    goalStrengthLabel: 'Force',
    goalStrengthDesc: 'Charges lourdes, powerlifting',
    goalFatLossLabel: 'Perte de gras',
    goalFatLossDesc: 'Sèche, recomposition corporelle',
    goalMaintenanceLabel: 'Maintien',
    goalMaintenanceDesc: 'Garder ta forme actuelle',

    editSessionsTitle: 'Séances par semaine',
    editSessionsHelper: 'De 2 à 7 séances par semaine',
    editSessionsUnit: '/ sem.',

    // Weight tracking
    weightTitle: 'Poids',
    weightAddCTA: '+ Ajouter',
    weightDeltaOver: (kg: string, period: string) => `${kg} kg sur ${period}`,
    weightPeriod7d: '7 jours',
    weightPeriod30d: '30 jours',
    weightPeriod3m: '3 mois',
    weightPeriod1y: '1 an',
    weightPeriodLabel7d: '7 jours',
    weightPeriodLabel30d: '30 jours',
    weightPeriodLabel3m: '3 mois',
    weightPeriodLabel1y: '1 an',
    weightStatsMin: 'Min',
    weightStatsAvg: 'Moy.',
    weightStatsMax: 'Max',
    weightHistoryLabel: 'Historique',
    weightEmptyTitle: 'Aucune pesée pour le moment',
    weightEmptyDesc: 'Ajoute ta première pesée pour commencer le suivi.',
    weightLastMeasured: (date: string) => `Pesée ${date}`,

    // Add weight modal
    addWeightTitle: 'Nouvelle pesée',
    addWeightHelper: 'Par pas de 0,1 kg',
    addWeightDateLabel: 'Date & heure',
    addWeightUnit: 'kg',

    // Health & sync — DISABLED state
    healthSoonBadge: 'Bientôt',
    healthSoonTitle: 'Bientôt disponible',
    healthSoonDesc: 'La synchronisation avec Apple Santé et Google Health Connect arrive dans une prochaine version de Tanren.',

    // Logout confirm
    logoutConfirmTitle: 'Se déconnecter ?',
    logoutConfirmDesc: 'Tes données restent stockées sur cet appareil et synchronisées sur le cloud. Tu pourras te reconnecter plus tard avec le même compte Apple.',
    logoutConfirmCancel: 'Annuler',
    logoutConfirmAction: 'Déconnecter',

    // Common
    actionCancel: 'Annuler',
    actionSave: 'Enregistrer',
  },
};
```

---

## 11 · Implementation order

Follow this order to minimize conflicts and have commits that pass tests at each step.

### Phase 1 — Shared schemas + DB foundation

1. Create `packages/shared-schemas/src/profile.ts` with all Zod types (section 2)
2. Add the Prisma migration with `firstName`, `heightCm`, `trainingLevel`, `trainingGoal`, `sessionsPerWeek` on User + new `WeightEntry` table + enums + indexes (section 3)
3. Run `npx prisma migrate dev --name add_profile_fields_and_weight_entries`
4. **Commit**: `feat(schemas): profile data contracts + weight tracking DB`

### Phase 2 — Backend services + routes

5. Create `apps/api/src/services/weightStats.ts` — `computeWeightStats()` function (section 5.1)
6. Create `apps/api/src/services/profile.ts` — `getProfile`, `updateProfile`, `getWeightHistory`, `addWeightEntry`, `deleteWeightEntry`, `logout`
7. Create `apps/api/src/routes/profile.ts` with the 5 endpoints (section 4)
8. Mount routes in `apps/api/src/server.ts` under `/api`
9. Manually test with curl/httpie:
   - GET `/api/profile`
   - PATCH `/api/profile` with `{firstName: "test"}`
   - POST `/api/profile/weight` with `{weightKg: 82.4, measuredAt: "2026-04-22T07:00:00Z"}`
   - GET `/api/profile/weight?period=30d`
   - DELETE `/api/profile/weight/{id}`
10. **Commit**: `feat(api): profile endpoints + weight tracking with stats`

### Phase 3 — Frontend hooks and store

11. Create `apps/mobile/stores/profileStore.ts` (section 8)
12. Create `apps/mobile/utils/sessionsPerWeekTip.ts` (section 5.3)
13. Create the 6 hooks: `useProfile`, `useUpdateProfile`, `useWeightHistory`, `useAddWeight`, `useDeleteWeight`, `useLogout`
14. Add the i18n strings in `fr.ts` (section 10)
15. **Commit**: `feat(mobile): profile state management + hooks`

### Phase 4 — Atoms and shared components

16. Verify or create the `Stepper`, `Input`, `RadioItem` atoms if missing
17. Create `BottomSheetShell` molecule (section 7.2) — this is the foundation for all 6 edit modals
18. Create `ProfileRow` molecule with disabled state support
19. Create `CoachingTip` if not already existing
20. **Commit**: `feat(ui): bottom-sheet shell + profile row component`

### Phase 5 — Bottom-sheet modals

21. Create `EditFirstNameModal` — reference `/design/Tanren_Profile_Secondary_Screens.html` §01
22. Create `EditHeightModal` — reference §02
23. Create `EditTrainingLevelModal` — reference §05
24. Create `EditTrainingGoalModal` — reference §06
25. Create `EditSessionsPerWeekModal` with live `CoachingTip` — reference §07
26. **Commit**: `feat(ui): profile edit bottom-sheet modals`

### Phase 6 — Weight tracking screen

27. Create `WeightHero` organism — reference §03 hero block
28. Create `PeriodTabs` molecule — reference §03 period tabs
29. Create `WeightChart` organism with SVG line+area — reference §03 chart
30. Create `WeightChartStats` molecule — reference §03 min/avg/max row
31. Create `WeightEntry` molecule — reference §03 history list item
32. Create `QuickSetButton` atom — reference §04 quick-set buttons
33. Create `AddWeightModal` — reference §04
34. Create the screen `app/profile/weight.tsx` assembling all of the above
35. **Commit**: `feat(screens): weight tracking screen + add weight modal`

### Phase 7 — Health placeholder + logout

36. Create the screen `app/profile/health.tsx` with the disabled "Coming Soon" state (section 6.3)
37. Update the Profile landing's row component for "Santé & sync" to use `disabled` + `badge="soon"` props (section 1.2)
38. Create `LogoutConfirmModal` — reference §10
39. Wire up the "Se déconnecter" row on Profile landing to open `LogoutConfirmModal`
40. **Commit**: `feat(screens): health placeholder + logout confirm modal`

### Phase 8 — Profile landing wiring

41. In the existing Profile landing component (do not modify visuals), wire each row's `onPress` to `useProfileStore.openModal('...')` for the appropriate modal
42. Add a global `<ProfileModalsProvider>` at the app root that conditionally renders the active modal based on `activeModal` from the store
43. **Commit**: `feat(profile): wire landing rows to modals`

### Phase 9 — Polish + validation

44. Test the full flow: open Profile → tap each row → edit → save → see updated value
45. Test optimistic updates: edit firstName, observe instant UI update
46. Test Weight tracking: add a weight entry, switch periods, see chart update
47. Test Health & sync row: verify it's non-tappable and shows "Bientôt" badge; verify the placeholder screen renders correctly
48. Test logout: verify confirmation modal, then verify redirect to login + cache cleared
49. Test in dark + light mode for all 22 mockups
50. Run validation checklist (section 12)
51. **Commit**: `polish(profile): e2e tested + dark/light validated`

---

## 12 · Validation checklist

Before considering the feature complete:

### Data layer

- [ ] Zod schemas match exactly between mobile and api (imported from `@tanren/shared-schemas`)
- [ ] Prisma migration applied successfully
- [ ] `WeightEntry` table exists with `@@index([userId, measuredAt])`
- [ ] User table has `firstName`, `heightCm`, `trainingLevel`, `trainingGoal`, `sessionsPerWeek`
- [ ] Enums `TrainingLevel`, `TrainingGoal`, `WeightSource` are defined

### Backend

- [ ] GET `/api/profile` returns the profile in correct schema
- [ ] PATCH `/api/profile` accepts partial updates and validates with Zod
- [ ] POST `/api/profile/weight` rejects future-dated entries
- [ ] POST `/api/profile/weight` rejects weights outside [30, 300] kg range
- [ ] GET `/api/profile/weight?period=30d` returns entries sorted desc by `measuredAt`
- [ ] GET `/api/profile/weight` returns correct stats (min, avg, max, deltaKg, trendDirection)
- [ ] DELETE `/api/profile/weight/:id` returns 404 if entry doesn't belong to user
- [ ] All endpoints return 401 without JWT, 400 on invalid params

### Frontend — Edit modals

- [ ] All 6 bottom-sheets use `BottomSheetShell` for consistency
- [ ] Swipe-down on handle closes the modal
- [ ] Tap on backdrop closes the modal
- [ ] "Annuler" closes without saving
- [ ] "Enregistrer" triggers optimistic update + closes
- [ ] If save fails, the previous value is restored
- [ ] EditFirstName: text input is autofocused
- [ ] EditHeight: stepper increments by 1 cm
- [ ] EditLevel/Goal: radio items show check mark when selected
- [ ] EditSessions: coaching tip updates **live** as the stepper changes (2 → 3 → 4 etc.)

### Frontend — Weight tracking

- [ ] Weight Hero shows current weight in JetBrains Mono 56px
- [ ] Delta is colored (DOWN=green, UP=amber, FLAT=mute)
- [ ] Period tabs switch between 7d / 30d / 3m / 1y
- [ ] Chart renders with line + area fill in accent color
- [ ] Last data point has highlight halo
- [ ] Y-axis labels are computed from actual data range, not hardcoded
- [ ] Min in green, Max in amber, Avg neutral
- [ ] History list shows entries with date + weight + delta vs previous
- [ ] "+ Ajouter" opens AddWeightModal
- [ ] AddWeightModal stepper increments by 0.1 kg
- [ ] Quick-set buttons adjust by ±1 / ±0.5 / ±0.1 kg
- [ ] Date row defaults to "Aujourd'hui · {now}"
- [ ] Empty state shown when no entries

### Frontend — Health & sync (DISABLED)

- [ ] The "Santé & sync" row appears in Profile > Réglages section
- [ ] The row is **non-tappable** (no onPress reaction)
- [ ] The row shows a "Bientôt" badge (gray, not accent)
- [ ] The row's label has reduced opacity (0.5)
- [ ] No chevron is shown on the row
- [ ] The route `/profile/health` exists but renders only the placeholder
- [ ] Placeholder shows kanji 鍛 + "BIENTÔT DISPONIBLE" + description
- [ ] No toggles, no CTAs, no "Connect" button anywhere
- [ ] No HealthKit / Health Connect SDK is imported

### Frontend — Logout

- [ ] LogoutConfirmModal is centered (not bottom-sheet)
- [ ] Stamp 鍛 錬 visible at top
- [ ] "Annuler" closes the modal, no action
- [ ] "Déconnecter" (red button) triggers logout flow
- [ ] On logout success, redirect to `/login`
- [ ] On logout success, TanStack Query cache is cleared
- [ ] On logout failure (network error), local state is **still cleared**

### Visual

- [ ] All colors come from `useTheme()` (no hardcoded hex)
- [ ] Dark + light mode tested on all screens and modals
- [ ] Radius 0 everywhere except buttons (4) and bottom-sheet top corners (12)
- [ ] Kanji rendered in Noto Serif JP only
- [ ] No emoji anywhere in the UI
- [ ] No "wellness" vocabulary (journey, mindful, etc.)

### Out of scope verification

- [ ] **No Export Data row** in Profile landing
- [ ] No `/profile/export` route
- [ ] No `Export*` components
- [ ] No `/api/profile/export` endpoint

---

## 13 · Important notes

### 13.1 · Why Health & Sync is disabled, not hidden

Hiding the row entirely would lose the **product signal** that this feature is planned. By keeping the row visible with a "Bientôt" badge, users discover what's coming and don't feel the app is missing capabilities. This is a deliberate UX trade-off documented here so future devs don't "clean up" the disabled row by removing it.

### 13.2 · Weight measurement timezone handling

When the user adds a weight entry, store `measuredAt` as a UTC ISO string. The frontend should convert from local time to UTC before sending. When displaying, convert back to local time using `Intl.DateTimeFormat` with the user's locale.

**Common pitfall**: a user weighs in at 23:55 UTC, but is in Paris (UTC+2 in summer), so for them it's 01:55 next day. The chart should reflect their local time, not UTC. Always do timezone conversion at the display layer.

### 13.3 · Weight entry deduplication strategy

If the user adds two weight entries with the same `measuredAt` (down to the minute), the backend should **accept both** rather than rejecting one. This handles the case where the user weighs in twice (once on the scale, once on a smart scale that auto-syncs later). The history list will show both, and the user can manually delete one if desired.

If you want to add a "duplicate detection" UX hint later, do it client-side as a non-blocking warning, not server-side as a rejection.

### 13.4 · Stepper acceleration on long-press

For both the weight stepper and the height stepper, implement long-press acceleration: holding the button increments faster after 500ms. This is a quality-of-life feature standard on iOS native steppers.

```tsx
// Pseudo-code
const intervalRef = useRef<NodeJS.Timer>();
const onPressIn = () => {
  let interval = 200;
  const tick = () => {
    increment();
    interval = Math.max(50, interval * 0.85);  // accelerate
    intervalRef.current = setTimeout(tick, interval);
  };
  intervalRef.current = setTimeout(tick, 500);
};
const onPressOut = () => clearTimeout(intervalRef.current);
```

### 13.5 · WatermelonDB sync (deferred)

The hooks `useProfile`, `useWeightHistory`, etc. all use TanStack Query for network fetching. For V1, **don't add WatermelonDB persistence** for profile data — it's small enough to refetch on app launch. Weight entries could benefit from offline support eventually, but this is a separate feature to ship later.

If you want to add offline support: read from WatermelonDB first (instant), then fetch from API in background, merge by id, persist API result to WatermelonDB.

### 13.6 · Edge cases to test

- User with 0 weight entries — Weight screen shows empty state with "Aucune pesée"
- User with exactly 1 weight entry — `deltaKg` is 0, `trendDirection` is FLAT
- User changes period from 30d to 7d but has no entries in 7d window — show empty state, not error
- User long-presses + on stepper to go from 178 to 230 cm — UI should remain responsive
- User taps "Save" with no changes — modal should close gracefully (no API call needed)
- User's network drops mid-edit — optimistic update keeps the UI feeling responsive, then silently rolls back if server fails
- User deletes the only weight entry — Hero collapses to empty state, history list shows empty state

---

*Implement cleanly. Test each phase. Ship the profile feature with optimistic updates and weight tracking.*

*Tanren · Une rep après l'autre.*
