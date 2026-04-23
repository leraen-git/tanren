import Anthropic from '@anthropic-ai/sdk'
import { DIET_SYSTEM_PROMPT } from './dietSystemPrompt.js'
import { aiPlanResponseSchema, type AiPlanResponse } from './dietAiSchemas.js'

interface IntakeData {
  age: number
  biologicalSex: string
  heightCm: number
  currentWeightKg: number
  goalWeightKg: number | null
  goalFeel: string | null
  pace: string
  jobType: string
  exerciseFrequencyPerWeek: number
  exerciseType: string
  sleepHours: number
  stressLevel: string
  alcoholDrinksPerWeek: number
  top5Meals: string
  hatedFoods: string | null
  restrictions: string[]
  cookingStyle: string
  adventurousness: number
  currentSnacks: string
  snackMotivation: string
  snackPreference: string
  nightSnacking: string
}

function formatIntakeAsUserMessage(intake: IntakeData): string {
  return `Here are my answers:

SECTION 1 — STATS
- Age: ${intake.age}
- Biological sex: ${intake.biologicalSex}
- Height: ${intake.heightCm} cm
- Current weight: ${intake.currentWeightKg} kg
- Goal: ${intake.goalWeightKg ? `<user_input>${intake.goalWeightKg} kg</user_input>` : `<user_input>${intake.goalFeel ?? 'not specified'}</user_input>`}
- Pace: ${intake.pace === 'STEADY' ? 'steady and sustainable' : 'as fast as possible'}

SECTION 2 — LIFESTYLE
- Job type: ${intake.jobType}
- Exercise per week: ${intake.exerciseFrequencyPerWeek} sessions of <user_input>${intake.exerciseType}</user_input>
- Sleep: ${intake.sleepHours} hours/night
- Stress: ${intake.stressLevel}
- Alcohol: ${intake.alcoholDrinksPerWeek} drinks/week

SECTION 3 — FOOD PREFERENCES
- Top 5 meals: <user_input>${intake.top5Meals}</user_input>
- Hated foods: <user_input>${intake.hatedFoods || 'none specified'}</user_input>
- Restrictions/allergies: <user_input>${intake.restrictions.join(', ') || 'none'}</user_input>
- Cooking style: ${intake.cookingStyle}
- Adventurousness: ${intake.adventurousness}/10

SECTION 4 — SNACK HABITS
- Current snacks: <user_input>${intake.currentSnacks}</user_input>
- Snack motivation: ${intake.snackMotivation}
- Snack preference: ${intake.snackPreference}
- Night snacking: ${intake.nightSnacking}

Generate my complete 7-day plan now.`
}

export async function generatePlanWithClaude(intake: IntakeData): Promise<AiPlanResponse> {
  const apiKey = process.env['ANTHROPIC_API_KEY']
  if (!apiKey || apiKey === 'your_key_here') {
    throw new Error('AI diet generation is not configured.')
  }

  const client = new Anthropic({ apiKey })
  const userMessage = formatIntakeAsUserMessage(intake)

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 16000,
    system: DIET_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userMessage }],
  })

  if (response.stop_reason === 'max_tokens') {
    throw new Error('AI response was truncated (max_tokens). Please retry.')
  }

  const textBlock = response.content.find(c => c.type === 'text')
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('Claude returned no text content')
  }

  const cleaned = textBlock.text
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim()

  let parsed: unknown
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    throw new Error('AI response was not valid JSON. Please retry.')
  }

  return aiPlanResponseSchema.parse(parsed)
}
