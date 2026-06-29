# TANREN — Workout Builder · Discovery Prompt

> **For Claude Code.** Before we redesign the Workout Builder, I need a precise map of how it currently works. Don't change anything. Don't suggest improvements. Just report what exists.
>
> **Goal**: produce a single markdown report (`WORKOUT_BUILDER_CURRENT.md` at the repo root) that answers every question below. Keep answers short and factual. Code snippets only when they answer a structural question better than prose.

---

## 1. File inventory

List every file (path + 1-line purpose) involved in creating or editing a workout. Include:
- Route files under `apps/mobile/app/` (Expo Router)
- Components under `apps/mobile/src/components/` used only by the builder
- Zustand stores related to workout creation
- tRPC procedures on the API side (`apps/api/src/routers/`)
- Drizzle tables touched by builder operations

Format:

```
## Mobile
- apps/mobile/app/workout/new.tsx — entry screen to start a new workout
- apps/mobile/src/components/ExercisePicker.tsx — sheet to select exercises
- ...

## Backend
- apps/api/src/routers/workouts.ts — router with createWorkout, updateWorkout...
- ...

## Database
- workouts (Drizzle table) — column list + FKs
- workout_exercises (Drizzle table) — ...
- ...
```

---

## 2. Entry points

Where can a user start creating a workout? Answer each of these:

1. From the Home tab — yes/no. If yes, which component triggers it?
2. From the Training tab — yes/no. Button label, location?
3. From a template/plan — yes/no. Flow description.
4. From history (repeat previous workout) — yes/no.
5. Any other entry point I might have missed?

---

## 3. The core flow (happy path)

Walk me through the screens a user sees, in order, when creating a workout from scratch. For each screen:

- Route path
- What the user sees (high-level, not pixel-perfect)
- What inputs/selections they make
- What triggers navigation to the next screen

Example format:
```
Screen 1: /workout/new
- User sees: title input, button "Ajouter un exercice"
- Tapping "Ajouter un exercice" navigates to Screen 2
Screen 2: /workout/exercise-picker
- ...
```

---

## 4. Exercise selection mechanism

This is probably the most complex part. Explain:

1. **Where do exercises come from?** Static JSON? DB table `exercises`? Is there a `useExercises` hook? How is it cached?
2. **Filtering**: what filters exist? (muscle group, equipment, search text, favorites, ...). Which components implement them?
3. **Selection interaction**: is it single-tap to add, or multi-select with a validation button? Can the user add the same exercise twice?
4. **Back navigation**: when the user picks an exercise, does it return them to the builder with the exercise pre-added, or stay in the picker for multi-add?

---

## 5. Set/rep/weight configuration

Once an exercise is added to the workout, how does the user configure its sets?

1. Inline (in the workout screen) or in a dedicated sub-screen/modal?
2. Default values when an exercise is added (e.g. 3 sets × 10 reps)?
3. Data model: one row per set, or a `sets` JSONB array on the exercise?
4. Can the user add/remove individual sets?
5. Weight unit (kg/lb) — user-configurable or hardcoded kg?
6. Rest timer — set per exercise, per set, or global?
7. RPE (Rate of Perceived Exertion) tracking — present or absent?

---

## 6. Ordering & grouping

1. Can the user reorder exercises? How? (drag handle, long-press, up/down arrows)
2. Are supersets supported? If yes, how are they modeled in the DB (e.g. `supersetGroupId` column, ordering)?
3. Are circuits or "giant sets" supported?
4. What library handles the drag-and-drop if any? (`react-native-draggable-flatlist`, `react-native-reanimated` + gesture handler, ...)

---

## 7. Saving & state management

1. Is there auto-save while the user builds (every N seconds / after every change)? Or only on explicit "Save"?
2. If auto-save: to server or to AsyncStorage draft first?
3. If the user kills the app mid-creation, is the draft recovered on re-open?
4. Which Zustand stores hold the draft state? List them with their shape.
5. Which tRPC mutations are called on save? List them with input/output shape.

---

## 8. Validation rules

What does the client/server require before a workout can be saved?

1. Minimum number of exercises?
2. Required title?
3. At least one set per exercise?
4. Max limits (e.g. no more than 50 exercises, no more than 20 sets per exercise)?
5. Server-side validation matches client-side?

---

## 9. Edit mode

Can a user edit an existing workout after creation?

1. Where is the entry point (from which screen)?
2. Is it the same screen as "new" with data pre-loaded, or a different screen?
3. Can they edit workouts they've already completed (sessions), or only template workouts?
4. What happens to old session data if a workout is edited after being used?

---

## 10. Known pain points & weird behaviors

Be honest. Based on code comments, TODO markers, commented-out code, or obvious hacks, list anything that looks like:

- A workaround for a bug
- An abandoned feature (half-implemented)
- Performance issues (slow render with many exercises, laggy drag-drop)
- UX inconsistencies (e.g. "Save" button in 2 places that don't do the same thing)

---

## 11. Current visual state

Tell me in one paragraph how the builder looks today compared to the rest of the app's brutalist design system (Barlow Condensed, black/white/#FF2D3F, Noto Serif JP for kanji). Is it already on-brand, or does it still have generic styling (rounded corners, shadows, wrong fonts)?

---

## 12. Related features (quick note)

Does the Workout Builder share code with:

1. The active workout screen (where users actually execute a session)?
2. The plan/program builder (creating a multi-week program)?
3. The AI plan generator?

One-line answers per feature, noting shared components/stores if any.

---

## Output instructions

- Write everything into `WORKOUT_BUILDER_CURRENT.md` at the repo root.
- Use markdown headings that match the section numbers above.
- Include file paths verbatim (copy-paste, don't retype from memory).
- Keep code snippets to 5-10 lines max. Longer snippets → just describe them.
- If a section doesn't apply (e.g. section 6 "supersets don't exist"), say so explicitly. Don't skip the heading.
- At the end, add a "## TL;DR" section with 5 bullet points summarizing the current state and any red flags I should know before redesigning.

**Do not modify any code.** This is a read-only discovery task.
