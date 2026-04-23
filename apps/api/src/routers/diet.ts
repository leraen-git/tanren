import { z } from 'zod'
import { eq, and, desc, count, isNull } from 'drizzle-orm'
import { TRPCError } from '@trpc/server'
import { router, publicProcedure, protectedProcedure } from '../trpc.js'
import {
  users,
  dietProfiles,
  dietIntakes,
  dietPlansV2,
  dietPlanDays,
  dietMeals,
  dietGroceryItems,
  dietRegenCredits,
} from '../db/schema.js'
import { encryptDietFields, decryptDietFields } from '../db/encryption.js'
import { generatePlanWithClaude } from '../lib/generatePlanWithClaude.js'
import { getRegenCreditsForCurrentWeek, getCurrentISOWeek } from '../lib/regenCredits.js'
import type { AiPlanResponse } from '../lib/dietAiSchemas.js'


async function resolveUser(db: any, userId: string) {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1)
  if (!user) throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' })
  return user
}


// ─── v2 intake input schema ─────────────────────────────────────────────────

const intakeInputV2 = z.object({
  age: z.number().int().min(16).max(100),
  biologicalSex: z.enum(['MALE', 'FEMALE']),
  heightCm: z.number().min(120).max(230),
  currentWeightKg: z.number().min(35).max(250),
  goalWeightKg: z.number().min(35).max(250).optional(),
  goalFeel: z.string().max(200).optional(),
  pace: z.enum(['STEADY', 'FAST']),
  jobType: z.enum(['DESK', 'STANDING', 'MANUAL']),
  exerciseFrequencyPerWeek: z.number().int().min(0).max(14),
  exerciseType: z.string().min(1).max(500),
  sleepHours: z.number().min(3).max(14),
  stressLevel: z.enum(['LOW', 'MODERATE', 'HIGH']),
  alcoholDrinksPerWeek: z.number().int().min(0).max(100),
  top5Meals: z.string().min(1).max(1000),
  hatedFoods: z.string().max(500).optional(),
  restrictions: z.array(z.string()).max(20),
  cookingStyle: z.enum(['HOME_COOKING', 'QUICK_SIMPLE', 'MEAL_PREP']),
  adventurousness: z.number().int().min(1).max(10),
  currentSnacks: z.string().min(1).max(500),
  snackMotivation: z.enum(['HUNGER', 'BOREDOM', 'HABIT']),
  snackPreference: z.enum(['SWEET', 'SAVOURY', 'BOTH']),
  nightSnacking: z.enum(['NEVER', 'SOMETIMES', 'OFTEN']),
}).refine(
  (data) => data.goalWeightKg !== undefined || (data.goalFeel && data.goalFeel.length > 0),
  { message: 'Either goalWeightKg or goalFeel must be provided' },
)

type IntakeInputV2 = z.infer<typeof intakeInputV2>

async function persistPlanFromAi(
  db: any,
  userId: string,
  intakeId: string,
  ai: AiPlanResponse,
): Promise<string> {
  // Mark existing v2 plans as REPLACED
  await db.update(dietPlansV2)
    .set({ status: 'REPLACED' as const, replacedAt: new Date() })
    .where(and(eq(dietPlansV2.userId, userId), eq(dietPlansV2.status, 'ACTIVE')))

  const [plan] = await db.insert(dietPlansV2).values({
    userId,
    intakeId,
    goal: ai.goal,
    bmrKcal: ai.bmrKcal,
    tdeeKcal: ai.tdeeKcal,
    targetKcal: ai.targetKcal,
    targetProteinG: ai.targetProteinG,
    targetCarbsG: ai.targetCarbsG,
    targetFatG: ai.targetFatG,
    aiExplanation: ai.explanation,
    aiPersonalRules: ai.personalRules,
    aiTimeline: ai.timeline,
    aiSupplements: ai.supplements,
    aiSnackSwaps: ai.snackSwaps,
    status: 'ACTIVE' as const,
  }).returning()

  for (const day of ai.days) {
    const [planDay] = await db.insert(dietPlanDays).values({
      planId: plan.id,
      dayNumber: day.dayNumber,
      dayLabel: day.dayLabel,
      theme: day.theme,
      targetKcal: day.targetKcal,
    }).returning()

    for (let i = 0; i < day.meals.length; i++) {
      const m = day.meals[i]!
      await db.insert(dietMeals).values({
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
        isBatchCookFriendly: m.isBatchCookFriendly,
        isLowCalTreat: m.isLowCalTreat,
        ingredients: m.ingredients,
        recipeSteps: m.recipeSteps,
        youtubeUrl: m.youtubeUrl ?? null,
      })
    }
  }

  for (let i = 0; i < ai.groceryItems.length; i++) {
    const g = ai.groceryItems[i]!
    await db.insert(dietGroceryItems).values({
      planId: plan.id,
      section: g.section,
      name: g.name,
      quantity: g.quantity,
      orderIndex: i,
    })
  }

  return plan.id
}

/** Monday 00:00:00.000 UTC of the current week */


export const dietRouter = router({
  planCount: protectedProcedure.query(async ({ ctx }) => {
    const user = await resolveUser(ctx.db, ctx.userId)
    const [row] = await ctx.db
      .select({ value: count() })
      .from(dietPlansV2)
      .where(eq(dietPlansV2.userId, user.id))
    return row?.value ?? 0
  }),

  todayMeals: protectedProcedure.query(async ({ ctx }) => {
    const user = await resolveUser(ctx.db, ctx.userId)
    const jsDay = new Date().getDay()
    const dietDow = jsDay === 0 ? 7 : jsDay

    // Try v2 plan first
    const [v2Plan] = await ctx.db
      .select()
      .from(dietPlansV2)
      .where(and(
        eq(dietPlansV2.userId, user.id),
        eq(dietPlansV2.status, 'ACTIVE'),
        isNull(dietPlansV2.deletedAt),
      ))
      .orderBy(desc(dietPlansV2.createdAt))
      .limit(1)

    if (v2Plan) {
      const [todayDayRow] = await ctx.db
        .select()
        .from(dietPlanDays)
        .where(and(eq(dietPlanDays.planId, v2Plan.id), eq(dietPlanDays.dayNumber, dietDow)))
        .limit(1)

      if (!todayDayRow) return { id: v2Plan.id, isActive: true, targetCalories: v2Plan.targetKcal, targetProtein: v2Plan.targetProteinG, targetCarbs: v2Plan.targetCarbsG, targetFat: v2Plan.targetFatG, hydrationLiters: null, todayDay: { dayOfWeek: dietDow, theme: '', meals: [] } }

      const meals = await ctx.db
        .select()
        .from(dietMeals)
        .where(eq(dietMeals.planDayId, todayDayRow.id))
        .orderBy(dietMeals.orderIndex)

      const mappedMeals = meals.map(m => ({
        id: m.id,
        type: (m.mealType ?? '').toLowerCase(),
        name: m.name,
        calories: m.kcal,
        protein: m.proteinG,
        carbs: m.carbsG,
        fat: m.fatG,
        batchCookable: m.isBatchCookFriendly,
        isTreat: m.isLowCalTreat,
        prepTime: m.prepTimeMin,
        ingredients: (m.ingredients as any[])?.map((i: any) => `${i.quantity} ${i.unit} ${i.name}`) ?? [],
        preparationSteps: (m.recipeSteps as any[])?.sort((a: any, b: any) => a.stepNumber - b.stepNumber).map((s: any) => s.instruction) ?? [],
        recipeVideoUrl: m.youtubeUrl,
        suggestedTime: m.suggestedTime,
      }))

      return {
        id: v2Plan.id,
        isActive: true,
        targetCalories: v2Plan.targetKcal,
        targetProtein: v2Plan.targetProteinG,
        targetCarbs: v2Plan.targetCarbsG,
        targetFat: v2Plan.targetFatG,
        hydrationLiters: null,
        todayDay: { dayOfWeek: dietDow, theme: todayDayRow.theme, meals: mappedMeals },
      }
    }

    return null
  }),

  savedProfile: protectedProcedure.query(async ({ ctx }) => {
    const user = await resolveUser(ctx.db, ctx.userId)
    const [profile] = await ctx.db
      .select()
      .from(dietProfiles)
      .where(eq(dietProfiles.userId, user.id))
      .limit(1)
    return profile ? decryptDietFields(profile) : null
  }),

  restoreLastPlan: protectedProcedure.mutation(async ({ ctx }) => {
    const user = await resolveUser(ctx.db, ctx.userId)
    const [latest] = await ctx.db
      .select({ id: dietPlansV2.id })
      .from(dietPlansV2)
      .where(eq(dietPlansV2.userId, user.id))
      .orderBy(desc(dietPlansV2.createdAt))
      .limit(1)
    if (!latest) throw new TRPCError({ code: 'NOT_FOUND', message: 'No previous diet plan found.' })
    await ctx.db.update(dietPlansV2).set({ status: 'ACTIVE' as const }).where(eq(dietPlansV2.id, latest.id))
    return { success: true }
  }),

  getMyPlanV2: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.userId) return null

    const [plan] = await ctx.db
      .select()
      .from(dietPlansV2)
      .where(and(
        eq(dietPlansV2.userId, ctx.userId),
        eq(dietPlansV2.status, 'ACTIVE'),
        isNull(dietPlansV2.deletedAt),
      ))
      .orderBy(desc(dietPlansV2.createdAt))
      .limit(1)

    if (!plan) return null

    const days = await ctx.db
      .select()
      .from(dietPlanDays)
      .where(eq(dietPlanDays.planId, plan.id))
      .orderBy(dietPlanDays.dayNumber)

    const dayIds = days.map(d => d.id)
    const allMeals = dayIds.length > 0
      ? await ctx.db
          .select()
          .from(dietMeals)
          .where(eq(dietMeals.planDayId, days[0]!.id))
          .then(async (first) => {
            const rest = await Promise.all(
              dayIds.slice(1).map(id =>
                ctx.db.select().from(dietMeals).where(eq(dietMeals.planDayId, id))
              )
            )
            return [...first, ...rest.flat()]
          })
      : []

    const groceryItems = await ctx.db
      .select()
      .from(dietGroceryItems)
      .where(eq(dietGroceryItems.planId, plan.id))
      .orderBy(dietGroceryItems.section, dietGroceryItems.orderIndex)

    const mealsByDay = new Map<string, typeof allMeals>()
    for (const meal of allMeals) {
      const arr = mealsByDay.get(meal.planDayId) ?? []
      arr.push(meal)
      mealsByDay.set(meal.planDayId, arr)
    }

    return {
      ...plan,
      aiPersonalRules: plan.aiPersonalRules as string[] | null,
      aiSupplements: plan.aiSupplements as Array<{ name: string; dose: string; when: string; why: string; productHint: string }> | null,
      aiSnackSwaps: plan.aiSnackSwaps as Array<{ originalSnack: string; swap: string; kcal: number }> | null,
      days: days.map(d => ({
        ...d,
        meals: (mealsByDay.get(d.id) ?? [])
          .sort((a, b) => a.orderIndex - b.orderIndex)
          .map(m => ({
            ...m,
            ingredients: m.ingredients as Array<{ name: string; quantity: string; unit: string; grocerySection: string }>,
            recipeSteps: m.recipeSteps as Array<{ stepNumber: number; instruction: string }>,
          })),
      })),
      groceryItems,
    }
  }),

  submitIntakeV2: protectedProcedure
    .input(intakeInputV2)
    .mutation(async ({ ctx, input }) => {
      const user = await resolveUser(ctx.db, ctx.userId)

      // Block if user already has an active v2 plan
      const [existing] = await ctx.db
        .select({ id: dietPlansV2.id })
        .from(dietPlansV2)
        .where(and(
          eq(dietPlansV2.userId, user.id),
          eq(dietPlansV2.status, 'ACTIVE'),
        ))
        .limit(1)

      if (existing) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Un plan actif existe déjà. Utilise la régénération.',
        })
      }


      const [intake] = await ctx.db.insert(dietIntakes).values({
        userId: user.id,
        age: input.age,
        biologicalSex: input.biologicalSex,
        heightCm: input.heightCm,
        currentWeightKg: input.currentWeightKg,
        goalWeightKg: input.goalWeightKg ?? null,
        goalFeel: input.goalFeel ?? null,
        pace: input.pace,
        jobType: input.jobType,
        exerciseFrequencyPerWeek: input.exerciseFrequencyPerWeek,
        exerciseType: input.exerciseType,
        sleepHours: input.sleepHours,
        stressLevel: input.stressLevel,
        alcoholDrinksPerWeek: input.alcoholDrinksPerWeek,
        top5Meals: input.top5Meals,
        hatedFoods: input.hatedFoods ?? null,
        restrictions: input.restrictions,
        cookingStyle: input.cookingStyle,
        adventurousness: input.adventurousness,
        currentSnacks: input.currentSnacks,
        snackMotivation: input.snackMotivation,
        snackPreference: input.snackPreference,
        nightSnacking: input.nightSnacking,
      }).returning()

      ctx.req.log.info({ event: 'ai_generation', type: 'diet_plan_v2', userId: user.id }, 'Diet v2 plan generation started')

      let ai: AiPlanResponse
      try {
        ai = await generatePlanWithClaude({
          ...input,
          goalWeightKg: input.goalWeightKg ?? null,
          goalFeel: input.goalFeel ?? null,
          hatedFoods: input.hatedFoods ?? null,
        })
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error'
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Génération du plan échouée : ${msg}`,
        })
      }

      const planId = await persistPlanFromAi(ctx.db, user.id, intake!.id, ai)
      return { planId }
    }),

  regeneratePlanV2: protectedProcedure
    .input(z.object({
      useNewIntake: z.boolean(),
      newIntake: intakeInputV2.optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const user = await resolveUser(ctx.db, ctx.userId)

      const credits = await getRegenCreditsForCurrentWeek(ctx.db, user.id)
      if (credits.used >= 2) {
        throw new TRPCError({
          code: 'TOO_MANY_REQUESTS',
          message: `Tu as utilisé tes 2 régénérations de la semaine. Reset le ${credits.resetDateLabel}.`,
        })
      }

      let intakeId: string
      if (input.useNewIntake) {
        if (!input.newIntake) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'newIntake required when useNewIntake=true' })
        }
        const [intake] = await ctx.db.insert(dietIntakes).values({
          userId: user.id,
          age: input.newIntake.age,
          biologicalSex: input.newIntake.biologicalSex,
          heightCm: input.newIntake.heightCm,
          currentWeightKg: input.newIntake.currentWeightKg,
          goalWeightKg: input.newIntake.goalWeightKg ?? null,
          goalFeel: input.newIntake.goalFeel ?? null,
          pace: input.newIntake.pace,
          jobType: input.newIntake.jobType,
          exerciseFrequencyPerWeek: input.newIntake.exerciseFrequencyPerWeek,
          exerciseType: input.newIntake.exerciseType,
          sleepHours: input.newIntake.sleepHours,
          stressLevel: input.newIntake.stressLevel,
          alcoholDrinksPerWeek: input.newIntake.alcoholDrinksPerWeek,
          top5Meals: input.newIntake.top5Meals,
          hatedFoods: input.newIntake.hatedFoods ?? null,
          restrictions: input.newIntake.restrictions,
          cookingStyle: input.newIntake.cookingStyle,
          adventurousness: input.newIntake.adventurousness,
          currentSnacks: input.newIntake.currentSnacks,
          snackMotivation: input.newIntake.snackMotivation,
          snackPreference: input.newIntake.snackPreference,
          nightSnacking: input.newIntake.nightSnacking,
        }).returning()
        intakeId = intake!.id
      } else {
        const [latest] = await ctx.db
          .select()
          .from(dietIntakes)
          .where(eq(dietIntakes.userId, user.id))
          .orderBy(desc(dietIntakes.createdAt))
          .limit(1)
        if (!latest) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Aucun intake précédent trouvé.' })
        }
        intakeId = latest.id
      }

      // Consume credit BEFORE generation
      await ctx.db.insert(dietRegenCredits).values({
        userId: user.id,
        isoWeek: getCurrentISOWeek(),
      })

      const [intake] = await ctx.db
        .select()
        .from(dietIntakes)
        .where(eq(dietIntakes.id, intakeId))
        .limit(1)

      if (!intake) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Intake not found' })
      }

      ctx.req.log.info({ event: 'ai_generation', type: 'diet_regen_v2', userId: user.id }, 'Diet v2 regeneration started')

      let ai: AiPlanResponse
      try {
        ai = await generatePlanWithClaude({
          age: intake.age,
          biologicalSex: intake.biologicalSex,
          heightCm: intake.heightCm,
          currentWeightKg: intake.currentWeightKg,
          goalWeightKg: intake.goalWeightKg,
          goalFeel: intake.goalFeel,
          pace: intake.pace,
          jobType: intake.jobType,
          exerciseFrequencyPerWeek: intake.exerciseFrequencyPerWeek,
          exerciseType: intake.exerciseType,
          sleepHours: intake.sleepHours,
          stressLevel: intake.stressLevel,
          alcoholDrinksPerWeek: intake.alcoholDrinksPerWeek,
          top5Meals: intake.top5Meals,
          hatedFoods: intake.hatedFoods,
          restrictions: intake.restrictions,
          cookingStyle: intake.cookingStyle,
          adventurousness: intake.adventurousness,
          currentSnacks: intake.currentSnacks,
          snackMotivation: intake.snackMotivation,
          snackPreference: intake.snackPreference,
          nightSnacking: intake.nightSnacking,
        })
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error'
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Régénération échouée : ${msg}`,
        })
      }

      const planId = await persistPlanFromAi(ctx.db, user.id, intakeId, ai)
      return { planId }
    }),

  deletePlanV2: protectedProcedure.mutation(async ({ ctx }) => {
    const user = await resolveUser(ctx.db, ctx.userId)
    await ctx.db.update(dietPlansV2)
      .set({ status: 'DELETED' as const, deletedAt: new Date() })
      .where(and(eq(dietPlansV2.userId, user.id), eq(dietPlansV2.status, 'ACTIVE')))
    return { success: true }
  }),

  toggleGroceryItem: protectedProcedure
    .input(z.object({ itemId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const user = await resolveUser(ctx.db, ctx.userId)

      const [item] = await ctx.db
        .select({
          id: dietGroceryItems.id,
          isChecked: dietGroceryItems.isChecked,
          planId: dietGroceryItems.planId,
        })
        .from(dietGroceryItems)
        .where(eq(dietGroceryItems.id, input.itemId))
        .limit(1)

      if (!item) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      // Verify ownership
      const [plan] = await ctx.db
        .select({ userId: dietPlansV2.userId })
        .from(dietPlansV2)
        .where(eq(dietPlansV2.id, item.planId))
        .limit(1)

      if (!plan || plan.userId !== user.id) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      const [updated] = await ctx.db.update(dietGroceryItems)
        .set({
          isChecked: !item.isChecked,
          checkedAt: !item.isChecked ? new Date() : null,
        })
        .where(eq(dietGroceryItems.id, input.itemId))
        .returning()

      return updated
    }),

  getRegenCredits: protectedProcedure.query(async ({ ctx }) => {
    const user = await resolveUser(ctx.db, ctx.userId)
    return getRegenCreditsForCurrentWeek(ctx.db, user.id)
  }),
})
