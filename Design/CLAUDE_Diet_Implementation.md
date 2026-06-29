# TANREN — Diet v2 Feature Implementation

> **For Claude Code.** Complete implementation guide for the Diet feature in the Tanren mobile app. This feature powers AI-generated personalized 7-day meal plans based on a 20-input nutritionist intake, with rate-limited regeneration (2/week) to control API costs.
>
> **Mockup reference**: `Tanren_Diet_v2.html` — contains all 10 screens in both dark and light modes. Treat the mockups as the source of truth for visual design. This document handles logic, data model, API, and integration.
>
> **Ground rules**:
> - Build incrementally. One section at a time. Commit after each section.
> - Run `npm run typecheck` after every significant change.
> - Never invent API keys or hardcode secrets. Use env vars.
> - Respect the locked design palette (black/white/#FF2D3F/#E8192C, Barlow Condensed, Noto Serif JP, JetBrains Mono).
> - French throughout the UI. Metric units. Tutoiement.
> - If ambiguous: stop and ask. Do not guess on the nutritionist prompt or rate limit logic.

---

## Table of contents

- [1. Feature overview & architecture](#1-feature-overview--architecture)
- [2. Data model (Drizzle schema)](#2-data-model-drizzle-schema)
- [3. tRPC routers & procedures](#3-trpc-routers--procedures)
- [4. Claude AI integration (plan generation)](#4-claude-ai-integration-plan-generation)
- [5. Rate limiting (2 generations/week)](#5-rate-limiting-2-generationsweek)
- [6. Mobile screens & navigation](#6-mobile-screens--navigation)
- [7. Zustand stores](#7-zustand-stores)
- [8. YouTube deep linking](#8-youtube-deep-linking)
- [9. Groceries consolidation](#9-groceries-consolidation)
- [10. Testing checklist](#10-testing-checklist)

---

# 1. Feature overview & architecture

## 1.1 What this feature does

Users answer a 20-question intake (4 steps), an AI nutritionist generates a personalized 7-day meal plan with themed days, calorie targets, macros, recipes with YouTube links, and a consolidated grocery list. Users can regenerate up to 2 times per week to control API costs.

## 1.2 Out of scope (explicitly)

- **Hydration tracking**: removed per product decision.
- **Manual plan editing**: replaced by regeneration.
- **Meal check-in / tracking consumed calories**: not in v2.
- **Meal swap for a single meal**: not in v2 (full plan regeneration only).

## 1.3 High-level architecture

```
Mobile (Expo 55)
├── Intake flow (4 screens × Zustand draft store)
├── Diet tab (No Plan state | Active Plan state)
├── Meal detail modal (full-screen slide-up)
├── Regenerate screen (counter + CTA)
└── Groceries screen (interactive checklist)
         │
         │ tRPC v11
         ▼
Backend (Fastify + tRPC)
├── dietRouter
│   ├── getMyPlan (public, tolerates null)
│   ├── submitIntake (protected, rate-limited)
│   ├── regeneratePlan (protected, rate-limited 2/week)
│   ├── deletePlan (protected)
│   ├── toggleGroceryItem (protected)
│   └── getRegenCredits (protected)
│
└── Claude Opus 4.5 Anthropic API
    (nutritionist system prompt → structured JSON plan)
```

## 1.4 Technology touchpoints (what this feature uses)

- **Frontend**: Expo Router 55 (file-based routing), React Native 0.83.6, Zustand 5, custom `BottomSheetShell` for sheets, TanStack Query via tRPC React Query.
- **Backend**: Fastify 5.2.1, tRPC v11, Drizzle ORM 0.45.2, PostgreSQL, Redis for rate limiting.
- **AI**: `@anthropic-ai/sdk` for Claude API calls. Model: `claude-opus-4-7` (most advanced quality for meal plan creativity + accuracy on macros math).
- **Deep linking**: `Linking.openURL` from `expo-linking` for YouTube deep linking.

---

# 2. Data model (Drizzle schema)

Add these tables to `apps/api/src/db/schema.ts`. Create a single migration for all of them — `XXXX_diet_feature.sql`.

## 2.1 Enums

```ts
export const dietGoalEnum = pgEnum('diet_goal_enum', [
  'FAT_LOSS',
  'MUSCLE_GAIN',
  'RECOMPOSITION',
  'PERFORMANCE',
]);

export const paceEnum = pgEnum('pace_enum', [
  'STEADY',   // ~0.5 kg/week, 500 kcal deficit
  'FAST',     // ~0.7-1 kg/week, aggressive deficit
]);

export const jobTypeEnum = pgEnum('job_type_enum', [
  'DESK',     // sedentary, multiplier 1.2-1.375
  'STANDING', // light physical, 1.55
  'MANUAL',   // very/extremely active, 1.725-1.9
]);

export const stressEnum = pgEnum('stress_enum', ['LOW', 'MODERATE', 'HIGH']);

export const snackMotivationEnum = pgEnum('snack_motivation_enum', [
  'HUNGER',
  'BOREDOM',
  'HABIT',
]);

export const snackPreferenceEnum = pgEnum('snack_preference_enum', [
  'SWEET',
  'SAVOURY',
  'BOTH',
]);

export const nightSnackEnum = pgEnum('night_snack_enum', [
  'NEVER',
  'SOMETIMES',
  'OFTEN',
]);

export const cookingStyleEnum = pgEnum('cooking_style_enum', [
  'HOME_COOKING',  // from scratch, longer recipes OK
  'QUICK_SIMPLE',  // 15 min max
  'MEAL_PREP',     // batch on Sunday
]);

export const mealTypeEnum = pgEnum('meal_type_enum', [
  'BREAKFAST',
  'LUNCH',
  'DINNER',
  'SNACK',
  'DESSERT',      // always optional
]);

export const planStatusEnum = pgEnum('plan_status_enum', [
  'ACTIVE',
  'REPLACED',    // replaced by a newer plan
  'DELETED',
]);
```

## 2.2 Tables

### `diet_intakes` — stores the user's 20 answers

One row per intake submission. A user can have multiple intakes over time (when they redo the full intake during regeneration).

```ts
export const dietIntakes = pgTable('diet_intakes', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),

  // Section 1 · Stats (6 inputs)
  age: integer('age').notNull(),
  biologicalSex: text('biological_sex').notNull(), // 'MALE' | 'FEMALE'
  heightCm: numeric('height_cm', { precision: 5, scale: 1 }).notNull(),
  currentWeightKg: numeric('current_weight_kg', { precision: 5, scale: 2 }).notNull(),
  goalWeightKg: numeric('goal_weight_kg', { precision: 5, scale: 2 }), // nullable if user chose "goal look/feel"
  goalFeel: text('goal_feel'),                        // nullable if user chose "poids cible"
  pace: paceEnum('pace').notNull(),

  // Section 2 · Lifestyle (5 inputs)
  jobType: jobTypeEnum('job_type').notNull(),
  exerciseFrequencyPerWeek: integer('exercise_frequency_per_week').notNull(), // 0, 1, 2, 3, 4, 5+
  exerciseType: text('exercise_type').notNull(),       // free text
  sleepHours: numeric('sleep_hours', { precision: 3, scale: 1 }).notNull(),
  stressLevel: stressEnum('stress_level').notNull(),
  alcoholDrinksPerWeek: integer('alcohol_drinks_per_week').notNull().default(0),

  // Section 3 · Food Preferences (5 inputs)
  top5Meals: text('top_5_meals').notNull(),           // free text, comma-separated-ish
  hatedFoods: text('hated_foods'),                    // nullable
  restrictions: text('restrictions').array().notNull().default(sql`'{}'::text[]`),
    // e.g. ['VEGETARIAN', 'GLUTEN_FREE', 'NUT_FREE']
  cookingStyle: cookingStyleEnum('cooking_style').notNull(),
  adventurousness: integer('adventurousness').notNull(), // 1-10

  // Section 4 · Snack Habits (4 inputs)
  currentSnacks: text('current_snacks').notNull(),
  snackMotivation: snackMotivationEnum('snack_motivation').notNull(),
  snackPreference: snackPreferenceEnum('snack_preference').notNull(),
  nightSnacking: nightSnackEnum('night_snacking').notNull(),

  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const dietIntakesIndexes = {
  userIdIdx: index('idx_diet_intakes_user').on(dietIntakes.userId),
  createdAtIdx: index('idx_diet_intakes_created').on(dietIntakes.createdAt.desc()),
};
```

### `diet_plans` — the generated plan metadata

One active plan per user at a time, but we keep old plans for history (status = REPLACED).

```ts
export const dietPlans = pgTable('diet_plans', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  intakeId: uuid('intake_id').notNull().references(() => dietIntakes.id),

  // Computed targets
  goal: dietGoalEnum('goal').notNull(),
  bmrKcal: integer('bmr_kcal').notNull(),              // BMR from Mifflin-St Jeor
  tdeeKcal: integer('tdee_kcal').notNull(),            // TDEE after activity multiplier
  targetKcal: integer('target_kcal').notNull(),        // After deficit/surplus
  targetProteinG: integer('target_protein_g').notNull(),
  targetCarbsG: integer('target_carbs_g').notNull(),
  targetFatG: integer('target_fat_g').notNull(),

  // AI reasoning (stored as-is for transparency/debug)
  aiExplanation: text('ai_explanation'),              // why these numbers
  aiPersonalRules: jsonb('ai_personal_rules'),        // array of strings
  aiTimeline: text('ai_timeline'),                    // week-by-week projection
  aiSupplements: jsonb('ai_supplements'),             // array of { name, dose, when, why, productHint }
  aiSnackSwaps: jsonb('ai_snack_swaps'),              // array of { originalSnack, swap, kcal }

  status: planStatusEnum('status').notNull().default('ACTIVE'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  replacedAt: timestamp('replaced_at'),               // set when status -> REPLACED
  deletedAt: timestamp('deleted_at'),                 // soft delete
});

export const dietPlansIndexes = {
  // Fast lookup of active plan per user
  activeUserIdx: index('idx_diet_plans_user_active')
    .on(dietPlans.userId)
    .where(sql`status = 'ACTIVE'`),
  createdAtIdx: index('idx_diet_plans_created').on(dietPlans.createdAt.desc()),
};
```

### `diet_plan_days` — 7 days per plan

```ts
export const dietPlanDays = pgTable('diet_plan_days', {
  id: uuid('id').primaryKey().defaultRandom(),
  planId: uuid('plan_id').notNull().references(() => dietPlans.id, { onDelete: 'cascade' }),
  dayNumber: integer('day_number').notNull(),         // 1..7
  dayLabel: text('day_label').notNull(),              // "Lun", "Mar"...
  theme: text('theme').notNull(),                     // "Wok Wednesday 🥢"
  targetKcal: integer('target_kcal').notNull(),       // may differ from plan target (weekend refeed etc)
}, (t) => ({
  planDayUnique: uniqueIndex('ux_diet_plan_days').on(t.planId, t.dayNumber),
}));
```

### `diet_meals` — all meals for all days

```ts
export const dietMeals = pgTable('diet_meals', {
  id: uuid('id').primaryKey().defaultRandom(),
  planDayId: uuid('plan_day_id').notNull().references(() => dietPlanDays.id, { onDelete: 'cascade' }),
  mealType: mealTypeEnum('meal_type').notNull(),
  suggestedTime: text('suggested_time').notNull(),    // "07h30", "13h00"...
  orderIndex: integer('order_index').notNull(),       // 0, 1, 2... for sorting in a day

  name: text('name').notNull(),                       // "Wok poulet-cacahuète"
  kcal: integer('kcal').notNull(),
  proteinG: integer('protein_g').notNull(),
  carbsG: integer('carbs_g').notNull(),
  fatG: integer('fat_g').notNull(),

  prepTimeMin: integer('prep_time_min').notNull(),
  difficulty: text('difficulty'),                     // "Facile" | "Moyen" | "Difficile"
  isBatchCookFriendly: boolean('is_batch_cook_friendly').notNull().default(false),
  isLowCalTreat: boolean('is_low_cal_treat').notNull().default(false),

  ingredients: jsonb('ingredients').notNull(),        // array of { name, quantity, unit, grocerySection }
  recipeSteps: jsonb('recipe_steps').notNull(),       // array of { stepNumber, instruction }

  youtubeUrl: text('youtube_url'),                    // full YouTube URL
  youtubeChannelName: text('youtube_channel_name'),
  youtubeDurationSec: integer('youtube_duration_sec'),
});

export const dietMealsIndexes = {
  planDayIdx: index('idx_diet_meals_plan_day').on(dietMeals.planDayId),
};
```

### `diet_grocery_items` — consolidated grocery list per plan

```ts
export const dietGroceryItems = pgTable('diet_grocery_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  planId: uuid('plan_id').notNull().references(() => dietPlans.id, { onDelete: 'cascade' }),
  section: text('section').notNull(),                 // "Viandes & poissons", "Féculents"...
  name: text('name').notNull(),                       // "Blanc de poulet"
  quantity: text('quantity').notNull(),               // "1,2 kg" (string because heterogeneous)
  orderIndex: integer('order_index').notNull(),       // sorting within a section
  isChecked: boolean('is_checked').notNull().default(false),
  checkedAt: timestamp('checked_at'),
});

export const dietGroceryItemsIndexes = {
  planSectionIdx: index('idx_diet_grocery_plan_section').on(dietGroceryItems.planId, dietGroceryItems.section),
};
```

### `diet_regen_credits` — rate limit tracking

```ts
export const dietRegenCredits = pgTable('diet_regen_credits', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  usedAt: timestamp('used_at').notNull().defaultNow(),
  // ISO week number of `usedAt` for cheap aggregation
  isoWeek: text('iso_week').notNull(),                // format: "2026-W17"
});

export const dietRegenCreditsIndexes = {
  userWeekIdx: index('idx_diet_regen_user_week').on(dietRegenCredits.userId, dietRegenCredits.isoWeek),
};
```

---

# 3. tRPC routers & procedures

Create `apps/api/src/routers/diet.ts`. Export from `apps/api/src/routers/index.ts`.

## 3.1 Input validation schemas (Zod)

```ts
// apps/api/src/routers/diet.schemas.ts
import { z } from 'zod';

export const intakeInputSchema = z.object({
  // Section 1
  age: z.number().int().min(16).max(100),
  biologicalSex: z.enum(['MALE', 'FEMALE']),
  heightCm: z.number().min(120).max(230),
  currentWeightKg: z.number().min(35).max(250),
  goalWeightKg: z.number().min(35).max(250).optional(),
  goalFeel: z.string().max(200).optional(),
  pace: z.enum(['STEADY', 'FAST']),

  // Section 2
  jobType: z.enum(['DESK', 'STANDING', 'MANUAL']),
  exerciseFrequencyPerWeek: z.number().int().min(0).max(14),
  exerciseType: z.string().min(1).max(500),
  sleepHours: z.number().min(3).max(14),
  stressLevel: z.enum(['LOW', 'MODERATE', 'HIGH']),
  alcoholDrinksPerWeek: z.number().int().min(0).max(100),

  // Section 3
  top5Meals: z.string().min(1).max(1000),
  hatedFoods: z.string().max(500).optional(),
  restrictions: z.array(z.string()).max(20),
  cookingStyle: z.enum(['HOME_COOKING', 'QUICK_SIMPLE', 'MEAL_PREP']),
  adventurousness: z.number().int().min(1).max(10),

  // Section 4
  currentSnacks: z.string().min(1).max(500),
  snackMotivation: z.enum(['HUNGER', 'BOREDOM', 'HABIT']),
  snackPreference: z.enum(['SWEET', 'SAVOURY', 'BOTH']),
  nightSnacking: z.enum(['NEVER', 'SOMETIMES', 'OFTEN']),
}).refine(
  (data) => data.goalWeightKg !== undefined || (data.goalFeel && data.goalFeel.length > 0),
  { message: 'Either goalWeightKg or goalFeel must be provided' }
);

export type IntakeInput = z.infer<typeof intakeInputSchema>;
```

## 3.2 Procedures

```ts
// apps/api/src/routers/diet.ts

export const dietRouter = router({

  // PUBLIC — tolerates null (same pattern as auth.me)
  getMyPlan: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.userId) return null;

    const plan = await db.query.dietPlans.findFirst({
      where: and(
        eq(dietPlans.userId, ctx.userId),
        eq(dietPlans.status, 'ACTIVE'),
        isNull(dietPlans.deletedAt)
      ),
      with: {
        days: {
          with: { meals: true },
          orderBy: (days, { asc }) => [asc(days.dayNumber)],
        },
        groceryItems: {
          orderBy: (items, { asc }) => [asc(items.section), asc(items.orderIndex)],
        },
      },
    });

    if (!plan) return null;

    // Parse JSON fields cleanly for the client
    return {
      ...plan,
      aiPersonalRules: plan.aiPersonalRules as string[] | null,
      aiSupplements: plan.aiSupplements as Supplement[] | null,
      aiSnackSwaps: plan.aiSnackSwaps as SnackSwap[] | null,
      days: plan.days.map(d => ({
        ...d,
        meals: d.meals.map(m => ({
          ...m,
          ingredients: m.ingredients as Ingredient[],
          recipeSteps: m.recipeSteps as RecipeStep[],
        })),
      })),
    };
  }),

  // PROTECTED + RATE LIMITED — submit intake and generate plan
  submitIntake: protectedProcedure
    .input(intakeInputSchema)
    .mutation(async ({ ctx, input }) => {
      // Check if user already has an active plan → convert this to regenerate
      const existingPlan = await db.query.dietPlans.findFirst({
        where: and(
          eq(dietPlans.userId, ctx.userId),
          eq(dietPlans.status, 'ACTIVE')
        ),
      });

      if (existingPlan) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Un plan actif existe déjà. Utilise regeneratePlan.',
        });
      }

      // 1. Save intake
      const [intake] = await db.insert(dietIntakes).values({
        userId: ctx.userId,
        ...input,
      }).returning();

      // 2. Generate plan via Claude (see section 4)
      const aiResponse = await generatePlanWithClaude(intake);

      // 3. Persist plan + days + meals + grocery items in a transaction
      const plan = await db.transaction(async (tx) => {
        const [plan] = await tx.insert(dietPlans).values({
          userId: ctx.userId,
          intakeId: intake.id,
          goal: aiResponse.goal,
          bmrKcal: aiResponse.bmrKcal,
          tdeeKcal: aiResponse.tdeeKcal,
          targetKcal: aiResponse.targetKcal,
          targetProteinG: aiResponse.targetProteinG,
          targetCarbsG: aiResponse.targetCarbsG,
          targetFatG: aiResponse.targetFatG,
          aiExplanation: aiResponse.explanation,
          aiPersonalRules: aiResponse.personalRules,
          aiTimeline: aiResponse.timeline,
          aiSupplements: aiResponse.supplements,
          aiSnackSwaps: aiResponse.snackSwaps,
          status: 'ACTIVE',
        }).returning();

        // Insert 7 days + meals + grocery items
        for (const day of aiResponse.days) {
          const [planDay] = await tx.insert(dietPlanDays).values({
            planId: plan.id,
            dayNumber: day.dayNumber,
            dayLabel: day.dayLabel,
            theme: day.theme,
            targetKcal: day.targetKcal,
          }).returning();

          for (let i = 0; i < day.meals.length; i++) {
            const m = day.meals[i];
            await tx.insert(dietMeals).values({
              planDayId: planDay.id,
              mealType: m.mealType,
              suggestedTime: m.suggestedTime,
              orderIndex: i,
              name: m.name,
              kcal: m.kcal,
              proteinG: m.proteinG,
              carbsG: m.carbsG,
              fatG: m.fatG,
              prepTimeMin: m.prepTimeMin,
              difficulty: m.difficulty,
              isBatchCookFriendly: m.isBatchCookFriendly,
              isLowCalTreat: m.isLowCalTreat,
              ingredients: m.ingredients,
              recipeSteps: m.recipeSteps,
              youtubeUrl: m.youtubeUrl,
              youtubeChannelName: m.youtubeChannelName,
              youtubeDurationSec: m.youtubeDurationSec,
            });
          }
        }

        for (let i = 0; i < aiResponse.groceryItems.length; i++) {
          const g = aiResponse.groceryItems[i];
          await tx.insert(dietGroceryItems).values({
            planId: plan.id,
            section: g.section,
            name: g.name,
            quantity: g.quantity,
            orderIndex: i,
          });
        }

        return plan;
      });

      // Note: submitIntake does NOT consume a regen credit — it's the FIRST plan
      return { planId: plan.id };
    }),

  // PROTECTED + RATE LIMITED — regenerate
  regeneratePlan: protectedProcedure
    .input(z.object({
      useNewIntake: z.boolean(),
      newIntake: intakeInputSchema.optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // 1. Check regen credits
      const credits = await getRegenCreditsForCurrentWeek(ctx.userId);
      if (credits.used >= 2) {
        throw new TRPCError({
          code: 'TOO_MANY_REQUESTS',
          message: `Tu as utilisé tes 2 régénérations de la semaine. Reset le ${credits.resetDateLabel}.`,
        });
      }

      // 2. Get or create intake
      let intake;
      if (input.useNewIntake) {
        if (!input.newIntake) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'newIntake required if useNewIntake=true' });
        }
        const [newIntake] = await db.insert(dietIntakes).values({
          userId: ctx.userId,
          ...input.newIntake,
        }).returning();
        intake = newIntake;
      } else {
        // Reuse latest intake
        const latest = await db.query.dietIntakes.findFirst({
          where: eq(dietIntakes.userId, ctx.userId),
          orderBy: (t, { desc }) => [desc(t.createdAt)],
        });
        if (!latest) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Aucun intake précédent trouvé.' });
        }
        intake = latest;
      }

      // 3. Mark old plan as REPLACED
      await db.update(dietPlans)
        .set({ status: 'REPLACED', replacedAt: new Date() })
        .where(and(eq(dietPlans.userId, ctx.userId), eq(dietPlans.status, 'ACTIVE')));

      // 4. Consume credit (BEFORE generation to avoid burning a free plan on failure)
      await db.insert(dietRegenCredits).values({
        userId: ctx.userId,
        isoWeek: getCurrentISOWeek(),
      });

      // 5. Generate new plan (same logic as submitIntake step 2-3)
      // ... (extract to a shared helper `createPlanFromIntake(tx, userId, intake)`)

      return { planId: newPlan.id };
    }),

  // PROTECTED — soft delete plan
  deletePlan: protectedProcedure.mutation(async ({ ctx }) => {
    await db.update(dietPlans)
      .set({ status: 'DELETED', deletedAt: new Date() })
      .where(and(eq(dietPlans.userId, ctx.userId), eq(dietPlans.status, 'ACTIVE')));
    return { success: true };
  }),

  // PROTECTED — toggle grocery item
  toggleGroceryItem: protectedProcedure
    .input(z.object({ itemId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Verify ownership via plan
      const item = await db.query.dietGroceryItems.findFirst({
        where: eq(dietGroceryItems.id, input.itemId),
        with: { plan: true },
      });
      if (!item || item.plan.userId !== ctx.userId) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }

      const [updated] = await db.update(dietGroceryItems)
        .set({
          isChecked: !item.isChecked,
          checkedAt: !item.isChecked ? new Date() : null,
        })
        .where(eq(dietGroceryItems.id, input.itemId))
        .returning();

      return updated;
    }),

  // PROTECTED — get regen credits
  getRegenCredits: protectedProcedure.query(async ({ ctx }) => {
    return getRegenCreditsForCurrentWeek(ctx.userId);
  }),
});
```

## 3.3 Helper: regen credits

```ts
// apps/api/src/lib/regenCredits.ts
import { db } from '../db';
import { dietRegenCredits } from '../db/schema';
import { and, eq } from 'drizzle-orm';

export function getCurrentISOWeek(): string {
  const now = new Date();
  const year = now.getUTCFullYear();
  const janFirst = new Date(Date.UTC(year, 0, 1));
  const dayOfYear = Math.floor((now.getTime() - janFirst.getTime()) / 86400000);
  const weekNum = Math.ceil((dayOfYear + janFirst.getUTCDay() + 1) / 7);
  return `${year}-W${String(weekNum).padStart(2, '0')}`;
}

export function getNextMondayDate(): Date {
  const now = new Date();
  const day = now.getUTCDay();
  const daysUntilMonday = day === 0 ? 1 : 8 - day;
  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() + daysUntilMonday);
  monday.setUTCHours(0, 0, 0, 0);
  return monday;
}

export async function getRegenCreditsForCurrentWeek(userId: string) {
  const currentWeek = getCurrentISOWeek();
  const credits = await db.select().from(dietRegenCredits).where(
    and(
      eq(dietRegenCredits.userId, userId),
      eq(dietRegenCredits.isoWeek, currentWeek)
    )
  );
  const resetDate = getNextMondayDate();
  return {
    used: credits.length,
    remaining: Math.max(0, 2 - credits.length),
    total: 2,
    resetDate: resetDate.toISOString(),
    resetDateLabel: resetDate.toLocaleDateString('fr-FR', {
      weekday: 'long', day: 'numeric', month: 'long',
    }),
  };
}
```

---

# 4. Claude AI integration (plan generation)

## 4.1 System prompt (verbatim from nutritionist)

Store this in `apps/api/src/lib/dietSystemPrompt.ts` as a template string. Do not alter the wording — this is the locked nutritionist persona.

```ts
export const DIET_SYSTEM_PROMPT = `You are an expert nutritionist with 30 years of experience helping clients lose body fat sustainably without miserable dieting. You've worked with everyone from busy parents who can barely find time to cook, to athletes looking to get shredded for competition — and you know that the secret to lasting fat loss isn't bland food and brutal restriction, it's finding an approach that fits the person in front of you. Your tone is encouraging, knowledgeable, and straight-talking — like a brilliant friend who happens to have a nutrition degree and a genuine passion for helping people feel their best without giving up the foods they love.

You will receive a user's answers to a 20-question intake covering their stats, lifestyle, food preferences, and snack habits. Your job is to generate a complete JSON response with:

1. CALORIE CALCULATION (Mifflin-St Jeor)
   - Men BMR: (10 × weight_kg) + (6.25 × height_cm) − (5 × age) + 5
   - Women BMR: (10 × weight_kg) + (6.25 × height_cm) − (5 × age) − 161
   - Activity multipliers by combined job + exercise:
     * Sedentary (DESK + 0-1 exercise/week): 1.2
     * Lightly active (DESK + 2-3 exercise/week OR STANDING + 0-1): 1.375
     * Moderately active (STANDING + 2-3 exercise/week OR DESK + 4+): 1.55
     * Very active (MANUAL + 2-3 OR STANDING + 4+): 1.725
     * Extremely active (MANUAL + 4+ exercise/week): 1.9
   - Deficit: 500 kcal if pace = STEADY, 700 kcal if pace = FAST, never below 500 kcal under TDEE for active individuals
   - For MUSCLE_GAIN: surplus of 200-300 kcal
   - For RECOMPOSITION: maintenance calories
   - For PERFORMANCE: surplus of 100-200 kcal

2. MACRO TARGETS
   - Protein: 1.8-2.2 g/kg bodyweight (lean toward higher end for cut)
   - Fat: 0.8-1 g/kg bodyweight minimum
   - Carbs: remaining calories
   - Prioritize protein to preserve muscle during cut

3. 7-DAY MEAL PLAN
   - Use the user's top 5 meals as inspiration
   - Each day must have a fun theme (e.g. "Monday: Mediterranean Monday", "Wednesday: Wok Wednesday")
   - Breakfast + Lunch + Dinner mandatory per day
   - Optional dessert per day (low-cal treat preferred)
   - Snacks integrated into meal count if user has snack habits
   - Daily calorie + macro targets must be hit across all meals
   - No boring chicken and broccoli unless user specifically requested simple food
   - Flag batch-cooking-friendly meals with isBatchCookFriendly=true
   - Include at least 2 meals per week flagged isLowCalTreat=true
   - If alcoholDrinksPerWeek > 0, factor those calories into weekend days
   - For each meal, include a real YouTube recipe URL from a reputable French or international channel, with duration in seconds
   - Recipe steps must be concise (1-2 sentences each), max 6 steps

4. GROCERY LIST
   - Consolidate quantities across the week (e.g. if 3 meals use 180g chicken each, output "540g" — round up to 600g or nearest retail package)
   - Organize by section: "Viandes & poissons", "Poissons", "Féculents", "Fruits & légumes", "Produits laitiers", "Épicerie", "Surgelés"
   - Standardize quantities to retail packages (100g, 250g, 500g, 1kg, etc.)

5. PERSONAL RULES
   - 5 rules personalized to this user's specific situation (not generic)
   - If user drinks alcohol, one rule about managing that
   - If user snacks out of boredom, one rule about behavioral triggers
   - If user has night snacking habits, one rule about evening protein intake

6. TIMELINE
   - Honest week-by-week or month-by-month projection
   - Realistic expectations, motivating tone

7. SUPPLEMENTS
   - Only evidence-backed recommendations
   - Creatine monohydrate 3-5g daily always
   - Whey protein only if user struggles to hit protein target via food (based on preferences)
   - Vitamin D if winter months or low sunlight lifestyle (MANUAL + outdoor OR sedentary + no mention of outdoor activity)
   - Omega-3 if regular gym-goer or MANUAL job
   - Magnesium if sleep issues (< 7h) or high stress
   - Caffeine only if early trainer or mentions energy struggles
   - For each: dose, when to take, why relevant to THIS user, budget product hint (no brand shilling)

RESPONSE FORMAT
You MUST respond with valid JSON matching this TypeScript type exactly. Do not include markdown code fences. Do not include commentary outside the JSON.

\`\`\`typescript
{
  goal: 'FAT_LOSS' | 'MUSCLE_GAIN' | 'RECOMPOSITION' | 'PERFORMANCE';
  bmrKcal: number;
  tdeeKcal: number;
  targetKcal: number;
  targetProteinG: number;
  targetCarbsG: number;
  targetFatG: number;
  explanation: string; // 2-3 sentences explaining the calculation
  personalRules: string[]; // exactly 5
  timeline: string; // 4-6 sentences, month-by-month
  supplements: Array<{
    name: string;
    dose: string;
    when: string;
    why: string;
    productHint: string;
  }>;
  snackSwaps: Array<{
    originalSnack: string;
    swap: string;
    kcal: number;
  }>;
  days: Array<{
    dayNumber: number; // 1-7
    dayLabel: 'Lun' | 'Mar' | 'Mer' | 'Jeu' | 'Ven' | 'Sam' | 'Dim';
    theme: string; // "Wok Wednesday 🥢"
    targetKcal: number;
    meals: Array<{
      mealType: 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK' | 'DESSERT';
      suggestedTime: string; // "07h30"
      name: string;
      kcal: number;
      proteinG: number;
      carbsG: number;
      fatG: number;
      prepTimeMin: number;
      difficulty: 'Facile' | 'Moyen' | 'Difficile';
      isBatchCookFriendly: boolean;
      isLowCalTreat: boolean;
      ingredients: Array<{ name: string; quantity: string; unit: string; grocerySection: string }>;
      recipeSteps: Array<{ stepNumber: number; instruction: string }>;
      youtubeUrl: string;
      youtubeChannelName: string;
      youtubeDurationSec: number;
    }>;
  }>;
  groceryItems: Array<{
    section: string;
    name: string;
    quantity: string;
  }>;
}
\`\`\`

All text (meal names, themes, recipe steps, rules, timeline) must be in French. Use tutoiement (tu, not vous). Use metric units (kg, g, ml). Use French decimal separator (comma, not period).

If you don't know a specific YouTube URL, use a real well-known French cooking channel URL for similar recipes. Do not invent fake URLs.`;
```

## 4.2 Generation function

```ts
// apps/api/src/lib/generatePlanWithClaude.ts
import Anthropic from '@anthropic-ai/sdk';
import { DIET_SYSTEM_PROMPT } from './dietSystemPrompt';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function generatePlanWithClaude(intake: DietIntake): Promise<AiPlanResponse> {
  const userMessage = formatIntakeAsUserMessage(intake);

  const response = await anthropic.messages.create({
    model: 'claude-opus-4-7',
    max_tokens: 16000,  // plan JSON can be ~10k tokens
    system: DIET_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userMessage }],
  });

  // Claude sometimes adds leading/trailing whitespace — extract JSON defensively
  const textBlock = response.content.find(c => c.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('Claude returned no text content');
  }

  let json;
  try {
    // Strip potential markdown fences if Claude disobeyed
    const clean = textBlock.text.replace(/^```json\s*/, '').replace(/\s*```$/, '').trim();
    json = JSON.parse(clean);
  } catch (err) {
    console.error('Failed to parse Claude JSON', textBlock.text.slice(0, 500));
    throw new Error('AI response was not valid JSON. Please retry.');
  }

  // Validate with Zod
  return aiPlanResponseSchema.parse(json);
}

function formatIntakeAsUserMessage(intake: DietIntake): string {
  return `Here are my answers:

SECTION 1 — STATS
- Age: ${intake.age}
- Biological sex: ${intake.biologicalSex}
- Height: ${intake.heightCm} cm
- Current weight: ${intake.currentWeightKg} kg
- Goal: ${intake.goalWeightKg ? `${intake.goalWeightKg} kg` : intake.goalFeel}
- Pace: ${intake.pace === 'STEADY' ? 'steady and sustainable' : 'as fast as possible'}

SECTION 2 — LIFESTYLE
- Job type: ${intake.jobType}
- Exercise per week: ${intake.exerciseFrequencyPerWeek} sessions of ${intake.exerciseType}
- Sleep: ${intake.sleepHours} hours/night
- Stress: ${intake.stressLevel}
- Alcohol: ${intake.alcoholDrinksPerWeek} drinks/week

SECTION 3 — FOOD PREFERENCES
- Top 5 meals: ${intake.top5Meals}
- Hated foods: ${intake.hatedFoods || 'none specified'}
- Restrictions/allergies: ${intake.restrictions.join(', ') || 'none'}
- Cooking style: ${intake.cookingStyle}
- Adventurousness: ${intake.adventurousness}/10

SECTION 4 — SNACK HABITS
- Current snacks: ${intake.currentSnacks}
- Snack motivation: ${intake.snackMotivation}
- Snack preference: ${intake.snackPreference}
- Night snacking: ${intake.nightSnacking}

Generate my complete 7-day plan now.`;
}
```

## 4.3 AI response validation schema

```ts
// apps/api/src/lib/dietAiSchemas.ts
import { z } from 'zod';

const ingredientSchema = z.object({
  name: z.string(),
  quantity: z.string(),
  unit: z.string(),
  grocerySection: z.string(),
});

const recipeStepSchema = z.object({
  stepNumber: z.number().int(),
  instruction: z.string(),
});

const mealSchema = z.object({
  mealType: z.enum(['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK', 'DESSERT']),
  suggestedTime: z.string(),
  name: z.string(),
  kcal: z.number().int(),
  proteinG: z.number().int(),
  carbsG: z.number().int(),
  fatG: z.number().int(),
  prepTimeMin: z.number().int(),
  difficulty: z.string(),
  isBatchCookFriendly: z.boolean(),
  isLowCalTreat: z.boolean(),
  ingredients: z.array(ingredientSchema),
  recipeSteps: z.array(recipeStepSchema),
  youtubeUrl: z.string().url(),
  youtubeChannelName: z.string(),
  youtubeDurationSec: z.number().int(),
});

const daySchema = z.object({
  dayNumber: z.number().int().min(1).max(7),
  dayLabel: z.enum(['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']),
  theme: z.string(),
  targetKcal: z.number().int(),
  meals: z.array(mealSchema).min(3).max(6),
});

export const aiPlanResponseSchema = z.object({
  goal: z.enum(['FAT_LOSS', 'MUSCLE_GAIN', 'RECOMPOSITION', 'PERFORMANCE']),
  bmrKcal: z.number().int(),
  tdeeKcal: z.number().int(),
  targetKcal: z.number().int(),
  targetProteinG: z.number().int(),
  targetCarbsG: z.number().int(),
  targetFatG: z.number().int(),
  explanation: z.string(),
  personalRules: z.array(z.string()).length(5),
  timeline: z.string(),
  supplements: z.array(z.object({
    name: z.string(),
    dose: z.string(),
    when: z.string(),
    why: z.string(),
    productHint: z.string(),
  })),
  snackSwaps: z.array(z.object({
    originalSnack: z.string(),
    swap: z.string(),
    kcal: z.number().int(),
  })),
  days: z.array(daySchema).length(7),
  groceryItems: z.array(z.object({
    section: z.string(),
    name: z.string(),
    quantity: z.string(),
  })),
});

export type AiPlanResponse = z.infer<typeof aiPlanResponseSchema>;
```

---

# 5. Rate limiting (2 generations/week)

## 5.1 Logic

Rate limit is **per user per ISO week** (Monday-Sunday). Counter resets to 0 every Monday at 00:00 UTC.

- `submitIntake` does NOT consume credit (first plan is free).
- `regeneratePlan` consumes 1 credit per call, regardless of useNewIntake flag.
- If user is at 2/2: `regeneratePlan` throws `TOO_MANY_REQUESTS`.

## 5.2 Client-side credit display

The mobile app should call `getRegenCredits` on:
- Mount of the Regenerate screen.
- After a successful regeneration (to update the counter visible in the UI).

---

# 6. Mobile screens & navigation

## 6.1 Routing structure

Using Expo Router file-based routing:

```
apps/mobile/app/
├── (tabs)/
│   └── diet.tsx                    → Diet tab (No Plan OR Active Plan based on state)
├── diet/
│   ├── intake/
│   │   ├── _layout.tsx             → stack layout for intake flow
│   │   ├── stats.tsx               → Step 1
│   │   ├── lifestyle.tsx           → Step 2
│   │   ├── food-preferences.tsx    → Step 3
│   │   └── snacks.tsx              → Step 4
│   ├── generating.tsx              → Loading screen during AI generation
│   ├── meal/[id].tsx               → Meal detail modal (presentation: 'modal')
│   ├── regenerate.tsx              → Regenerate plan screen
│   └── groceries.tsx               → Grocery list
```

## 6.2 Screen implementation notes

### Diet tab (`(tabs)/diet.tsx`)
- Fetch plan via `trpc.diet.getMyPlan.useQuery()`.
- If null → render `NoPlanView`. If not null → render `ActivePlanView`.
- Day selector shows 7 day pills. Default active day = today (or closest day if no plan for today).
- Renders the theme block ("Wok Wednesday 🥢") above the calorie target.
- Optional dessert meal card styled with border-left amber instead of accent red.
- Groceries preview block at the bottom links to `/diet/groceries`.

### Intake flow
- Use a **Zustand draft store** `useIntakeDraftStore` to accumulate answers across the 4 screens.
- Each step validates its fields locally before allowing "Continuer".
- Final step ("Générer mon plan") calls `trpc.diet.submitIntake.useMutation()`.
- On mutation pending → navigate to `/diet/generating`.
- On mutation success → navigate to `/(tabs)/diet` with TanStack Query invalidation.

### Generating screen (`diet/generating.tsx`)
- Full-screen, no tab bar.
- Kanji 鍛 with pulse animation (use `react-native-reanimated`).
- 4 steps displayed statically (not dynamically tied to actual progress — the API is synchronous from the client's POV, the steps are just UX sugar).
- "Annuler" button navigates back and aborts the mutation if possible.

### Meal detail modal (`diet/meal/[id].tsx`)
- Full-screen modal presentation (Expo Router: `presentation: 'modal'` in the route config).
- Drag handle at top, swipe-down to dismiss.
- Close ✕ button in top-right.
- No video embed — replaced by a single YouTube button below the recipe.
- No "J'ai mangé" button.

### Regenerate screen (`diet/regenerate.tsx`)
- Fetch credits via `trpc.diet.getRegenCredits.useQuery()`.
- Display "1 / 2" with the slot bar and reset date label from server.
- Two radio cards: "Régénérer à l'identique" (default selected) and "Modifier mes réponses".
- CTA "Régénérer mon plan" calls `trpc.diet.regeneratePlan.useMutation()`.
- If "Modifier mes réponses" selected, route first to intake flow pre-filled with existing intake, then back to regenerate to confirm.
- If credits = 0, disable the CTA and show a disabled state explaining the reset date.
- "Supprimer mon plan" at bottom opens a confirmation alert before calling `trpc.diet.deletePlan`.

### Groceries screen (`diet/groceries.tsx`)
- Fetch plan via `trpc.diet.getMyPlan.useQuery()` to get grocery items.
- Render by section.
- Tap on an item calls `trpc.diet.toggleGroceryItem.useMutation()` with optimistic update (TanStack Query).
- Progress bar at top shows total checked / total.
- "Partager" button exports the list as formatted text via `Sharing.shareAsync` from `expo-sharing`.

---

# 7. Zustand stores

## 7.1 `useIntakeDraftStore`

```ts
// apps/mobile/src/stores/intakeDraftStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface IntakeDraft {
  // Section 1
  age?: number;
  biologicalSex?: 'MALE' | 'FEMALE';
  heightCm?: number;
  currentWeightKg?: number;
  goalWeightKg?: number;
  goalFeel?: string;
  pace?: 'STEADY' | 'FAST';

  // Section 2
  jobType?: 'DESK' | 'STANDING' | 'MANUAL';
  exerciseFrequencyPerWeek?: number;
  exerciseType?: string;
  sleepHours?: number;
  stressLevel?: 'LOW' | 'MODERATE' | 'HIGH';
  alcoholDrinksPerWeek?: number;

  // Section 3
  top5Meals?: string;
  hatedFoods?: string;
  restrictions?: string[];
  cookingStyle?: 'HOME_COOKING' | 'QUICK_SIMPLE' | 'MEAL_PREP';
  adventurousness?: number;

  // Section 4
  currentSnacks?: string;
  snackMotivation?: 'HUNGER' | 'BOREDOM' | 'HABIT';
  snackPreference?: 'SWEET' | 'SAVOURY' | 'BOTH';
  nightSnacking?: 'NEVER' | 'SOMETIMES' | 'OFTEN';
}

interface IntakeDraftState {
  draft: IntakeDraft;
  update: (patch: Partial<IntakeDraft>) => void;
  reset: () => void;
  prefillFromProfile: (profile: { heightCm?: number; weightKg?: number }) => void;
  prefillFromPreviousIntake: (intake: IntakeDraft) => void;
}

export const useIntakeDraftStore = create<IntakeDraftState>()(
  persist(
    (set, get) => ({
      draft: {},
      update: (patch) => set({ draft: { ...get().draft, ...patch } }),
      reset: () => set({ draft: {} }),
      prefillFromProfile: (profile) => set({
        draft: {
          ...get().draft,
          heightCm: profile.heightCm,
          currentWeightKg: profile.weightKg,
        },
      }),
      prefillFromPreviousIntake: (intake) => set({ draft: intake }),
    }),
    {
      name: 'intake-draft-v1',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
```

## 7.2 No diet-specific read store

Don't create a Zustand store for the plan itself — use tRPC React Query as the source of truth. Optimistic updates for `toggleGroceryItem` go through TanStack Query's `onMutate` / `onError` / `onSettled` callbacks.

---

# 8. YouTube deep linking

## 8.1 Linking behavior

```ts
// apps/mobile/src/lib/openYoutube.ts
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';

export async function openYoutubeVideo(url: string) {
  // Extract video ID from common YouTube URL formats
  const videoId = extractYoutubeId(url);
  if (!videoId) {
    // Fallback to web URL
    return Linking.openURL(url);
  }

  // Try native app first
  const nativeUrl = Platform.select({
    ios: `youtube://watch?v=${videoId}`,
    android: `vnd.youtube:${videoId}`,
  });

  if (nativeUrl) {
    const canOpen = await Linking.canOpenURL(nativeUrl);
    if (canOpen) {
      return Linking.openURL(nativeUrl);
    }
  }

  // Fallback to browser
  return Linking.openURL(url);
}

function extractYoutubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}
```

## 8.2 iOS Info.plist update required

For `canOpenURL` to work with `youtube://` on iOS, add to `ios/tanren/Info.plist`:

```xml
<key>LSApplicationQueriesSchemes</key>
<array>
  <string>youtube</string>
</array>
```

If you're using Expo's managed workflow, add this via `app.config.ts`:

```ts
export default {
  expo: {
    ios: {
      infoPlist: {
        LSApplicationQueriesSchemes: ['youtube'],
      },
    },
  },
};
```

---

# 9. Groceries consolidation

The AI is responsible for consolidation (see system prompt section 4). Server-side, no additional logic needed — just persist what Claude returns.

**Edge case to handle**: if Claude returns grocery items with incompatible quantity formats in the same name (e.g. "Tomates · 500g" in one meal, "Tomates · 3 pièces" in another), the AI should already consolidate. If it doesn't, accept both entries as separate rows — don't try to post-process.

---

# 10. Testing checklist

Before considering this feature complete, verify:

## Functional
- [ ] User with no plan sees Diet tab in No Plan state.
- [ ] Submitting intake successfully generates a plan (expect ~15-25s wait).
- [ ] Plan displays correctly with day theme, cal target, macros, and meals.
- [ ] Day selector works — tapping Mer. shows Mer. 23's meals.
- [ ] Optional dessert is visually distinct (amber border-left).
- [ ] Tapping a meal opens the full-screen modal.
- [ ] YouTube button opens app or web, never a broken deep link.
- [ ] Groceries preview block on plan page links to groceries screen.
- [ ] Groceries checkboxes persist after refresh.
- [ ] Regenerate screen shows "2 / 2" initially.
- [ ] After 1 regeneration, counter shows "1 / 2".
- [ ] After 2 regenerations, CTA is disabled with explanation.
- [ ] Regenerate with "Modifier mes réponses" re-uses draft store and navigates through intake.
- [ ] Delete plan reverts to No Plan state without consuming a credit.

## Edge cases
- [ ] User closes app mid-generation → plan not created, no credit consumed.
- [ ] Claude returns malformed JSON → user sees a friendly error, no credit consumed.
- [ ] User submits intake with a plan already active → 409 CONFLICT.
- [ ] User with existing plan navigates to intake manually → redirect to regenerate.
- [ ] Network error mid-generation → no partial plan in DB (transaction rollback).
- [ ] Midnight UTC on Monday → counter resets automatically (verified with DB query).

## Security
- [ ] `toggleGroceryItem` rejects items not owned by the user.
- [ ] `getMyPlan` returns null for unauthenticated users, not an error.
- [ ] `regeneratePlan` rate limit is enforced server-side (not just UI-hidden CTA).
- [ ] Claude API key is never logged, never returned to client.

## UX / Design
- [ ] Dark mode matches mockup: #000 bg, #FF2D3F accent, #FFF text.
- [ ] Light mode matches mockup: #FFF bg, #E8192C accent, #000 text.
- [ ] All typography uses Barlow Condensed (bold/black for headings), Noto Serif JP for kanji, JetBrains Mono for numbers.
- [ ] No emojis outside of the day themes (e.g. "Wok Wednesday 🥢" is allowed, generic emojis in buttons are not).
- [ ] All French text uses tutoiement consistently.
- [ ] All decimal numbers use French comma format.

---

## Commit sequence

Work in this order. Stop after each commit for validation before moving on:

```
1. feat(db): diet feature schema (all 6 tables + enums + indexes)
2. feat(api): diet router scaffolding with empty procedures
3. feat(api): Claude integration + system prompt + AI schema validation
4. feat(api): submitIntake procedure + transaction persistence
5. feat(api): regeneratePlan + rate limit + credits helper
6. feat(api): toggleGroceryItem + deletePlan + getRegenCredits
7. feat(mobile): intake draft Zustand store
8. feat(mobile): 4 intake screens with validation
9. feat(mobile): generating screen with kanji pulse
10. feat(mobile): Diet tab No Plan state
11. feat(mobile): Diet tab Active Plan state + day selector
12. feat(mobile): meal detail modal with YouTube deep link
13. feat(mobile): regenerate screen with credits counter
14. feat(mobile): groceries screen with checklist
15. feat(mobile): groceries preview block on Active Plan page
16. chore: iOS LSApplicationQueriesSchemes for youtube:// scheme
17. test: e2e intake → generate → display plan
```

---

## Environment variables to add

```
ANTHROPIC_API_KEY=sk-ant-...
```

Add to `apps/api/.env.example`, `apps/api/.env.local` (locally), and production secret manager.

---

## Cost estimation (for context)

- Claude Opus 4.5 input: ~$15/M tokens, output: ~$75/M tokens.
- Average intake prompt: ~1500 input tokens (system + user).
- Average response: ~10000 output tokens (full JSON plan).
- Cost per generation: ~(1500 × 15 + 10000 × 75) / 1M = **~$0.77 per plan**.
- At 2 regens/week cap + initial submit: max 3 generations/user/week = **$2.31/user/week** ceiling.
- Monthly: ~$10/user hard ceiling.
- This is why the 2/week limit exists. Without it, a motivated user could burn $50/month in API cost alone.

---

## Don't

- Don't call Claude from the mobile app directly. The API key must never ship in the client bundle.
- Don't try to stream the response. Claude's JSON output is not streamable usefully — wait for the full response.
- Don't cache plans across users. Each plan is personalized; caching is a privacy/correctness hazard.
- Don't expose `aiExplanation` / `aiTimeline` / `aiSupplements` blindly in a general UI section — they're for future screens (V1.1 will add an "AI notes" section). For V1.0, keep them in the DB, don't render.
- Don't allow arbitrary intake field changes without triggering regeneration. Changing goalWeightKg without regenerating = stale plan.

---

*Forge it. Test it. Ship it.*

*Tanren · Une rep après l'autre.*
