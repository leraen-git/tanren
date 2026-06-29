# TANREN — Implémentation de la feature Historique

> **Pour Claude Code.** Implémentation complète de la feature Historique de Tanren : frontend React Native, backend Fastify, schéma DB, algorithmes de PR detection et d'agrégation de volume.
>
> **Mockups de référence** : `/design/Tanren_History_Enhancements.html` — ouvre ce fichier avant de commencer, il contient 9 mockups (dark + light) qui décrivent l'état visuel final au pixel près.
>
> **Charte graphique** : respecte `/CLAUDE_Charter_Application.md` qui définit les tokens, composants et règles visuelles globales.

---

## 📋 Contenu de ce prompt

1. [Scope et deliverables](#1--scope-et-deliverables)
2. [Contrats de données partagés (Zod)](#2--contrats-de-données-partagés-zod)
3. [Schéma Prisma à mettre à jour](#3--schéma-prisma-à-mettre-à-jour)
4. [Backend — endpoints Fastify](#4--backend--endpoints-fastify)
5. [Algorithmes critiques](#5--algorithmes-critiques)
6. [Frontend — structure des écrans](#6--frontend--structure-des-écrans)
7. [Frontend — composants à créer](#7--frontend--composants-à-créer)
8. [Frontend — stores Zustand](#8--frontend--stores-zustand)
9. [Frontend — hooks custom](#9--frontend--hooks-custom)
10. [i18n — strings à ajouter](#10--i18n--strings-à-ajouter)
11. [Ordre d'implémentation](#11--ordre-dimplémentation)
12. [Checklist de validation](#12--checklist-de-validation)

---

## 1 · Scope et deliverables

### ✅ Ce que tu implémentes

- **1 écran principal** : `app/(tabs)/history.tsx` avec 2 modes (Liste + Stats) via segmented control
- **1 écran de détail** : `app/session/[id].tsx` (Session Detail — différent de `session/preview/[id]` qui existe déjà)
- **1 écran de recherche** : `app/history/search.tsx` (modal plein écran)
- **2 empty states** intégrés dans l'écran History (global + filtré)
- **Backend** : 5 endpoints Fastify (`/sessions`, `/sessions/:id`, `/sessions/search`, `/stats/heatmap`, `/stats/weekly-volume`)
- **DB** : migration Prisma pour ajouter le champ `isPR` sur `SessionSet` (si pas déjà présent) + index de performance
- **Algorithmes** : PR detection, grouping temporel, heatmap levels, weekly volume aggregation
- **Stores** : un `historyStore` Zustand pour l'état UI (filters, view mode, search)
- **Hooks** : `useSessionHistory`, `useSessionDetail`, `useHistoryStats`

### ❌ Hors scope (déjà en place ou prévu ailleurs)

- Le système d'auth (JWT)
- Le schéma Prisma de base (déjà défini dans le master file)
- Le ShareCard (déjà implémenté dans Session Sharing)
- La logique de création de session (workout preview → active → recap)
- La sync WatermelonDB (gérée par un hook partagé `useSync`)

---

## 2 · Contrats de données partagés (Zod)

Crée ces schémas dans `packages/shared-schemas/src/history.ts`. Ils sont utilisés à la fois par le mobile et le backend — **identité stricte garantie**.

```ts
// packages/shared-schemas/src/history.ts
import { z } from 'zod';

// === Base types ===

export const MuscleGroupEnum = z.enum([
  'CHEST', 'BACK', 'SHOULDERS', 'BICEPS', 'TRICEPS',
  'QUADRICEPS', 'HAMSTRINGS', 'GLUTES', 'CALVES', 'CORE',
  'FULL_BODY',
]);
export type MuscleGroup = z.infer<typeof MuscleGroupEnum>;

export const SessionStatusEnum = z.enum([
  'IN_PROGRESS', 'DONE', 'ABANDONED',
]);
export type SessionStatus = z.infer<typeof SessionStatusEnum>;

// === Filter query params ===

export const HistoryPeriodEnum = z.enum([
  '1w', '1m', '3m', '1y', 'all',
]);
export type HistoryPeriod = z.infer<typeof HistoryPeriodEnum>;

export const HistoryFiltersSchema = z.object({
  period: HistoryPeriodEnum.default('1m'),
  muscleGroup: MuscleGroupEnum.optional(),  // undefined = "Tous"
  search: z.string().max(64).optional(),
  cursor: z.string().cuid().optional(),      // for pagination
  limit: z.number().int().min(1).max(50).default(20),
});
export type HistoryFilters = z.infer<typeof HistoryFiltersSchema>;

// === Session list item (light version for list) ===

export const SessionListItemSchema = z.object({
  id: z.string().cuid(),
  workoutId: z.string().cuid().nullable(),
  workoutName: z.string(),                   // denormalized for perf
  startedAt: z.string().datetime(),
  endedAt: z.string().datetime().nullable(),
  durationSec: z.number().int().nullable(),
  totalVolumeKg: z.number().nullable(),
  seriesCount: z.number().int(),
  muscleGroups: z.array(MuscleGroupEnum),
  status: SessionStatusEnum,
  prCount: z.number().int().min(0),          // number of PRs in this session
});
export type SessionListItem = z.infer<typeof SessionListItemSchema>;

// === Session detail (full version with exercises + sets) ===

export const SessionSetDetailSchema = z.object({
  id: z.string().cuid(),
  setIndex: z.number().int().min(1),
  reps: z.number().int().min(0),
  weightKg: z.number(),
  restSec: z.number().int().nullable(),
  isPR: z.boolean(),
  completedAt: z.string().datetime(),
});
export type SessionSetDetail = z.infer<typeof SessionSetDetailSchema>;

export const SessionExerciseSchema = z.object({
  exerciseId: z.string().cuid(),
  exerciseName: z.string(),
  orderIndex: z.number().int(),
  volumeKg: z.number(),                      // sum of reps × weight across sets
  sets: z.array(SessionSetDetailSchema),
});
export type SessionExercise = z.infer<typeof SessionExerciseSchema>;

export const SessionDetailSchema = z.object({
  id: z.string().cuid(),
  workoutId: z.string().cuid().nullable(),
  workoutName: z.string(),
  startedAt: z.string().datetime(),
  endedAt: z.string().datetime().nullable(),
  durationSec: z.number().int().nullable(),
  totalVolumeKg: z.number().nullable(),
  seriesCount: z.number().int(),
  muscleGroups: z.array(MuscleGroupEnum),
  status: SessionStatusEnum,
  exercises: z.array(SessionExerciseSchema),
  prs: z.array(z.object({
    exerciseId: z.string().cuid(),
    exerciseName: z.string(),
    reps: z.number().int(),
    weightKg: z.number(),
  })),
});
export type SessionDetail = z.infer<typeof SessionDetailSchema>;

// === List response (paginated) ===

export const HistoryListResponseSchema = z.object({
  sessions: z.array(SessionListItemSchema),
  summary: z.object({
    count: z.number().int(),
    totalVolumeKg: z.number(),
  }),
  pagination: z.object({
    nextCursor: z.string().cuid().nullable(),
    hasMore: z.boolean(),
  }),
});
export type HistoryListResponse = z.infer<typeof HistoryListResponseSchema>;

// === Stats ===

export const HeatmapCellSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),  // YYYY-MM-DD
  volumeKg: z.number(),
  level: z.number().int().min(0).max(4),
});
export type HeatmapCell = z.infer<typeof HeatmapCellSchema>;

export const HeatmapResponseSchema = z.object({
  cells: z.array(HeatmapCellSchema),      // 84 cells = 12 weeks × 7 days
  startDate: z.string(),
  endDate: z.string(),
  maxVolumeKg: z.number(),
});
export type HeatmapResponse = z.infer<typeof HeatmapResponseSchema>;

export const WeeklyVolumeSchema = z.object({
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  volumeKg: z.number(),
  sessionCount: z.number().int(),
});
export type WeeklyVolume = z.infer<typeof WeeklyVolumeSchema>;

export const StatsResponseSchema = z.object({
  period: HistoryPeriodEnum,
  totalVolumeKg: z.number(),
  previousPeriodVolumeKg: z.number(),
  trendPercent: z.number(),                 // e.g. 8.2 for +8.2%
  heatmap: HeatmapResponseSchema,
  weeklyVolume: z.array(WeeklyVolumeSchema),
  recentPRs: z.array(z.object({
    sessionId: z.string().cuid(),
    exerciseId: z.string().cuid(),
    exerciseName: z.string(),
    reps: z.number().int(),
    weightKg: z.number(),
    achievedAt: z.string().datetime(),
  })),
});
export type StatsResponse = z.infer<typeof StatsResponseSchema>;
```

---

## 3 · Schéma Prisma à mettre à jour

Le schéma de base (depuis le master file) a déjà `Session`, `SessionSet`, etc. Assure-toi que les champs suivants sont présents, sinon ajoute-les via migration :

```prisma
model Session {
  // ... champs existants
  totalVolumeKg Decimal?  @db.Decimal(10,1)  // pré-calculé au save
  seriesCount   Int       @default(0)       // pré-calculé au save

  @@index([userId, startedAt])  // CRITIQUE pour la performance de list
  @@index([userId, status])
}

model SessionSet {
  // ... champs existants
  isPR Boolean @default(false)               // CRITIQUE : calculé au save

  @@index([sessionId, exerciseId])
  @@index([exerciseId, isPR])                // pour retrouver les PR rapidement
}
```

**Migration à créer** :

```bash
npx prisma migrate dev --name history_perf_indexes
```

Si `totalVolumeKg`, `seriesCount`, ou `isPR` n'existent pas, ajoute-les avec les défauts ci-dessus. Les données existantes doivent être backfillées par un script (voir section 5.4).

---

## 4 · Backend — endpoints Fastify

### 4.1 · Structure des routes

Crée `apps/api/src/routes/history.ts` avec les 5 endpoints suivants. Chacun :
- Valide les query params avec le schéma Zod correspondant
- Retourne le schéma Zod de réponse
- Utilise `userId` extrait du JWT (pas en query)
- Retourne `401` si pas de JWT, `400` si params invalides, `500` si erreur serveur

```ts
// apps/api/src/routes/history.ts
import { FastifyPluginAsync } from 'fastify';
import {
  HistoryFiltersSchema,
  HistoryListResponseSchema,
  SessionDetailSchema,
  StatsResponseSchema,
} from '@tanren/shared-schemas';
import {
  listSessions,
  getSessionDetail,
  searchSessions,
  computeStats,
} from '../services/history';

export const historyRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', app.authenticate);  // JWT required on all routes

  // GET /sessions?period=1m&muscleGroup=CHEST&cursor=xxx&limit=20
  app.get('/sessions', async (req, reply) => {
    const filters = HistoryFiltersSchema.parse(req.query);
    const result = await listSessions(req.user.id, filters);
    return HistoryListResponseSchema.parse(result);
  });

  // GET /sessions/:id
  app.get('/sessions/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const session = await getSessionDetail(req.user.id, id);
    if (!session) return reply.code(404).send({ error: 'Not found' });
    return SessionDetailSchema.parse(session);
  });

  // GET /sessions/search?q=push
  app.get('/sessions/search', async (req, reply) => {
    const { q } = req.query as { q?: string };
    if (!q || q.length < 2) return { sessions: [] };
    const sessions = await searchSessions(req.user.id, q);
    return { sessions };
  });

  // GET /stats?period=3m
  app.get('/stats', async (req, reply) => {
    const { period = '3m' } = req.query as { period?: string };
    const stats = await computeStats(req.user.id, period as any);
    return StatsResponseSchema.parse(stats);
  });
};
```

Monte-les dans `apps/api/src/server.ts` sous `/api/history`.

### 4.2 · Service layer

Crée `apps/api/src/services/history.ts` avec les fonctions :

- `listSessions(userId, filters)` → paginée, agrège summary, retourne `HistoryListResponse`
- `getSessionDetail(userId, sessionId)` → joint Session + SessionSet + Exercise, retourne `SessionDetail | null`
- `searchSessions(userId, query)` → full-text sur `workoutName`, limité à 10 résultats
- `computeStats(userId, period)` → retourne `StatsResponse` avec heatmap + weekly + PRs

Implémentations détaillées en section 5 (algorithmes).

### 4.3 · Query optimizations

**Pour `listSessions`** :

```ts
const sessions = await prisma.session.findMany({
  where: {
    userId,
    startedAt: { gte: periodStart },
    status: 'DONE',  // on exclut IN_PROGRESS et ABANDONED par défaut
    ...(muscleGroup && {
      workout: { muscleGroups: { has: muscleGroup } },
    }),
  },
  orderBy: { startedAt: 'desc' },
  take: limit + 1,  // +1 pour détecter hasMore
  cursor: cursor ? { id: cursor } : undefined,
  skip: cursor ? 1 : 0,
  select: {
    id: true,
    workoutId: true,
    startedAt: true,
    endedAt: true,
    durationSec: true,
    totalVolumeKg: true,
    seriesCount: true,
    status: true,
    workout: {
      select: { name: true, muscleGroups: true },
    },
    sets: {
      where: { isPR: true },
      select: { id: true },
    },
  },
});
```

Cette query est **O(log n + limit)** grâce à l'index `@@index([userId, startedAt])`.

---

## 5 · Algorithmes critiques

### 5.1 · PR detection (au save d'une session)

**Quand** : à la fin d'une session, quand le user tape "Terminer la séance". Déclenché côté backend dans le handler de `POST /sessions/:id/complete`.

**Logique** : un set est un PR si, pour un exercice donné, il bat le précédent meilleur `weightKg × reps` du user.

Plusieurs définitions de PR possibles. On utilise la plus simple et utilisée : **"1RM estimé par formule Epley"**.

```ts
// apps/api/src/services/prDetection.ts

/**
 * Epley formula for estimated 1RM:
 *   1RM ≈ weight × (1 + reps / 30)
 * Good approximation for reps 1-10.
 */
function estimatedOneRM(weightKg: number, reps: number): number {
  if (reps === 0) return 0;
  if (reps === 1) return weightKg;
  return weightKg * (1 + reps / 30);
}

/**
 * Mark PRs on a session's sets.
 * Called after all sets of a session are saved, before computing totals.
 */
export async function detectAndMarkPRs(sessionId: string): Promise<number> {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { sets: { include: { exercise: true } } },
  });
  if (!session) return 0;

  let prCount = 0;

  // Group sets by exercise within this session
  const setsByExercise = new Map<string, typeof session.sets>();
  for (const set of session.sets) {
    const arr = setsByExercise.get(set.exerciseId) ?? [];
    arr.push(set);
    setsByExercise.set(set.exerciseId, arr);
  }

  for (const [exerciseId, sets] of setsByExercise) {
    // Find user's previous best for this exercise (BEFORE this session)
    const previousBest = await prisma.sessionSet.findFirst({
      where: {
        exercise: { id: exerciseId },
        session: {
          userId: session.userId,
          id: { not: sessionId },          // exclude current session
          status: 'DONE',
          startedAt: { lt: session.startedAt },
        },
      },
      orderBy: {
        // Rough sort: weight desc, reps desc. We'll refine by computing 1RM in memory.
        weightKg: 'desc',
      },
      take: 20,                            // grab top candidates, then compute 1RM
    });

    const previousBest1RM = previousBest
      ? Math.max(...[previousBest].map(s => estimatedOneRM(s.weightKg.toNumber(), s.reps)))
      : 0;

    // Find the best set of this session for this exercise
    let bestSetOfSession: (typeof sets)[0] | null = null;
    let bestSessionRM = 0;
    for (const set of sets) {
      const rm = estimatedOneRM(set.weightKg.toNumber(), set.reps);
      if (rm > bestSessionRM) {
        bestSessionRM = rm;
        bestSetOfSession = set;
      }
    }

    // If this session's best beats the previous best, mark it as PR
    if (bestSetOfSession && bestSessionRM > previousBest1RM) {
      await prisma.sessionSet.update({
        where: { id: bestSetOfSession.id },
        data: { isPR: true },
      });
      prCount++;
    }
  }

  return prCount;
}
```

**Appelle cette fonction** depuis le handler `POST /sessions/:id/complete` AVANT de calculer `totalVolumeKg` et `seriesCount`.

### 5.2 · Grouping temporel (frontend)

**Quand** : dans l'écran History, les sessions sont regroupées par période temporelle relative.

```ts
// apps/mobile/utils/historyGrouping.ts
import { SessionListItem } from '@tanren/shared-schemas';

export type SessionGroup = {
  key: string;           // unique key for FlatList sections
  label: string;         // "Cette semaine" / "Semaine dernière" / "Mars 2026"
  count: number;
  sessions: SessionListItem[];
};

export function groupSessionsByTime(
  sessions: SessionListItem[],
  now: Date = new Date()
): SessionGroup[] {
  const groups: Map<string, SessionGroup> = new Map();

  // Start of this week (Monday 00:00 local time)
  const startOfThisWeek = new Date(now);
  startOfThisWeek.setHours(0, 0, 0, 0);
  const dayOfWeek = (startOfThisWeek.getDay() + 6) % 7;  // Mon=0, Sun=6
  startOfThisWeek.setDate(startOfThisWeek.getDate() - dayOfWeek);

  for (const s of sessions) {
    const d = new Date(s.startedAt);
    let key: string;
    let label: string;

    const diffMs = startOfThisWeek.getTime() - d.getTime();
    const weeksAgo = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000));

    if (d >= startOfThisWeek) {
      key = 'week-0';
      label = 'Cette semaine';
    } else if (weeksAgo === 0) {
      key = 'week-1';
      label = 'Semaine dernière';
    } else if (weeksAgo === 1) {
      key = 'week-2';
      label = 'Il y a 2 semaines';
    } else if (weeksAgo === 2) {
      key = 'week-3';
      label = 'Il y a 3 semaines';
    } else {
      // Group by month for older sessions
      const month = d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
      key = `month-${d.getFullYear()}-${d.getMonth()}`;
      label = month.charAt(0).toUpperCase() + month.slice(1);
    }

    const existing = groups.get(key);
    if (existing) {
      existing.sessions.push(s);
      existing.count++;
    } else {
      groups.set(key, { key, label, count: 1, sessions: [s] });
    }
  }

  // Preserve insertion order (which is already chronological desc from API)
  return Array.from(groups.values());
}
```

Utilise cette fonction dans `useSessionHistory` avant de passer les données à `SectionList`.

### 5.3 · Heatmap levels (backend)

**Logique** : chaque cellule (jour) a un niveau 0-4 selon son volume relatif à la semaine la plus intense de la période.

```ts
// apps/api/src/services/stats.ts

export async function computeHeatmap(
  userId: string,
  periodStart: Date,
  periodEnd: Date
): Promise<HeatmapResponse> {
  // Query all daily volumes in period
  const rows = await prisma.$queryRaw<{ date: string; volume: number }[]>`
    SELECT DATE(started_at) as date, SUM(total_volume_kg) as volume
    FROM sessions
    WHERE user_id = ${userId}
      AND started_at >= ${periodStart}
      AND started_at < ${periodEnd}
      AND status = 'DONE'
    GROUP BY DATE(started_at)
  `;

  const volumeByDate = new Map<string, number>();
  for (const row of rows) {
    volumeByDate.set(row.date, Number(row.volume));
  }

  // Compute max weekly volume (to normalize levels)
  const weeklyTotals = new Map<string, number>();
  for (const [date, vol] of volumeByDate) {
    const d = new Date(date);
    const monday = new Date(d);
    const dayOfWeek = (monday.getDay() + 6) % 7;
    monday.setDate(monday.getDate() - dayOfWeek);
    const weekKey = monday.toISOString().slice(0, 10);
    weeklyTotals.set(weekKey, (weeklyTotals.get(weekKey) ?? 0) + vol);
  }
  const maxWeekly = Math.max(...weeklyTotals.values(), 1);
  const avgDailyThreshold = maxWeekly / 7;  // Distribute max week across 7 days

  // Generate all cells in the period
  const cells: HeatmapCell[] = [];
  const cursor = new Date(periodStart);
  while (cursor <= periodEnd) {
    const dateStr = cursor.toISOString().slice(0, 10);
    const volumeKg = volumeByDate.get(dateStr) ?? 0;

    let level: 0 | 1 | 2 | 3 | 4;
    if (volumeKg === 0) level = 0;
    else if (volumeKg < avgDailyThreshold * 0.5) level = 1;
    else if (volumeKg < avgDailyThreshold * 1.0) level = 2;
    else if (volumeKg < avgDailyThreshold * 1.5) level = 3;
    else level = 4;

    cells.push({ date: dateStr, volumeKg, level });
    cursor.setDate(cursor.getDate() + 1);
  }

  return {
    cells,
    startDate: periodStart.toISOString().slice(0, 10),
    endDate: periodEnd.toISOString().slice(0, 10),
    maxVolumeKg: Math.max(...volumeByDate.values(), 0),
  };
}
```

**Pour le mockup actuel** : 12 semaines = 84 cellules. Période par défaut = 12 semaines = ~3 mois.

### 5.4 · Script de backfill (data migration one-off)

Si le champ `isPR` ou `totalVolumeKg` est ajouté après que des sessions existent, tu dois backfiller.

Crée `apps/api/prisma/scripts/backfill-history.ts` :

```ts
import { PrismaClient } from '@prisma/client';
import { detectAndMarkPRs } from '../src/services/prDetection';

const prisma = new PrismaClient();

async function main() {
  const sessions = await prisma.session.findMany({
    where: { status: 'DONE' },
    orderBy: { startedAt: 'asc' },          // oldest first — PR detection is historical
    select: { id: true, sets: true },
  });

  console.log(`Backfilling ${sessions.length} sessions...`);

  for (const s of sessions) {
    // Compute totals
    const totalVolume = s.sets.reduce(
      (sum, set) => sum + Number(set.weightKg) * set.reps,
      0
    );

    await prisma.session.update({
      where: { id: s.id },
      data: {
        totalVolumeKg: totalVolume,
        seriesCount: s.sets.length,
      },
    });

    // Detect PRs in chronological order
    await detectAndMarkPRs(s.id);
  }

  console.log('Backfill complete.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

Lance-le une fois avec `pnpm tsx apps/api/prisma/scripts/backfill-history.ts`. **Idempotent** : tu peux le relancer sans conséquence.

---

## 6 · Frontend — structure des écrans

### 6.1 · `app/(tabs)/history.tsx`

L'écran principal de la tab Historique. Structure :

```
<Screen showKanji kanjiChar="錬">
  <ScreenHeader title="Historique" rightAction={<SearchButton />} />

  {empty && !sessions.length ? (
    <EmptyStateGlobal />      // Cas 3a : aucune session ever
  ) : (
    <>
      <ViewToggle value={viewMode} onChange={setViewMode} />

      <FiltersRow period={period} onPeriodChange={setPeriod} />
      <FiltersRow muscleGroup={muscleGroup} onChange={setMuscleGroup} />

      {viewMode === 'list' ? (
        <HistoryListView
          sessions={sessions}
          summary={summary}
          onSessionPress={(id) => router.push(`/session/${id}`)}
        />
      ) : (
        <HistoryStatsView stats={stats} onPRPress={(prId) => /* navigate */} />
      )}

      {filteredEmpty && <EmptyStateFiltered onReset={resetFilters} />}
    </>
  )}
</Screen>
```

### 6.2 · `app/session/[id].tsx`

L'écran Session Detail (différent de Session Preview qui est `app/session/preview/[id].tsx`).

```
<Screen showKanji kanjiChar="鍛">
  <ScreenHeader
    onBack={() => router.back()}
    title="Séance"
    rightAction={<SessionMenuButton />}
  />

  <SessionHero session={session} />        // Hero rouge avec stats

  {session.prs.length > 0 && (
    <PRBanner prs={session.prs} />
  )}

  <SecLabel>Exercices</SecLabel>
  {session.exercises.map((ex) => (
    <ExerciseBlock key={ex.exerciseId} exercise={ex} />
  ))}

  <View style={{ flexDirection: 'row', gap: 8, marginTop: 20 }}>
    <Button variant="outline" onPress={onReplay}>Rejouer</Button>
    <Button variant="primary" onPress={onShare}>Partager</Button>
  </View>
</Screen>
```

### 6.3 · `app/history/search.tsx`

Modal plein écran pour la recherche. Structure :

```
<Screen>
  <ScreenHeader
    title="Rechercher"
    rightAction={<CloseButton />}
  />

  <SearchInput
    value={query}
    onChangeText={setQuery}
    autoFocus
    placeholder="Nom de séance..."
  />

  {query.length < 2 ? (
    <EmptyHint>Tape au moins 2 caractères.</EmptyHint>
  ) : loading ? (
    <LoadingSpinner />
  ) : results.length === 0 ? (
    <EmptyResults>Aucune séance trouvée pour "{query}".</EmptyResults>
  ) : (
    <FlatList
      data={results}
      renderItem={({ item }) => (
        <SessionCard session={item} onPress={() => router.push(`/session/${item.id}`)} />
      )}
    />
  )}
</Screen>
```

**Debounce la recherche** à 300ms pour ne pas spammer l'API à chaque frappe.

---

## 7 · Frontend — composants à créer

Tous les composants suivants doivent utiliser le design system existant (`useTheme()`, tokens, etc.) et respecter la charte dans `CLAUDE_Charter_Application.md`.

### 7.1 · `ViewToggle` (atom)

Segmented control à 2 options. Utilisé en haut de History.

```tsx
type ViewToggleProps = {
  value: 'list' | 'stats';
  onChange: (value: 'list' | 'stats') => void;
};
```

**Style** : fond surface2, 3px padding, chaque option padding 8px 10px font 10px uppercase. Option active : bg bg principal + box-shadow 0 0 0 1px border (élévation subtile).

### 7.2 · `FiltersRow` (molecule)

Un wrapper `ScrollView horizontal` avec des `FilterChip` dedans.

```tsx
type FiltersRowProps<T extends string> = {
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (v: T) => void;
};
```

### 7.3 · `SessionCard` (organism)

La card d'une session dans la liste. Props :

```tsx
type SessionCardProps = {
  session: SessionListItem;
  onPress: () => void;
  onLongPress?: () => void;   // for contextual menu (future)
};
```

**Détails visuels** :
- Border 1px border (defaut) ou border-left 3px accent si `prCount > 0`
- PR badge en top-right si `prCount > 0` : trophy icon + "N PR"
- Status badge en bottom-right (Terminée/Incomplète)
- Muscle chips mini (pill 8px uppercase)

### 7.4 · `SectionHeaderTemporal` (molecule)

Header entre les groupes temporels dans History List.

```tsx
type SectionHeaderTemporalProps = {
  label: string;       // "Cette semaine"
  count: number;       // 3
};
```

**Style** : texte accent uppercase letter-spacing 0.3em + border-bottom 2px accent + count à droite en small textMute.

### 7.5 · `Heatmap` (organism, SVG ou View grid)

Composant le plus complexe de la feature. Implémente avec `react-native-svg` ou grid `<View>`.

```tsx
type HeatmapProps = {
  cells: HeatmapCell[];       // 84 cells = 12 weeks × 7 days
  onCellPress?: (cell: HeatmapCell) => void;
};
```

**Layout** :
- Grid 7 rows × 12 columns
- Day labels à gauche (L/M/M/J/V/S/D)
- Month labels au-dessus
- Cellules 12×12 avec 3px gap
- Couleurs par niveau (0 → 4) : `surface2`, `rgba(accent, 0.2)`, `rgba(accent, 0.4)`, `rgba(accent, 0.7)`, `accent`
- Légende "Moins ▢▢▢▢▢ Plus" en bas

**Optimisation** : la heatmap est statique une fois rendue. Utilise `React.memo` pour éviter les re-renders inutiles.

### 7.6 · `WeeklyVolumeChart` (organism)

Bar chart des 12 dernières semaines.

```tsx
type WeeklyVolumeChartProps = {
  weeks: WeeklyVolume[];
};
```

**Layout** :
- Container hauteur 100px
- Bars flex-1 avec gap 4px
- Chaque bar : bg surface2 semi-transparent + border-top 2px accent
- La dernière bar (semaine en cours) : couleur accent plein
- Labels en dessous : "−12 / −11 / ... / −1"

**Normalisation** : hauteur max = 100%, calculée sur le max des 12 semaines.

### 7.7 · `PRRecordItem` (molecule)

Item dans la liste "Records récents" de Stats.

```tsx
type PRRecordItemProps = {
  pr: {
    sessionId: string;
    exerciseId: string;
    exerciseName: string;
    reps: number;
    weightKg: number;
    achievedAt: string;
  };
  onPress: () => void;
};
```

**Style** :
- Padding 10px 0, border-bottom border
- Icon carré 28×28 border accent + trophy rouge inside
- Nom exercice bold uppercase + date relative textMute
- Valeur PR à droite : weightKg en 16px Black accent

### 7.8 · `SessionHero` (organism)

Le hero rouge en haut de Session Detail.

```tsx
type SessionHeroProps = {
  session: SessionDetail;
};
```

**Layout** :
- Border 1px accent + CornerAccent tl (12×12)
- Kanji 鍛 錬 stamp (10px accent letter-spacing 0.4em)
- Nom séance 24px Black uppercase
- Date complète (ex: "Ven 18 avril · 18h12")
- Grille stats 3 colonnes (Durée / Volume / Séries)
- Muscle chips

### 7.9 · `PRBanner` (organism)

Banner affiché dans Session Detail si `session.prs.length > 0`.

```tsx
type PRBannerProps = {
  prs: SessionDetail['prs'];
};
```

**Style** :
- Bg rgba(accent, 0.08) + border-left 3px accent
- Kanji 鍛 22px accent
- Titre "N Records battus" accent uppercase
- Détail : noms exercices + valeurs en textDim

### 7.10 · `ExerciseBlock` (organism)

Bloc d'exercice dans Session Detail.

```tsx
type ExerciseBlockProps = {
  exercise: SessionExercise;
};
```

**Layout** :
- Header : numéro arabe accent + nom exercice bold uppercase + volume total de l'exo à droite
- Grille 4 colonnes (# / Reps / Charge / Repos) avec header row en surface2
- Cellules valeurs en **JetBrains Mono** 12px bold
- Cellules PR : couleur accent + mini badge "PR" à côté de la valeur

### 7.11 · `EmptyStateGlobal` (organism)

Écran empty vide d'historique (3a dans les mockups).

```tsx
type EmptyStateGlobalProps = {
  onStartSession: () => void;
};
```

**Layout** : vertical centré, kanji 錬 96px opacity 85%, label accent, titre gros, description, CTA primary.

### 7.12 · `EmptyStateFiltered` (organism)

Empty state quand filtres actifs mais pas de match (3b).

```tsx
type EmptyStateFilteredProps = {
  onReset: () => void;
};
```

**Layout** : plus petit, icon carré border, titre court, desc, link ghost rouge "Réinitialiser".

---

## 8 · Frontend — stores Zustand

### 8.1 · `historyStore`

Gère l'état UI de la tab History (filters, view mode, etc.). Pas de données persistées — elles viennent des hooks.

```ts
// apps/mobile/stores/historyStore.ts
import { create } from 'zustand';
import { HistoryPeriod, MuscleGroup } from '@tanren/shared-schemas';

type ViewMode = 'list' | 'stats';

type HistoryState = {
  viewMode: ViewMode;
  period: HistoryPeriod;
  muscleGroup: MuscleGroup | null;
  setViewMode: (v: ViewMode) => void;
  setPeriod: (p: HistoryPeriod) => void;
  setMuscleGroup: (m: MuscleGroup | null) => void;
  resetFilters: () => void;
};

export const useHistoryStore = create<HistoryState>((set) => ({
  viewMode: 'list',
  period: '1m',
  muscleGroup: null,
  setViewMode: (viewMode) => set({ viewMode }),
  setPeriod: (period) => set({ period }),
  setMuscleGroup: (muscleGroup) => set({ muscleGroup }),
  resetFilters: () => set({ period: '1m', muscleGroup: null }),
}));
```

---

## 9 · Frontend — hooks custom

### 9.1 · `useSessionHistory`

Fetch paginé des sessions avec filters appliqués.

```ts
// apps/mobile/hooks/useSessionHistory.ts
import { useInfiniteQuery } from '@tanstack/react-query';
import { useHistoryStore } from '../stores/historyStore';
import { api } from '../api/client';
import { HistoryListResponse } from '@tanren/shared-schemas';
import { groupSessionsByTime } from '../utils/historyGrouping';

export function useSessionHistory() {
  const { period, muscleGroup } = useHistoryStore();

  const query = useInfiniteQuery({
    queryKey: ['history', 'sessions', period, muscleGroup],
    queryFn: async ({ pageParam }) => {
      const res = await api.get<HistoryListResponse>('/history/sessions', {
        params: { period, muscleGroup, cursor: pageParam, limit: 20 },
      });
      return res.data;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.pagination.nextCursor ?? undefined,
  });

  const sessions = query.data?.pages.flatMap((p) => p.sessions) ?? [];
  const summary = query.data?.pages[0]?.summary;
  const groupedSessions = groupSessionsByTime(sessions);

  return {
    groupedSessions,
    summary,
    isLoading: query.isLoading,
    isFetchingNextPage: query.isFetchingNextPage,
    hasNextPage: query.hasNextPage,
    fetchNextPage: query.fetchNextPage,
    refetch: query.refetch,
    isEmpty: !query.isLoading && sessions.length === 0,
  };
}
```

### 9.2 · `useSessionDetail`

Fetch d'une session spécifique.

```ts
// apps/mobile/hooks/useSessionDetail.ts
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { SessionDetail } from '@tanren/shared-schemas';

export function useSessionDetail(sessionId: string) {
  return useQuery({
    queryKey: ['history', 'session', sessionId],
    queryFn: async () => {
      const res = await api.get<SessionDetail>(`/history/sessions/${sessionId}`);
      return res.data;
    },
    staleTime: 5 * 60 * 1000,   // 5 min, detail rarely changes
  });
}
```

### 9.3 · `useHistoryStats`

Fetch des stats (heatmap + weekly + PRs).

```ts
// apps/mobile/hooks/useHistoryStats.ts
import { useQuery } from '@tanstack/react-query';
import { useHistoryStore } from '../stores/historyStore';
import { api } from '../api/client';
import { StatsResponse } from '@tanren/shared-schemas';

export function useHistoryStats() {
  const { period } = useHistoryStore();

  return useQuery({
    queryKey: ['history', 'stats', period],
    queryFn: async () => {
      const res = await api.get<StatsResponse>('/history/stats', {
        params: { period },
      });
      return res.data;
    },
    staleTime: 60 * 1000,  // 1 min
  });
}
```

### 9.4 · `useSessionSearch`

Recherche debouncée.

```ts
// apps/mobile/hooks/useSessionSearch.ts
import { useQuery } from '@tanstack/react-query';
import { useDebounce } from './useDebounce';
import { api } from '../api/client';
import { SessionListItem } from '@tanren/shared-schemas';

export function useSessionSearch(query: string) {
  const debounced = useDebounce(query, 300);

  return useQuery({
    queryKey: ['history', 'search', debounced],
    queryFn: async () => {
      if (debounced.length < 2) return { sessions: [] };
      const res = await api.get<{ sessions: SessionListItem[] }>(
        '/history/sessions/search',
        { params: { q: debounced } }
      );
      return res.data;
    },
    enabled: debounced.length >= 2,
  });
}
```

---

## 10 · i18n — strings à ajouter

Ajoute ces entrées dans `apps/mobile/locales/fr.ts` :

```ts
// locales/fr.ts
export const fr = {
  // ... strings existants

  history: {
    tabTitle: 'Historique',
    viewList: 'Liste',
    viewStats: 'Stats',

    // Filters
    filterPeriod1w: '1 sem.',
    filterPeriod1m: '1 mois',
    filterPeriod3m: '3 mois',
    filterPeriod1y: '1 an',
    filterPeriodAll: 'Tout',
    filterMuscleAll: 'Tous',
    filterMusclePectoraux: 'Pectoraux',
    filterMuscleDos: 'Dos',
    filterMuscleJambes: 'Jambes',
    filterMuscleEpaules: 'Épaules',
    filterMuscleBras: 'Bras',
    filterMuscleAbdos: 'Abdos',

    // Summary
    summaryCount: (n: number) => n === 1 ? '1 séance' : `${n} séances`,
    summaryVolume: 'Volume total',

    // Temporal groups
    groupThisWeek: 'Cette semaine',
    groupLastWeek: 'Semaine dernière',
    groupWeeksAgo: (n: number) => `Il y a ${n} semaines`,

    // Session card
    prBadge: (n: number) => n === 1 ? '1 PR' : `${n} PR`,
    statusDone: 'Terminée',
    statusIncomplete: 'Incomplète',

    // Search
    searchTitle: 'Rechercher',
    searchPlaceholder: 'Nom de séance...',
    searchMinChars: 'Tape au moins 2 caractères.',
    searchNoResults: (q: string) => `Aucune séance trouvée pour "${q}".`,

    // Empty states
    emptyGlobalLabel: 'Historique vide',
    emptyGlobalTitle: "Pas encore\nd'historique",
    emptyGlobalDesc: 'Termine ta première séance et elle apparaîtra ici. Rep après rep, ton histoire se construit.',
    emptyGlobalCTA: 'Commencer une séance',

    emptyFilteredTitle: 'Pas de séance\npour ce filtre',
    emptyFilteredDesc: "Essaie d'élargir la période ou change de groupe musculaire.",
    emptyFilteredReset: 'Réinitialiser les filtres',

    // Stats
    statsVolumeTotal: 'Volume total',
    statsActivity: 'Activité',
    statsWeeklyVolume: 'Volume hebdomadaire',
    statsRecentPRs: 'Records récents',
    statsTrendUp: (pct: string) => `↑ +${pct}% vs période précédente`,
    statsTrendFlat: (pct: string) => `= ${pct}% vs période précédente`,
    statsTrendDown: (pct: string) => `↓ −${pct}% vs période précédente`,
    heatmapLegendLess: 'Moins',
    heatmapLegendMore: 'Plus',

    // Session Detail
    detailTitle: 'Séance',
    detailDuration: 'Durée',
    detailVolume: 'Volume',
    detailSeries: 'Séries',
    detailExercises: 'Exercices',
    detailPRBannerTitle: (n: number) => n === 1 ? '1 Record battu' : `${n} Records battus`,
    detailCTAReplay: 'Rejouer',
    detailCTAShare: 'Partager',
    detailSetHeaderIdx: '#',
    detailSetHeaderReps: 'Reps',
    detailSetHeaderLoad: 'Charge',
    detailSetHeaderRest: 'Repos',
    detailPRMark: 'PR',
  },
};
```

---

## 11 · Ordre d'implémentation

Suis cet ordre pour minimiser les conflits et avoir des commits qui passent les tests :

### Phase 1 — Shared schemas + DB (foundation)

1. Crée `packages/shared-schemas/src/history.ts` avec tous les types Zod (section 2)
2. Ajoute les champs manquants au Prisma schema (section 3) si absents
3. Crée la migration `history_perf_indexes` et applique-la
4. Crée le script de backfill dans `apps/api/prisma/scripts/backfill-history.ts` (section 5.4)
5. **Commit** : `feat(schemas): history data contracts + DB indexes`

### Phase 2 — Backend services + routes

6. Crée `apps/api/src/services/prDetection.ts` (section 5.1)
7. Crée `apps/api/src/services/history.ts` avec `listSessions`, `getSessionDetail`, `searchSessions`
8. Crée `apps/api/src/services/stats.ts` avec `computeHeatmap`, `computeWeeklyVolume`, `computeStats`
9. Crée `apps/api/src/routes/history.ts` (section 4)
10. Monte les routes dans `server.ts`
11. Teste manuellement avec curl/httpie sur tous les endpoints
12. **Commit** : `feat(api): history endpoints + PR detection + stats`

### Phase 3 — Hook PR detection dans le flow de save session

13. Ajoute l'appel à `detectAndMarkPRs(sessionId)` dans le handler `POST /sessions/:id/complete` existant
14. Ajoute le recalcul de `totalVolumeKg` et `seriesCount` au même endroit
15. Lance le script de backfill sur les données existantes
16. **Commit** : `feat(api): trigger PR detection on session complete`

### Phase 4 — Frontend hooks et store

17. Crée `apps/mobile/stores/historyStore.ts` (section 8)
18. Crée `apps/mobile/utils/historyGrouping.ts` (section 5.2)
19. Crée les 4 hooks : `useSessionHistory`, `useSessionDetail`, `useHistoryStats`, `useSessionSearch`
20. Ajoute les strings i18n dans `fr.ts` (section 10)
21. **Commit** : `feat(mobile): history state management + hooks`

### Phase 5 — Composants atomiques et moléculaires

22. Crée `ViewToggle` (atom)
23. Crée `FiltersRow` (molecule, reprend FilterChip existant)
24. Crée `SectionHeaderTemporal` (molecule)
25. Crée `PRRecordItem` (molecule)
26. **Commit** : `feat(ui): history atoms + molecules`

### Phase 6 — Composants organisms

27. Crée `SessionCard` (organism) avec PR badge
28. Crée `Heatmap` (organism) avec SVG ou grid View
29. Crée `WeeklyVolumeChart` (organism)
30. Crée `SessionHero` (organism)
31. Crée `PRBanner` (organism)
32. Crée `ExerciseBlock` (organism) avec grille JetBrains Mono
33. Crée `EmptyStateGlobal` et `EmptyStateFiltered` (organisms)
34. **Commit** : `feat(ui): history organisms`

### Phase 7 — Écrans

35. Crée `app/(tabs)/history.tsx` avec ViewToggle + Liste/Stats
36. Crée `app/session/[id].tsx` (Session Detail)
37. Crée `app/history/search.tsx` (modal)
38. **Commit** : `feat(screens): history + session detail + search`

### Phase 8 — Polish + validation

39. Teste le flow complet : créer une session → la voir dans History → tap → Session Detail → Rejouer/Partager
40. Teste en dark + light mode
41. Teste les empty states (nouveau compte + filtre restrictif)
42. Teste la pagination (scroll à la fin de la liste)
43. Teste la recherche
44. Teste avec un user qui a 0, 1, 10, 100+ sessions
45. Vérifie les performances de la heatmap (doit être instantanée)
46. **Commit** : `polish(history): e2e tested + perf validated`

---

## 12 · Checklist de validation

Avant de considérer la feature complète :

### Données

- [ ] Les schémas Zod matchent exactement entre mobile et api (import depuis `@tanren/shared-schemas`)
- [ ] Les indexes Prisma sont créés (`@@index([userId, startedAt])`)
- [ ] Le champ `isPR` existe sur `SessionSet`
- [ ] Les champs `totalVolumeKg` et `seriesCount` existent sur `Session`
- [ ] Le script de backfill a tourné avec succès

### Backend

- [ ] `GET /history/sessions` retourne paginé + summary
- [ ] `GET /history/sessions/:id` retourne le détail avec exercices et sets
- [ ] `GET /history/sessions/search?q=xxx` retourne max 10 résultats
- [ ] `GET /history/stats?period=3m` retourne heatmap + weekly + PRs
- [ ] PR detection fonctionne : créer une session avec charge > historique → `isPR = true`
- [ ] PR detection n'est pas déclenchée pour une session IN_PROGRESS
- [ ] Les endpoints retournent 401 sans JWT, 400 si params invalides

### Frontend — Liste

- [ ] View toggle switch bien entre Liste et Stats
- [ ] Les 2 filter rows (période + muscle) fonctionnent en AND logique
- [ ] Le summary strip se met à jour selon le filtre
- [ ] Les sessions sont groupées par semaine/mois correctement
- [ ] Les sections headers affichent le bon label et count
- [ ] Les PR badges apparaissent sur les cards concernées
- [ ] Les sessions avec PR ont bien la border-left rouge 3px
- [ ] Tap sur une card navigate vers Session Detail
- [ ] Pull to refresh relance le fetch
- [ ] Scroll infini charge la page suivante à ~80% de la liste

### Frontend — Stats

- [ ] Volume total s'affiche en 38px Black
- [ ] Trend pourcentage coloré selon direction (vert/ambre/rouge)
- [ ] La heatmap affiche 12 semaines × 7 jours = 84 cellules
- [ ] Les niveaux de la heatmap (0-4) correspondent au volume relatif
- [ ] Les labels des mois s'alignent au-dessus de la heatmap
- [ ] Le weekly volume chart affiche 12 bars avec la dernière en accent plein
- [ ] Les records récents listent les 3 derniers PR avec icône trophée

### Frontend — Session Detail

- [ ] Hero rouge avec kanji + nom séance + stats + muscle chips
- [ ] PR banner affiché UNIQUEMENT si `session.prs.length > 0`
- [ ] Chaque exercice a un bloc avec header + grille 4 colonnes
- [ ] Les valeurs dans la grille sont en JetBrains Mono
- [ ] Les sets qui ont battu un PR sont en accent avec mini badge "PR"
- [ ] Boutons "Rejouer" et "Partager" fonctionnent

### Frontend — Empty states

- [ ] Empty state global : kanji 錬 géant + CTA "Commencer une séance"
- [ ] Empty state filtré : filtres visibles + summary à 0/0 + link "Réinitialiser"
- [ ] Les filtres et view toggle ne s'affichent PAS dans l'empty state global

### Frontend — Search

- [ ] Modal plein écran avec input autofocus
- [ ] Debounce 300ms fonctionne
- [ ] Empty hint si query < 2 chars
- [ ] Loading spinner pendant la requête
- [ ] Empty results si pas de match
- [ ] Tap sur un résultat navigate vers Session Detail et close la modal

### Visuel

- [ ] Toutes les couleurs viennent de `useTheme()` (aucun hex hardcodé)
- [ ] Dark + light mode testés sur tous les écrans
- [ ] Radius 0 partout sauf boutons (4)
- [ ] Kanji en Noto Serif JP uniquement, JAMAIS comme numéros de liste
- [ ] Tab bar avec 5 onglets, Historique actif

### Performance

- [ ] La liste avec 100+ sessions scrolle sans lag (FlatList virtualization)
- [ ] La heatmap se render en < 100ms
- [ ] Le passage Liste ↔ Stats est instantané (pas de re-fetch si déjà chargé)
- [ ] La recherche debounce correctement (pas de flood API)

---

## 13 · Notes importantes

### 13.1 · Performance de la heatmap

Pour un user avec 2 ans d'historique (730 jours × 7 days = beaucoup de data), la heatmap reste à 12 semaines par défaut. Ne jamais afficher plus de 12 semaines en mode mobile.

Si le user veut voir plus, proposer de passer sur le web plus tard. Pour V1 : 12 semaines fixe.

### 13.2 · Gestion des fuseaux horaires

**Piège classique** : un user fait une séance à 23h55 UTC, mais il est en France (Europe/Paris) donc pour lui c'est déjà 00h55 du jour suivant. La heatmap doit refléter son fuseau, pas UTC.

**Solution** : utilise `toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris' })` côté backend pour grouper par date locale, OU renvoie les timestamps bruts et laisse le frontend grouper localement.

Recommandation : groupement côté frontend pour éviter les bugs de timezone serveur (qui est souvent en UTC).

### 13.3 · Sync WatermelonDB

Les hooks `useSessionHistory` etc. font des requêtes réseau. Pour le mode offline-first, tu devrais :

1. Lire d'abord depuis WatermelonDB (instantané)
2. Parallèlement, fetch depuis l'API
3. Merger les résultats (dédupe par `id`)
4. Persister le résultat API dans WatermelonDB

Pour V1, **commence simple** avec uniquement du fetch API + cache TanStack Query. Ajoute la couche WatermelonDB dans une itération séparée — sinon tu vas complexifier cette feature pour rien.

### 13.4 · Analytics / événements

Track ces événements (si Posthog/Mixpanel/Sentry configuré) :

- `history_viewed` avec props `{ viewMode, period, muscleGroup }`
- `session_detail_viewed` avec props `{ sessionId, hasPRs }`
- `session_replayed` avec props `{ sessionId }`
- `session_shared` avec props `{ sessionId }`
- `history_searched` avec props `{ queryLength, resultsCount }`

Utile pour plus tard savoir quelles features marchent.

### 13.5 · Edge cases à tester

- Session en cours (IN_PROGRESS) : ne doit PAS apparaître dans History
- Session abandonnée : doit apparaître avec status "Incomplète"
- Session sans sets (user a démarré puis quitté immédiatement) : `totalVolumeKg = 0`, status "Incomplète"
- Exercice avec charge 0 kg (bodyweight) : le PR detection doit gérer `weightKg = 0`
- User avec 1 seule session : pas de "previous best" donc tous les sets sont des PR (fonctionnement attendu : oui)
- Session avec 20+ exercices : le Session Detail doit scroller correctement

---

*Implémente proprement. Teste chaque phase. Ship avec les PR qui détonnent.*

*Tanren · Une rep après l'autre.*
