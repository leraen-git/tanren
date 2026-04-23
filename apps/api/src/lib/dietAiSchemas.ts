import { z } from 'zod'

const ingredientSchema = z.object({
  name: z.string(),
  quantity: z.string(),
  unit: z.string(),
  grocerySection: z.string(),
})

const recipeStepSchema = z.object({
  stepNumber: z.number().int(),
  instruction: z.string(),
})

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
  youtubeUrl: z.string(),
  youtubeChannelName: z.string(),
  youtubeDurationSec: z.number().int(),
})

const daySchema = z.object({
  dayNumber: z.number().int().min(1).max(7),
  dayLabel: z.enum(['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']),
  theme: z.string(),
  targetKcal: z.number().int(),
  meals: z.array(mealSchema).min(3).max(6),
})

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
})

export type AiPlanResponse = z.infer<typeof aiPlanResponseSchema>
export type AiMeal = z.infer<typeof mealSchema>
export type AiIngredient = z.infer<typeof ingredientSchema>
export type AiRecipeStep = z.infer<typeof recipeStepSchema>
