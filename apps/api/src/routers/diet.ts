import { z } from 'zod'
import { eq, and, desc, gte, count } from 'drizzle-orm'
import { TRPCError } from '@trpc/server'
import Anthropic from '@anthropic-ai/sdk'
import { router, protectedProcedure } from '../trpc.js'
import { users, dietProfiles, dietPlans } from '../db/schema.js'

async function resolveUser(db: any, clerkId: string) {
  const [user] = await db.select().from(users).where(eq(users.clerkId, clerkId)).limit(1)
  if (!user) throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' })
  return user
}

const AI_GENERATION_LIMIT = 2

/** Monday 00:00:00.000 UTC of the current week */
function startOfWeekUTC(): Date {
  const now = new Date()
  const day = now.getUTCDay() // 0=Sun, 1=Mon … 6=Sat
  const diff = day === 0 ? -6 : 1 - day // days back to Monday
  const monday = new Date(now)
  monday.setUTCDate(now.getUTCDate() + diff)
  monday.setUTCHours(0, 0, 0, 0)
  return monday
}

const dietPlanSchema = z.object({
  summary: z.object({
    bmr: z.number(),
    tdee: z.number(),
    targetCalories: z.number(),
    targetProtein: z.number(),
    targetCarbs: z.number(),
    targetFat: z.number(),
    hydrationLiters: z.number(),
    calculationExplanation: z.string(),
    macroExplanation: z.string(),
  }),
  days: z.array(z.object({
    dayOfWeek: z.number().int().min(1).max(7), // 1=Mon, 7=Sun
    theme: z.string(),
    totalCalories: z.number(),
    totalProtein: z.number(),
    totalCarbs: z.number(),
    totalFat: z.number(),
    meals: z.array(z.object({
      type: z.enum(['breakfast', 'lunch', 'snack', 'dinner', 'dessert']),
      name: z.string(),
      calories: z.number(),
      protein: z.number(),
      carbs: z.number(),
      fat: z.number(),
      batchCookable: z.boolean().optional(),
      isTreat: z.boolean().optional(),
      prepTime: z.number().optional(),             // minutes
      ingredients: z.array(z.string()).optional(), // e.g. ["200g chicken breast", "1 tbsp olive oil"]
      preparationSteps: z.array(z.string()).optional(),
      recipeVideoUrl: z.string().optional(),        // YouTube search URL or direct link
    })),
  })),
  snackSwaps: z.array(z.object({
    original: z.string(),
    swap: z.string(),
    calories: z.number(),
    note: z.string(),
  })),
  rules: z.array(z.string()),
  timeline: z.string(),
  hydrationTips: z.array(z.string()),
  hydrationFatLossExplanation: z.string(),
  supplements: z.array(z.object({
    name: z.string(),
    dose: z.string(),
    timing: z.string(),
    reason: z.string(),
    budget: z.string(),
  })),
})

type DietPlan = z.infer<typeof dietPlanSchema>

const intakeSchema = z.object({
  // From user profile (pre-filled)
  age: z.number().int().min(10).max(120),
  sex: z.string(),
  goalWeight: z.number().nullable(),
  goalPace: z.enum(['steady', 'fast']),
  // Lifestyle
  jobType: z.string().min(1),
  exerciseFrequency: z.string().min(1),
  sleepHours: z.number().min(3).max(12),
  stressLevel: z.enum(['low', 'moderate', 'high']),
  alcoholPerWeek: z.string(),
  // Food preferences
  favoriteFoods: z.array(z.string()),
  hatedFoods: z.string(),
  dietaryRestrictions: z.string(),
  cookingStyle: z.enum(['scratch', 'quick', 'batch']),
  foodAdventure: z.number().int().min(1).max(10),
  // Snack habits
  currentSnacks: z.string(),
  snackReason: z.enum(['hunger', 'boredom', 'habit']),
  snackPreference: z.enum(['sweet', 'savoury', 'both']),
  nightSnacking: z.boolean(),
})

export const dietRouter = router({
  activePlan: protectedProcedure.query(async ({ ctx }) => {
    const user = await resolveUser(ctx.db, ctx.userId)
    const [plan] = await ctx.db
      .select()
      .from(dietPlans)
      .where(and(eq(dietPlans.userId, user.id), eq(dietPlans.isActive, true)))
      .orderBy(desc(dietPlans.createdAt))
      .limit(1)
    return plan ?? null
  }),

  // Lightweight query for the home screen — returns only today's meals instead
  // of the full 7-day rawPlan JSON (~100 KB). Invalidated by generatePlan/deletePlan.
  todayMeals: protectedProcedure.query(async ({ ctx }) => {
    const user = await resolveUser(ctx.db, ctx.userId)
    const [plan] = await ctx.db
      .select({
        id: dietPlans.id,
        isActive: dietPlans.isActive,
        targetCalories: dietPlans.targetCalories,
        targetProtein: dietPlans.targetProtein,
        targetCarbs: dietPlans.targetCarbs,
        targetFat: dietPlans.targetFat,
        hydrationLiters: dietPlans.hydrationLiters,
        rawPlan: dietPlans.rawPlan,
      })
      .from(dietPlans)
      .where(and(eq(dietPlans.userId, user.id), eq(dietPlans.isActive, true)))
      .orderBy(desc(dietPlans.createdAt))
      .limit(1)

    if (!plan) return null

    const jsDay = new Date().getDay()         // 0=Sun … 6=Sat
    const dietDow = jsDay === 0 ? 7 : jsDay  // 1=Mon … 7=Sun
    const raw = plan.rawPlan as any
    const todayDay = (raw?.days as any[])?.find((d: any) => d.dayOfWeek === dietDow) ?? null

    return {
      id: plan.id,
      isActive: plan.isActive,
      targetCalories: plan.targetCalories,
      targetProtein: plan.targetProtein,
      targetCarbs: plan.targetCarbs,
      targetFat: plan.targetFat,
      hydrationLiters: plan.hydrationLiters,
      todayDay,
    }
  }),

  savedProfile: protectedProcedure.query(async ({ ctx }) => {
    const user = await resolveUser(ctx.db, ctx.userId)
    const [profile] = await ctx.db
      .select()
      .from(dietProfiles)
      .where(eq(dietProfiles.userId, user.id))
      .limit(1)
    return profile ?? null
  }),

  generatePlan: protectedProcedure
    .input(intakeSchema)
    .mutation(async ({ ctx, input }) => {
      const apiKey = process.env.ANTHROPIC_API_KEY
      if (!apiKey || apiKey === 'your_key_here') {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'AI diet generation is not configured.' })
      }

      const user = await resolveUser(ctx.db, ctx.userId)

      // Rate limit: max 2 AI diet plan generations per week
      const weekStart = startOfWeekUTC()
      const [{ value: generationsThisWeek }] = await ctx.db
        .select({ value: count() })
        .from(dietPlans)
        .where(and(eq(dietPlans.userId, user.id), gte(dietPlans.createdAt, weekStart)))

      if (generationsThisWeek >= AI_GENERATION_LIMIT) {
        throw new TRPCError({
          code: 'TOO_MANY_REQUESTS',
          message: `You've already generated ${AI_GENERATION_LIMIT} diet plans this week. Your limit resets on Monday.`,
        })
      }

      // Save/update intake profile
      const existing = await ctx.db
        .select({ id: dietProfiles.id })
        .from(dietProfiles)
        .where(eq(dietProfiles.userId, user.id))
        .limit(1)

      const profileData = {
        userId: user.id,
        age: input.age,
        sex: input.sex,
        goalWeight: input.goalWeight ?? null,
        goalPace: input.goalPace,
        jobType: input.jobType,
        exerciseFrequency: input.exerciseFrequency,
        sleepHours: input.sleepHours,
        stressLevel: input.stressLevel,
        alcoholPerWeek: input.alcoholPerWeek,
        favoriteFoods: input.favoriteFoods,
        hatedFoods: input.hatedFoods,
        dietaryRestrictions: input.dietaryRestrictions,
        cookingStyle: input.cookingStyle,
        foodAdventure: input.foodAdventure,
        currentSnacks: input.currentSnacks,
        snackReason: input.snackReason,
        snackPreference: input.snackPreference,
        nightSnacking: input.nightSnacking,
        updatedAt: new Date(),
      }

      if (existing[0]) {
        await ctx.db.update(dietProfiles).set(profileData).where(eq(dietProfiles.userId, user.id))
      } else {
        await ctx.db.insert(dietProfiles).values(profileData)
      }

      const heightCm = user.heightCm ?? 170
      const weightKg = user.weightKg ?? 70
      const goalWeightStr = input.goalWeight ? `${input.goalWeight}kg` : 'not specified'
      const cookingLabels = { scratch: 'from scratch', quick: 'quick meals', batch: 'batch meal prep' }
      const paceLabel = input.goalPace === 'fast' ? 'as fast as possible' : 'steady and sustainable'

      const systemPrompt = `You are an expert nutritionist with 30 years of experience helping clients lose body fat sustainably without miserable dieting. You've worked with everyone from busy parents who can barely find time to cook, to athletes looking to get shredded for competition — and you know that the secret to lasting fat loss isn't bland food and brutal restriction, it's finding an approach that fits the person in front of you. Your tone is encouraging, knowledgeable, and straight-talking — like a brilliant friend who happens to have a nutrition degree and a genuine passion for helping people feel their best without giving up the foods they love.

You have already collected all the user's information. Now generate their full personalised diet plan.

Return ONLY a valid JSON object — no markdown, no explanation, nothing else before or after. Use this exact structure:

{
  "summary": {
    "bmr": <number>,
    "tdee": <number>,
    "targetCalories": <number>,
    "targetProtein": <number>,
    "targetCarbs": <number>,
    "targetFat": <number>,
    "hydrationLiters": <number>,
    "calculationExplanation": "<full step-by-step calorie calculation as friendly prose>",
    "macroExplanation": "<why these macros, plain English>"
  },
  "days": [
    {
      "dayOfWeek": <1-7, 1=Monday>,
      "theme": "<e.g. Mediterranean Monday>",
      "totalCalories": <number>,
      "totalProtein": <number>,
      "totalCarbs": <number>,
      "totalFat": <number>,
      "meals": [
        {
          "type": "breakfast" | "lunch" | "snack" | "dinner" | "dessert",
          "name": "<meal name>",
          "calories": <number>,
          "protein": <number>,
          "carbs": <number>,
          "fat": <number>,
          "batchCookable": <true|false>,
          "isTreat": <true|false>,
          "prepTime": <minutes as integer>,
          "ingredients": ["<quantity + ingredient>", ...],
          "preparationSteps": ["<step 1>", "<step 2>", ...],
          "recipeVideoUrl": "<YouTube search URL: https://www.youtube.com/results?search_query=<meal+name+recipe>>"
        }
      ]
    }
  ],
  "snackSwaps": [
    { "original": "<their snack>", "swap": "<better alternative>", "calories": <number>, "note": "<why it works>" }
  ],
  "rules": ["<5 personalised rules as strings>"],
  "timeline": "<honest week-by-week projection as prose>",
  "hydrationTips": ["<3-4 practical tips>"],
  "hydrationFatLossExplanation": "<why hydration matters for fat loss>",
  "supplements": [
    { "name": "<name>", "dose": "<dose>", "timing": "<when>", "reason": "<why for this person>", "budget": "<product suggestion>" }
  ]
}

RULES:
- days array must have exactly 7 entries (dayOfWeek 1 through 7)
- Every day must hit the target calories and macros across all meals
- Protein must hit the daily target — do not leave shortfalls
- No boring chicken and broccoli unless explicitly requested
- Every day needs a fun theme/title
- Meals must appear in this order within each day's meals array: breakfast → lunch → snack → dinner → dessert (dessert is optional)
- Each day must have exactly ONE breakfast, ONE lunch, ONE snack (afternoon), ONE dinner. Dessert is optional.
- NEVER use "breakfast" type more than once per day — use "snack" for any mid-day or afternoon snack
- At least 2 meals per week that feel like a treat but are secretly low calorie (mark isTreat: true)
- At least 3 meals marked batchCookable: true
- If user drinks alcohol, factor those calories into relevant days
- Use Mifflin-St Jeor for BMR. Apply the correct activity multiplier based on job AND exercise combined
- Set deficit of 500 kcal below TDEE
- Never go below 500 kcal under TDEE for active individuals
- Prioritise protein to preserve muscle during the cut
- Recommend only evidence-backed supplements`

      const userMessage = `Here is my information:

SECTION 1 — MY STATS:
- Age: ${input.age}
- Sex: ${input.sex}
- Height: ${heightCm}cm
- Current weight: ${weightKg}kg
- Goal weight: ${goalWeightStr}
- Pace: ${paceLabel}

SECTION 2 — MY LIFESTYLE:
- Job type: ${input.jobType}
- Exercise: ${input.exerciseFrequency}
- Sleep: ${input.sleepHours} hours/night
- Stress: ${input.stressLevel}
- Alcohol: ${input.alcoholPerWeek}

SECTION 3 — MY FOOD PREFERENCES:
- Favourite meals: ${input.favoriteFoods.join(', ')}
- Foods I hate: ${input.hatedFoods || 'none'}
- Dietary restrictions: ${input.dietaryRestrictions || 'none'}
- Cooking style: ${cookingLabels[input.cookingStyle]}
- Food adventure level: ${input.foodAdventure}/10

SECTION 4 — MY SNACK HABITS:
- Current snacks: ${input.currentSnacks || 'nothing specific'}
- Snack reason: ${input.snackReason}
- Preference: ${input.snackPreference}
- Night snacking: ${input.nightSnacking ? 'yes' : 'no'}

Now generate my complete diet plan as JSON.`

      const client = new Anthropic({ apiKey })

      const response = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 16000,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      })

      // Warn if the model hit the token limit — response will be truncated JSON
      if (response.stop_reason === 'max_tokens') {
        console.error('[diet] Generation hit max_tokens — response was truncated')
      }

      const text = response.content[0]?.type === 'text' ? response.content[0].text : ''
      const cleaned = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()

      let plan: DietPlan
      try {
        const parsed = JSON.parse(cleaned)
        plan = dietPlanSchema.parse(parsed)
      } catch (err) {
        console.error('[diet] Failed to parse AI response:', err)
        console.error('[diet] Raw response (first 500 chars):', cleaned.slice(0, 500))
        const detail = err instanceof SyntaxError
          ? 'The AI response was not valid JSON (possibly truncated).'
          : 'The AI response did not match the expected structure.'
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Diet plan generation failed: ${detail} Please try again.`,
        })
      }

      // Deactivate old plans
      await ctx.db.update(dietPlans).set({ isActive: false }).where(eq(dietPlans.userId, user.id))

      // Save new plan
      const [saved] = await ctx.db.insert(dietPlans).values({
        userId: user.id,
        isActive: true,
        targetCalories: plan.summary.targetCalories,
        targetProtein: plan.summary.targetProtein,
        targetCarbs: plan.summary.targetCarbs,
        targetFat: plan.summary.targetFat,
        hydrationLiters: plan.summary.hydrationLiters,
        rawPlan: plan as any,
      }).returning()

      return saved
    }),

  deletePlan: protectedProcedure.mutation(async ({ ctx }) => {
    const user = await resolveUser(ctx.db, ctx.userId)
    await ctx.db.update(dietPlans).set({ isActive: false }).where(eq(dietPlans.userId, user.id))
    return { success: true }
  }),

  // Reactivate the most recently created plan (useful if user deactivated without generating a new one)
  restoreLastPlan: protectedProcedure.mutation(async ({ ctx }) => {
    const user = await resolveUser(ctx.db, ctx.userId)
    const [latest] = await ctx.db
      .select({ id: dietPlans.id })
      .from(dietPlans)
      .where(eq(dietPlans.userId, user.id))
      .orderBy(desc(dietPlans.createdAt))
      .limit(1)
    if (!latest) throw new TRPCError({ code: 'NOT_FOUND', message: 'No previous diet plan found.' })
    await ctx.db.update(dietPlans).set({ isActive: true }).where(eq(dietPlans.id, latest.id))
    return { success: true }
  }),
})
