# Workout Builder — Current State Discovery

> Read-only audit · 2026-04-23

---

## 1 · File Inventory

| File | Lines | Purpose |
|---|---|---|
| `apps/mobile/app/workout/build.tsx` | ~660 | Main builder screen (name, muscles, duration, exercises, save) |
| `apps/mobile/app/workout/create.tsx` | ~100 | Simpler create screen — name + description only, no exercises. Likely abandoned/dead code. |
| `apps/mobile/app/workout/[id].tsx` | ~250 | Detail/edit screen — read-only exercise list, inline name edit, reorder, delete |
| `apps/mobile/app/workout/preview.tsx` | ~584 | Pre-session preview — per-set config, add/remove sets, add extra exercises, start session |
| `apps/mobile/src/stores/pendingWorkoutStore.ts` | ~20 | Bridges plan builder → workout builder (stores `pendingForDay` + `pendingWorkoutId`) |
| `apps/mobile/src/stores/activeSessionStore.ts` | ~200 | Persisted Zustand+MMKV store for active session state |
| `apps/mobile/src/hooks/useExercises.ts` | ~80 | Fetches exercise list via tRPC, caches in MMKV, FR/EN translation |
| `apps/api/src/routers/workouts.ts` | ~300 | Backend CRUD: list, create, byId, update, delete, reorderExercises, detail |
| `apps/api/src/db/schema.ts` | (partial) | `workoutTemplates` + `workoutExercises` table definitions |

---

## 2 · Entry Points

| From | Action | Navigates to |
|---|---|---|
| `(tabs)/workouts.tsx` | "+" button in section header | `/workout/build` |
| `(tabs)/workouts.tsx` | Empty state "+" button | `/workout/build` |
| `plans/create.tsx` | "Create new workout" dashed button | Sets `pendingWorkoutStore.setDay(dayOfWeek)` → `/workout/build` |
| `workout/[id].tsx` | "START WORKOUT" button | `/workout/preview?templateId=${id}` |

---

## 3 · Core Flow

```
workouts.tsx ──(+)──► build.tsx ──(save)──► workouts.tsx
                                    │
plans/create.tsx ──(create)──► build.tsx ──(save)──► plans/create.tsx (via pendingWorkoutStore)
                                    │
workout/[id].tsx ──(start)──► preview.tsx ──(start)──► active.tsx
```

**build.tsx** is the full builder:
1. User enters workout name (required)
2. Selects muscle groups (flex-wrap grid of chips)
3. Picks estimated duration from 5 presets: 30, 45, 60, 75, 90 min
4. Adds exercises via inline `ExercisePicker` modal (multi-select with checkboxes)
5. Configures sets/reps/weight/rest per exercise
6. Reorders via up/down text arrows
7. Saves via `trpc.workouts.create` mutation

**create.tsx** is a stripped-down version that only captures name + description. It calls the same `trpc.workouts.create` mutation but without exercises. This appears to be an older version that was never removed.

---

## 4 · Exercise Selection

**Two separate ExercisePicker implementations exist:**

### build.tsx ExercisePicker (multi-select)
- Rendered as an inline `<Modal>` component inside build.tsx (~200 lines)
- Search bar filters by exercise name
- Muscle group filter chips (horizontal scroll)
- Exercises shown in a FlatList with checkboxes
- "ADD N" confirmation button at bottom
- Prevents adding duplicates (filters out already-added exerciseIds)
- Uses `useExercises()` hook for data

### preview.tsx ExercisePicker (single-select)
- Separate inline `<Modal>` inside preview.tsx
- Same search + muscle filter pattern
- Single-select (tap = immediate add, no confirmation)
- Also prevents duplicates
- Extra exercises added here are ephemeral — not saved back to the template

---

## 5 · Set / Rep / Weight / Rest Configuration

### In build.tsx (template defaults)
Each `ExerciseEntry` has:
```ts
{
  exerciseId: string
  exerciseName: string
  muscleGroups: string[]
  sets: number      // default: 3
  reps: number      // default: 10
  weight: number    // default: 0
  restSeconds: number // default: 90
}
```
- Adjusted via `+`/`−` steppers inline on each exercise row
- No min/max validation visible
- Weight stored as plain number (kg)

### In preview.tsx (per-set override before session)
- Each exercise expands to show individual set rows
- Each set has: reps input, weight input, rest input
- Initialized from `previousSets` (last session data for that exercise) or template defaults
- Can add/remove sets per exercise
- "Last" ghost values shown from previous session

### In activeSessionStore (during session)
```ts
SetConfig: { reps: number, weight: number, restSeconds: number, isCompleted: boolean, completedAt?: string }
SessionExercise: { exerciseId, exerciseName, defaults, lastWeight, lastReps, prWeight, prReps, previousVolume, sets: SetConfig[] }
```

---

## 6 · Exercise Ordering

**build.tsx**: Up/down text arrows (`↑` / `↓`) on each exercise row. Swaps adjacent items in the local `exercises` array. No drag-and-drop.

**[id].tsx (detail screen)**: Same up/down arrow pattern. Calls `trpc.workouts.reorderExercises` mutation with `orderedIds: string[]` after each swap. Server updates `order` field for each exercise.

**Backend**: `reorderExercises` procedure takes `{ workoutId, orderedIds }`, iterates the array, and updates each exercise's `order` field sequentially (N updates).

---

## 7 · Saving

### build.tsx → `trpc.workouts.create`
Sends:
```ts
{
  name: string
  description?: string
  muscleGroups: string[]
  estimatedDuration: number
  exercises: Array<{
    exerciseId: string
    order: number
    defaultSets: number
    defaultReps: number
    defaultWeight: number
    defaultRestSeconds: number
  }>
}
```

If `pendingWorkoutStore.pendingForDay` is set, after successful save it also triggers plan assignment logic then clears pending state.

### [id].tsx → `trpc.workouts.update`
Only updates `name` (inline edit on blur). Cannot update exercises, muscle groups, or duration from this screen.

### preview.tsx
Does NOT save changes back to template. All modifications (added exercises, changed sets/reps/weight) are ephemeral and only feed into the active session.

---

## 8 · Validation

**build.tsx:**
- Name is required (empty name prevents save — button disabled when `name.trim() === ''`)
- At least 1 exercise required (button disabled when `exercises.length === 0`)
- No validation on sets/reps/weight/rest values beyond what the stepper allows
- No duplicate exercise names check (but duplicate exerciseIds are prevented by the picker)

**[id].tsx:**
- Name cannot be empty (checked on blur before calling update)

**Backend (`workouts.create`):**
- Zod schema validates input shape
- No business logic validation (e.g., max exercises, sensible rep ranges)

---

## 9 · Edit Mode

There is **no true edit mode** for an existing workout's exercises.

- `[id].tsx` allows: rename (inline), reorder exercises (up/down arrows), delete entire workout
- Cannot: add exercises, remove individual exercises, change sets/reps/weight/rest defaults
- To modify exercises, user must delete and recreate the workout from scratch
- `build.tsx` is create-only — it does not load an existing workout for editing

This is a significant gap.

---

## 10 · Pain Points

1. **No edit mode for exercises** — Cannot add/remove/modify exercises on an existing workout. Must delete + recreate.
2. **No draft persistence** — Killing the app during build loses all state. No auto-save, no AsyncStorage/MMKV backup.
3. **No drag-and-drop reordering** — Text arrows are functional but crude. Missing `react-native-draggable-flatlist` or similar.
4. **Duplicate ExercisePicker implementations** — build.tsx (multi-select) and preview.tsx (single-select) share ~80% logic but are fully duplicated.
5. **Dead `create.tsx` screen** — Confusing to have two create flows. Nothing navigates to `create.tsx` currently.
6. **Muscle groups use flex-wrap grid** — Violates CLAUDE.md §6.4 which requires horizontal scroll chips.
7. **Hardcoded English strings** — "CLOSE", "ADD", "EXERCISES", "DELETE WORKOUT", "START WORKOUT", "SEARCH", etc. should go through i18n.
8. **N+1 query in `detail` endpoint** — Fetches previous session sets + PRs per exercise in a loop.
9. **No supersets/circuits** — Exercises are flat list only. No grouping mechanism.
10. **No RPE/RIR tracking** — Only reps, weight, rest.
11. **pendingWorkoutStore coupling** — Plan builder → workout builder bridge is fragile. If user navigates away mid-build, pending state is orphaned.
12. **No undo** — Deleting an exercise from the builder list is immediate with no undo.

---

## 11 · Visual State

### build.tsx
- Header: "CREATE WORKOUT" (hardcoded English)
- Name input: underlined text field
- Muscle groups: flex-wrap grid of `Chip` components (should be horizontal scroll per CLAUDE.md)
- Duration: 5 pill buttons in a row (30/45/60/75/90)
- Exercise list: flat rows with name, muscle tag, stepper controls, up/down arrows, delete X
- Exercise picker: full-screen modal overlay
- Save button: primary red, bottom of screen, disabled until valid

### [id].tsx
- Header: workout name as editable text (tap to edit)
- Exercise list: read-only rows with name, "sets × reps" subtitle, up/down arrows
- Delete button: danger style at bottom
- "START WORKOUT" button: primary red

### preview.tsx
- Header: workout name (read-only)
- Exercise sections: expandable with per-set input rows
- Add/remove set buttons per exercise
- "Add exercise" button opens single-select picker
- "START" button: primary red at bottom

---

## 12 · Related Features

### Plan Builder (`plans/create.tsx`)
- Uses `pendingWorkoutStore` to pass day-of-week context to workout builder
- Flow: select day chip → tap "Create new workout" → navigate to `/workout/build` → on save, workout is assigned to that day in the plan
- If user picks an existing workout instead, no builder involvement

### Active Session (`workout/active.tsx` + `activeSessionStore`)
- Receives exercise list from preview.tsx via `activeSessionStore.startSession()`
- Session exercises include `defaults`, `lastWeight`, `lastReps`, `prWeight`, `prReps`, `previousVolume`
- Set completion is tracked individually with timestamps
- Session persisted to MMKV — survives app kill during workout

### Exercise Library (`useExercises` hook)
- Single fetch, MMKV cache with version key
- `staleTime: Infinity` — only re-fetches if cache version changes
- Returns `{ id, name, primaryMuscle, secondaryMuscles, equipment, difficulty }`
- Used by both ExercisePicker instances

### History
- Completed sessions reference the `workoutTemplateId` — links back to the template
- Session sets store exerciseId + reps + weight — independent of template defaults

---

## Summary

The workout builder is functional for basic create + start flows but lacks edit capabilities for existing workouts, has no draft persistence, uses duplicated exercise picker code, and has several UI violations (flex-wrap muscles, hardcoded English strings). The `create.tsx` file is dead code. The biggest architectural gap is the inability to modify an existing workout's exercises — users must delete and recreate.
