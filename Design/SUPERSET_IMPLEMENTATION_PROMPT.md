# TANREN — Superset / Bi-set / Circuit · Implementation

> **For Claude Code.** Implement the **superset** feature. The design is settled; this document is the build plan.
> Work is organized into **5 batches**. **Execute one batch at a time**, commit, then **STOP and wait** for validation before the next.
>
> **Ground rules:**
> - Each batch = one PR / commit series. Never batch unrelated work.
> - Every batch starts with a **READ/AUDIT** step (read-only). Confirm the real code matches the assumptions below **before** writing anything. If a file/line/procedure does not match, **STOP and report** — do not guess.
> - Run `npm run typecheck` and `npm run build` after each significant change.
> - If a task is already done, SKIP it and note it in the commit message.
> - **Never guess on migrations.** Run them on a DB copy first. Use the repo's existing migration mechanism (check whether prior migrations are produced by `drizzle-kit generate` or are hand-written SQL, and follow that exact pattern).
> - New columns are **nullable / defaulted → no backfill, fully backward compatible.** Existing plans and sessions stay valid untouched.
>
> **Sources of truth:**
> - **Codebase ground truth:** the discovery report already produced for this feature (real table names, store shape, procedures, line numbers). The key facts are inlined below.
> - **Visual spec:** `Tanren_Superset_Mockup.html` (4 screens: detail, editor, active session, round rest). Match it. Use `useTheme()` tokens for **both** dark and light — the mockup is light-mode only; do **not** hardcode colors.
>
> **UI conventions (non-negotiable):** radius-0, no shadows, red accents via borders only, Barlow Condensed (UI) / JetBrains Mono (data), French copy in `tutoiement`, metric (kg, comma decimals), term **"superset"** everywhere (never "bi-set" even for 2 members), **tap-only inputs — no +/− steppers**.

---

## Decisions (locked — do not re-litigate)

1. **Model:** a superset = consecutive exercises (by `order`) sharing the same non-null `superset_group_id` (uuid). `NULL` = standalone. Generalises to N members (bi-set / tri-set / giant set / circuit) at no schema cost. **One new column per side, no new table.**
2. **Rest semantics:** `rest_seconds` is "the pause that follows this set." Non-last members of a group carry the **transition** (default **15 s**, editable). The **last** member carries the **round rest** (default 90 s). No group-level rest field — the editor's "repos de tour" readout is just the last member's value.
3. **Session flow:** strict guided. **Auto-navigation applies ONLY inside a superset group** (A → B → round rest → A …). Standalone exercises keep **today's exact behavior** (validate set → next set; end of exercise → stop, manual `›`). Auto-nav is bounded to the group.
4. **Unequal set counts:** tolerated. Rounds = max set count across members; a member with no set at round `r` is skipped that round. UI/AI **default** to equal set counts.
5. **PRs:** counted normally, unchanged math. Add an optional `performed_in_superset` boolean on sets, set at save time.
6. **Quick sessions:** supersets **out of scope** for V1. The quick path always passes `supersetGroupId = null`.

---

## Known codebase facts (from discovery — verify in each batch's READ step)

- Tables: `workout_templates`, `workout_exercises`, `workout_sessions`, `session_exercises`, `exercise_sets`, `personal_records`.
- `workout_exercises`: `defaultSets`, `defaultReps`, `defaultWeight`, `defaultRestSeconds` (int, default 90), `order` (int), `notes`. Index `we_template_idx ON (workoutTemplateId)`.
- `session_exercises`: `id`, `workoutSessionId`, `exerciseId`, `order`. **No rest column.** Indexes `se_session_idx`, `se_exercise_idx`.
- `exercise_sets`: `setNumber`, `reps`, `weight`, `restSeconds`, `isCompleted`, `completedAt`, `isPR`, `notes`. Index `es_is_pr_idx ON (sessionExerciseId, isPR)`.
- **Session structure is materialised client-side.** `sessions.start` (`apps/api/src/routers/sessions.ts:14-23`) only inserts a `workout_sessions` row. `preview.tsx` fetches `trpc.workouts.detail`, assembles `SessionExercise[]`, calls `startSession()`. Sets are persisted only at completion via `sessions.save` (one atomic payload). → **`supersetGroupId` must flow through the Zustand store and the save payload, not just the DB.**
- Rest timer: `timerStore.ts` (vanilla Zustand, not persisted) + `useWorkletTimer()`. `active.tsx:117`: `const restSecs = currentSet?.restSeconds ?? DEFAULT_REST_SECONDS; start(restSecs, currentExercise.exerciseName)`. `DEFAULT_REST_SECONDS = 90`.
- `activeSessionStore.ts` state: `currentWorkout`, `isQuickSession`, `exercises: SessionExercise[]`, `currentExerciseIndex`, `currentSetIndex`, `startedAt`. `completeSet(exIdx, setIdx)` marks done + advances `currentSetIndex` to the next incomplete set **of the same exercise**. `nextExercise`/`prevExercise` are manual. `partialize` persists the cursor (crash recovery works).
- AI: `generateWithAI` inline in `apps/api/src/routers/plans.ts:342-538`, system prompt is a template literal. Output is `JSON.parse` + manual filtering (no Zod on the generated output). `acceptGenerated` has a Zod schema for the client payload. Model via `resolveModelForUser()` (`llmRouter.ts`), default `claude-sonnet-4-6`.
- PR calc: `sessions.ts:226-254` inside `save` — best set by weight, reps tiebreaker. Sets `isPR` on the set row + inserts `personal_records`. Quick path: simpler check in `saveQuick`.
- History: `historyGrouping.ts` groups **sessions** by time bucket (unaffected). Detail screen `session/[id].tsx` renders `SessionHero + PRBanner + ExerciseBlock` per exercise by `order`. Volume = `reps*weight` per set, summed (`calcSessionVolume` in `@tanren/shared`, server `sessions.ts:129`).
- Shared types `packages/shared/src/types.ts` (all manual). `WorkoutExercise`, `SessionExercise`, `ExerciseSet` (⚠ **missing `isPR`** — exists in DB), `SessionExerciseDetail`.

---

# Batch 1 — Schema, types, server plumbing

**Goal:** make `supersetGroupId` round-trip through the DB and the API, with zero behavior change yet.

### 1.0 · READ first
Confirm: the migration mechanism (drizzle-kit vs hand-written SQL), the exact `workout_exercises` / `session_exercises` / `exercise_sets` definitions in `schema.ts`, the `sessions.save` input schema and insert block, the `workouts.detail` select. Report anything that diverges before editing.

### 1.1 · Migration + schema: `workout_exercises.superset_group_id`
Add nullable `superset_group_id uuid` (no FK, no index needed — membership is derived in app from consecutive `order`). Update the Drizzle table in `schema.ts`.

### 1.2 · Migration + schema: session side
- `session_exercises.superset_group_id uuid NULL`.
- `exercise_sets.performed_in_superset boolean NOT NULL DEFAULT false`.
Update both Drizzle tables.

### 1.3 · Shared types
In `packages/shared/src/types.ts`:
- Add `supersetGroupId?: string | null` to `WorkoutExercise`, `SessionExercise`, and `SessionExerciseDetail`.
- Add the **missing** `isPR: boolean` to `ExerciseSet`, plus `performedInSuperset?: boolean`.

### 1.4 · Read path
Ensure `workouts.detail` returns `supersetGroupId` for each template exercise (with the schema update this is usually automatic via `select()`; confirm the mapper doesn't whitelist columns and drop it).

### 1.5 · Write path
In `sessions.save`:
- Extend the input Zod schema: each exercise gets `supersetGroupId: z.string().uuid().nullable().optional()`.
- On `session_exercises` insert, persist `superset_group_id` from the payload.
- When inserting `exercise_sets`, set `performed_in_superset = (parent exercise.supersetGroupId != null)`.
- **PR calc unchanged.**
In `saveQuick`: pass `supersetGroupId = null` and `performed_in_superset = false` everywhere. Verify the new columns don't break it.

**Verification:** typecheck + build green. Manually start a session from a template (no supersets yet) and save — confirm `session_exercises.superset_group_id` is null and `performed_in_superset` false, no regression.

### Commit sequence
```
feat(db): add superset_group_id to workout_exercises
feat(db): add superset_group_id + performed_in_superset to session side
feat(types): add supersetGroupId + isPR + performedInSuperset to shared types
feat(api): round-trip supersetGroupId through sessions.save
```
**STOP** — confirm migrations applied cleanly and a normal session still saves. Then Batch 2.

---

# Batch 2 — Active session: group-aware flow + UI

**Goal:** strict-guided superset flow during a live session, auto-nav **bounded to the group**. Standalone behavior byte-for-byte unchanged.

### 2.0 · READ first
Re-read `activeSessionStore.ts` (full `completeSet`), `active.tsx` (the rest-timer start at ~line 117, the `‹ ›` nav, the "Valider la série" button), and `preview.tsx` (how `SessionExercise[]` is assembled). Confirm signatures before editing.

### 2.1 · Store: `supersetGroupId` + group-aware advancement
- Add `supersetGroupId?: string | null` to the store's `SessionExercise` interface. Include it in `partialize` (it's part of `exercises`, so already persisted — verify).
- Add **pure, exported, unit-testable** helpers (new file `apps/mobile/src/lib/superset.ts`):

```ts
// Illustrative — adapt to the real SessionExercise type.
export function getGroupBounds(exercises: SessionExercise[], idx: number) {
  const gid = exercises[idx]?.supersetGroupId ?? null;
  if (!gid) return { start: idx, end: idx };            // standalone = group of one
  let start = idx, end = idx;
  while (start - 1 >= 0 && exercises[start - 1].supersetGroupId === gid) start--;
  while (end + 1 < exercises.length && exercises[end + 1].supersetGroupId === gid) end++;
  return { start, end };
}

export type Step = { exerciseIndex: number; setIndex: number };

export function computeNextStep(exercises: SessionExercise[], exIdx: number, setIdx: number): Step | null {
  const { start, end } = getGroupBounds(exercises, exIdx);

  // Standalone → preserve today's behavior exactly.
  if (start === end) {
    const ex = exercises[exIdx];
    const next = ex.sets.findIndex((s, i) => i > setIdx && !s.isCompleted);
    if (next !== -1) return { exerciseIndex: exIdx, setIndex: next };
    const anyIncomplete = ex.sets.findIndex((s) => !s.isCompleted);
    if (anyIncomplete !== -1) return { exerciseIndex: exIdx, setIndex: anyIncomplete };
    return null; // exercise done → stop, manual nav (unchanged)
  }

  // Superset: round index == set index within a member.
  const round = setIdx;
  // 1) next member, same round (skip exhausted members with no set at `round`)
  for (let m = exIdx + 1; m <= end; m++) {
    if (exercises[m].sets[round] && !exercises[m].sets[round].isCompleted)
      return { exerciseIndex: m, setIndex: round };
  }
  // 2) end of round → next round, first available member
  const maxRounds = Math.max(...exercises.slice(start, end + 1).map((e) => e.sets.length));
  for (let r = round + 1; r < maxRounds; r++)
    for (let m = start; m <= end; m++)
      if (exercises[m].sets[r] && !exercises[m].sets[r].isCompleted)
        return { exerciseIndex: m, setIndex: r };
  // 3) group complete → stop, manual nav (same as standalone end)
  return null;
}
```

- Rewrite `completeSet` to: mark the set completed, then set the cursor to `computeNextStep(...)` if non-null; if null, leave the cursor (the user taps `›` to move on — unchanged for both standalone and finished groups).

### 2.2 · Rest-timer label (transition vs round rest)
At the timer `start()` call in `active.tsx`, keep `restSecs = currentSet.restSeconds` (already correct: 15 for transition members, round rest for the last). Compute a superset-aware **label**:
- standalone → `currentExercise.exerciseName` (unchanged).
- in a group, not the last member of the round → `TRANSITION → ${nextMemberName}`.
- in a group, last member of the round → `SUPERSET · FIN DU TOUR` (round rest).

### 2.3 · Active UI (match mockup screen 03/04)
- **Superset bandeau** above the set list, rendered only when the current exercise has a `supersetGroupId`: red-bordered, header `SUPERSET · TOUR r/R`, one row per member with the current highlighted, footer `A → B : 15s · repos après B`. Keep it **compact** (single block, ~one line per member).
- **Disable `‹ ›` within a group** (strict guided drives the flow). They behave as today at standalone exercises and group boundaries. Render them dimmed inside a group (mockup state).
- **Button label:** `Valider la série N` (standalone, unchanged) / `Valider — enchaîner ${nextMemberLetter}` (transition) / `Valider — repos de tour` (last member of round).
- The progress segment bar may bracket the group's segments (mockup) — optional polish.

### 2.4 · preview.tsx
When assembling `SessionExercise[]`, carry `supersetGroupId` from the template exercise into the store object. Set per-member set `restSeconds` from each member's `defaultRestSeconds` exactly as today (the editor in Batch 3 is what sets non-last members to 15 and the last to round rest — preview just copies).

### 2.5 · Tests
Unit-test `computeNextStep`: standalone (unchanged), 2-member equal sets, 3-member, **unequal sets** (member B has fewer sets → skipped in later rounds), end-of-group returns null.

**Verification:**
- Standalone session: identical to before (regression check the most important thing here).
- 2-exercise superset, 3 rounds: A1 → B1 (transition label) → round rest after B1 → A2 → B2 → … flow is correct; PRs still record; crash-kill mid-superset restores the exact step.

### Commit sequence
```
feat(session): superset helpers (getGroupBounds, computeNextStep)
feat(session): group-aware completeSet, standalone path unchanged
feat(session): superset-aware rest-timer label
feat(ui): superset bandeau + guided nav + adaptive validate button
test(session): computeNextStep unit tests
```
**STOP** — UAT the guided flow (equal + unequal sets) and the standalone no-regression. Then Batch 3.

---

# Batch 3 — Template editor: link / unlink + group reorder

**Goal:** create and edit supersets in the template, persisted to `workout_exercises`.

### 3.0 · READ first (important gap)
The discovery covered the **session** assembly in `preview.tsx`, **not** the template **write** path. Before implementing, locate and report:
- The screen reached by `MODIFIER` from the séance detail and the procedure that persists template exercise edits/reorders (e.g. `workouts.update` / a reorder mutation) and how `workout_exercises.order` is written.
Implement linking against the **real** persistence path. Do not guess it.

### 3.1 · Link / unlink
- "Lier au suivant en superset" affordance under a standalone exercise (full-width dashed red button + a `✕` box to dismiss it — mockup screen 02). Linking generates a client-side `uuid` and assigns it to both the exercise and the next; if the next is already in a group, **append** to that group (N-member).
- "Délier" on the group header removes membership. **Auto-dissolve** a group that drops to a single member (set its `supersetGroupId` back to null).
- On link, default the members' `defaultRestSeconds`: non-last → **15** (transition), last → keep/round rest (90). Default to **equal set counts** across members.

### 3.2 · Group rendering (mockup screen 02)
- Red left bracket + `SUPERSET` chip; member tags `A / B / C…`.
- Group header shows **round rest = last member's `defaultRestSeconds`**, editable → writes to the last member (no separate field/column). Non-last members show an editable **transition** field (their `defaultRestSeconds`, default 15). Tap-only.

### 3.3 · Reorder integrity
Members of a group must stay **consecutive** in `order`. Moving a grouped exercise moves the **whole block**. Block any reorder that would split a group. Keep `order` contiguous after any move.

### 3.4 · Persist
Write `superset_group_id` (and the adjusted rest values + order) through the real template-save path from 3.0.

**Verification:** create a superset of 2, then 3; reorder the block; unlink; dissolve-to-one; reload the template — grouping and rest values persist; `order` stays contiguous and members consecutive.

### Commit sequence
```
feat(editor): link/unlink exercises into superset groups
feat(editor): superset block rendering + round-rest/transition editing
feat(editor): group-aware reorder keeping members consecutive
```
**STOP** — validate authoring round-trips to DB. Then Batch 4.

---

# Batch 4 — AI generation

**Goal:** let the generator emit supersets, validated and mapped to group ids.

### 4.0 · READ first
Re-read `generateWithAI` (`plans.ts:342-538`), the output handling (`JSON.parse` + filtering), and `acceptGenerated`'s Zod schema.

### 4.1 · System prompt
Extend the template-literal prompt: explain when a superset helps (antagonist pairs, time efficiency, hypertrophy accessories), and instruct the model to emit a **flat** field `supersetGroup: "A" | "B" | ... | null` per exercise, where exercises sharing a label within the same workout day are one group, kept **consecutive** with **equal set counts**, and the last member carrying the longer (round) rest, non-last members ~15 s.

### 4.2 · Validation + mapping
- Add **light Zod validation** for the generated output (it is currently unvalidated), including the optional `supersetGroup` label.
- On accept, map labels → a shared `uuid` per (day, label), assign to `workout_exercises.superset_group_id`, and order so grouped members are consecutive. Default rests as in 4.1 when none provided.
- Update `acceptGenerated`'s Zod schema to carry `supersetGroupId` (or perform the label→uuid mapping server-side at accept — pick one and keep it consistent).

**Verification:** generate a plan that includes at least one superset; accept it; open it in the editor — the group is present, consecutive, equal sets, correct rests.

### Commit sequence
```
feat(ai): superset support in generation system prompt
feat(ai): validate generated output + map superset labels to group ids
```
**STOP** — verify a generated superset survives accept → editor → session. Then Batch 5.

---

# Batch 5 — History rendering

**Goal:** past sessions display supersets faithfully. Math unchanged.

### 5.0 · READ first
Re-read `session/[id].tsx` (`ExerciseBlock` rendering loop) and confirm `SessionExerciseDetail` (now carrying `supersetGroupId` from Batch 1) is returned by the detail query.

### 5.1 · Grouped rendering
Render consecutive same-`supersetGroupId` exercises in `session/[id].tsx` as one block (red bracket + `SUPERSET` chip + member tags), matching the detail/editor styling (mockup screen 01). Volume / tonnage / PR display **unchanged** — supersets only affect grouping, not math.

### 5.2 · Verify untouched
- `historyGrouping.ts` groups sessions by time — **no change expected**; confirm.
- Volume aggregates (`calcSessionVolume`, `history.ts:292-445`) unchanged.

**Verification:** complete a real superset session; open it in history — exercises render grouped; volume and PRs match a non-grouped equivalent.

### Commit sequence
```
feat(history): render supersets as grouped blocks in session detail
```
**COMPLETE.**

---

# Out of scope (do NOT build — note in BACKLOG.md)

- Supersets in **quick sessions** (V1: always null).
- **Step-back correction** nav inside a group (forward auto-nav only for now).
- Ad-hoc superset creation **during** a live session (model supports it; UI deferred).
- A dedicated group-level rest **column / table** (round rest stays on the last member; revisit only if group metadata/labels are needed).
- `weightKg` float precision (the `108.3333…` prev value visible in the editor) — that's the separate `numeric(5,2)` migration in the hardening plan, not this feature.

---

## How to work through this document

Per batch: read the READ step first, confirm reality matches, implement in order, `typecheck` + `build` after each change, commit in the shown sequence, push to a feature branch, **wait for validation**. On any mismatch with the assumptions above — especially the Batch 3 template-write path — **STOP and report**, don't guess.

*Tanren · Une rep après l'autre.*
