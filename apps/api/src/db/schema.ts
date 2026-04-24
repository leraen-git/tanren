import {
  pgTable,
  text,
  integer,
  real,
  numeric,
  boolean,
  timestamp,
  pgEnum,
  jsonb,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

// ─── Enums ────────────────────────────────────────────────────────────────────

export const authProviderEnum = pgEnum('auth_provider_enum', ['apple', 'google', 'email', 'guest'])
export const userLevelEnum = pgEnum('user_level', ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'])
export const userGoalEnum = pgEnum('user_goal', ['WEIGHT_LOSS', 'MUSCLE_GAIN', 'MAINTENANCE'])
export const difficultyEnum = pgEnum('difficulty', ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'])
export const sessionStatusEnum = pgEnum('session_status_enum', ['IN_PROGRESS', 'DONE', 'ABANDONED'])

// ─── Diet v2 Enums ───────────────────────────────────────────────────────────

export const dietGoalEnum = pgEnum('diet_goal_enum', ['FAT_LOSS', 'MUSCLE_GAIN', 'RECOMPOSITION', 'PERFORMANCE'])
export const paceEnum = pgEnum('pace_enum', ['STEADY', 'FAST'])
export const jobTypeEnum = pgEnum('job_type_enum', ['DESK', 'STANDING', 'MANUAL'])
export const stressEnum = pgEnum('stress_enum', ['LOW', 'MODERATE', 'HIGH'])
export const snackMotivationEnum = pgEnum('snack_motivation_enum', ['HUNGER', 'BOREDOM', 'HABIT'])
export const snackPreferenceEnum = pgEnum('snack_preference_enum', ['SWEET', 'SAVOURY', 'BOTH'])
export const nightSnackEnum = pgEnum('night_snack_enum', ['NEVER', 'SOMETIMES', 'OFTEN'])
export const cookingStyleEnum = pgEnum('cooking_style_enum', ['HOME_COOKING', 'QUICK_SIMPLE', 'MEAL_PREP'])
export const mealTypeEnum = pgEnum('meal_type_enum', ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK', 'DESSERT'])
export const planStatusEnum = pgEnum('plan_status_enum', ['ACTIVE', 'REPLACED', 'DELETED'])

// ─── Users ────────────────────────────────────────────────────────────────────

export const users = pgTable('users', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  authId: text('auth_id').notNull().unique(),
  authProvider: authProviderEnum('auth_provider').notNull().default('apple'),
  name: text('name').notNull(),
  email: text('email').notNull(),
  emailHash: text('email_hash'),
  avatarUrl: text('avatar_url'),
  level: userLevelEnum('level').notNull().default('BEGINNER'),
  goal: userGoalEnum('goal').notNull().default('MUSCLE_GAIN'),
  weeklyTarget: integer('weekly_target').notNull().default(3),
  heightCm: numeric('height_cm', { precision: 5, scale: 1, mode: 'number' }),
  weightKg: numeric('weight_kg', { precision: 5, scale: 1, mode: 'number' }),
  gender: text('gender'),
  onboardingDone: boolean('onboarding_done').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  deletedAt: timestamp('deleted_at'),
})

// ─── Exercises ────────────────────────────────────────────────────────────────

export const exercises = pgTable('exercises', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  nameFr: text('name_fr'),
  muscleGroups: text('muscle_groups').array().notNull().default([]),
  equipment: text('equipment').array().notNull().default([]),
  description: text('description').notNull().default(''),
  descriptionFr: text('description_fr'),
  videoUrl: text('video_url'),
  imageUrl: text('image_url'),
  difficulty: difficultyEnum('difficulty').notNull().default('BEGINNER'),
  isCustom: boolean('is_custom').notNull().default(false),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }),
})

// ─── Workout Templates ────────────────────────────────────────────────────────

export const workoutTemplates = pgTable('workout_templates', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  muscleGroups: text('muscle_groups').array().notNull().default([]),
  estimatedDuration: integer('estimated_duration').notNull().default(60),
  isTemplate: boolean('is_template').notNull().default(true),
  isProgramWorkout: boolean('is_program_workout').notNull().default(false),
  order: integer('order').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

// ─── Workout Exercises ────────────────────────────────────────────────────────

export const workoutExercises = pgTable('workout_exercises', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  workoutTemplateId: text('workout_template_id').notNull().references(() => workoutTemplates.id, { onDelete: 'cascade' }),
  exerciseId: text('exercise_id').notNull().references(() => exercises.id),
  order: integer('order').notNull().default(0),
  defaultSets: integer('default_sets').notNull().default(3),
  defaultReps: integer('default_reps').notNull().default(10),
  defaultWeight: real('default_weight').notNull().default(0),
  defaultRestSeconds: integer('default_rest_seconds').notNull().default(90),
  notes: text('notes'),
})

// ─── Workout Sessions ─────────────────────────────────────────────────────────

export const workoutSessions = pgTable('workout_sessions', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  workoutTemplateId: text('workout_template_id').notNull().references(() => workoutTemplates.id),
  startedAt: timestamp('started_at').notNull().defaultNow(),
  status: sessionStatusEnum('status').notNull().default('IN_PROGRESS'),
  completedAt: timestamp('completed_at'),
  durationSeconds: integer('duration_seconds').notNull().default(0),
  totalVolume: real('total_volume').notNull().default(0),
  notes: text('notes'),
  perceivedExertion: integer('perceived_exertion'),
}, (table) => [
  index('ws_user_started_idx').on(table.userId, table.startedAt),
  index('ws_user_template_idx').on(table.userId, table.workoutTemplateId),
])

// ─── Session Exercises ────────────────────────────────────────────────────────

export const sessionExercises = pgTable('session_exercises', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  workoutSessionId: text('workout_session_id').notNull().references(() => workoutSessions.id, { onDelete: 'cascade' }),
  exerciseId: text('exercise_id').notNull().references(() => exercises.id),
  order: integer('order').notNull().default(0),
}, (table) => [
  index('se_session_idx').on(table.workoutSessionId),
  index('se_exercise_idx').on(table.exerciseId),
])

// ─── Exercise Sets ────────────────────────────────────────────────────────────

export const exerciseSets = pgTable('exercise_sets', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  sessionExerciseId: text('session_exercise_id').notNull().references(() => sessionExercises.id, { onDelete: 'cascade' }),
  setNumber: integer('set_number').notNull(),
  reps: integer('reps').notNull().default(0),
  weight: real('weight').notNull().default(0),
  restSeconds: integer('rest_seconds').notNull().default(90),
  isCompleted: boolean('is_completed').notNull().default(false),
  isPR: boolean('is_pr').notNull().default(false),
  completedAt: timestamp('completed_at'),
  notes: text('notes'),
}, (table) => [
  index('es_session_exercise_idx').on(table.sessionExerciseId),
  index('es_is_pr_idx').on(table.sessionExerciseId, table.isPR),
])

// ─── Programs ─────────────────────────────────────────────────────────────────

export const programs = pgTable('programs', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  description: text('description').notNull().default(''),
  level: userLevelEnum('level').notNull(),
  goal: userGoalEnum('goal').notNull(),
  durationWeeks: integer('duration_weeks').notNull(),
  sessionsPerWeek: integer('sessions_per_week').notNull(),
  imageUrl: text('image_url'),
  isOfficial: boolean('is_official').notNull().default(false),
})

// ─── Program Enrollments ──────────────────────────────────────────────────────

export const programEnrollments = pgTable('program_enrollments', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  programId: text('program_id').notNull().references(() => programs.id),
  startedAt: timestamp('started_at').notNull().defaultNow(),
  currentWeek: integer('current_week').notNull().default(1),
  isActive: boolean('is_active').notNull().default(true),
})

// ─── Workout Plans ────────────────────────────────────────────────────────────

export const workoutPlans = pgTable('workout_plans', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  isActive: boolean('is_active').notNull().default(false),
  generatedByAi: boolean('generated_by_ai').notNull().default(false),
  startDate: timestamp('start_date').notNull().defaultNow(),
  endDate: timestamp('end_date'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

// ─── Workout Plan Days ─────────────────────────────────────────────────────────
// dayOfWeek: 0 = Sunday, 1 = Monday, ..., 6 = Saturday

export const workoutPlanDays = pgTable('workout_plan_days', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  planId: text('plan_id').notNull().references(() => workoutPlans.id, { onDelete: 'cascade' }),
  dayOfWeek: integer('day_of_week').notNull(), // 0–6
  workoutTemplateId: text('workout_template_id').notNull().references(() => workoutTemplates.id),
})

// ─── Personal Records ─────────────────────────────────────────────────────────

export const personalRecords = pgTable('personal_records', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  exerciseId: text('exercise_id').notNull().references(() => exercises.id),
  weight: real('weight').notNull(),
  reps: integer('reps').notNull(),
  volume: real('volume').notNull(),
  achievedAt: timestamp('achieved_at').notNull().defaultNow(),
  sessionId: text('session_id').notNull().references(() => workoutSessions.id, { onDelete: 'cascade' }),
}, (table) => [
  index('pr_user_exercise_idx').on(table.userId, table.exerciseId),
])

// ─── Diet Profiles ────────────────────────────────────────────────────────────

export const dietProfiles = pgTable('diet_profiles', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().unique().references(() => users.id, { onDelete: 'cascade' }),
  age: integer('age').notNull(),
  sex: text('sex').notNull(), // 'male' | 'female'
  goalWeight: real('goal_weight'),
  goalPace: text('goal_pace').notNull().default('steady'), // 'steady' | 'fast'
  jobType: text('job_type').notNull(),
  exerciseFrequency: text('exercise_frequency').notNull(),
  sleepHours: real('sleep_hours').notNull(),
  stressLevel: text('stress_level').notNull(), // 'low' | 'moderate' | 'high'
  alcoholPerWeek: text('alcohol_per_week').notNull().default('none'),
  favoriteFoods: text('favorite_foods').array().notNull().default([]),
  hatedFoods: text('hated_foods').notNull().default(''),
  dietaryRestrictions: text('dietary_restrictions').notNull().default('none'),
  cookingStyle: text('cooking_style').notNull(), // 'scratch' | 'quick' | 'batch'
  foodAdventure: integer('food_adventure').notNull().default(5), // 1-10
  currentSnacks: text('current_snacks').notNull().default(''),
  snackReason: text('snack_reason').notNull().default('hunger'), // 'hunger' | 'boredom' | 'habit'
  snackPreference: text('snack_preference').notNull().default('both'), // 'sweet' | 'savoury' | 'both'
  nightSnacking: boolean('night_snacking').notNull().default(false),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

// ─── Diet Plans ───────────────────────────────────────────────────────────────

export const dietPlans = pgTable('diet_plans', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  isActive: boolean('is_active').notNull().default(true),
  targetCalories: integer('target_calories').notNull(),
  targetProtein: integer('target_protein').notNull(),
  targetCarbs: integer('target_carbs').notNull(),
  targetFat: integer('target_fat').notNull(),
  hydrationLiters: real('hydration_liters').notNull(),
  rawPlan: jsonb('raw_plan').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

// ─── Diet v2 · Intakes ───────────────────────────────────────────────────────

export const dietIntakes = pgTable('diet_intakes', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),

  // Section 1 — Stats
  age: integer('age').notNull(),
  biologicalSex: text('biological_sex').notNull(),
  heightCm: numeric('height_cm', { precision: 5, scale: 1, mode: 'number' }).notNull(),
  currentWeightKg: numeric('current_weight_kg', { precision: 5, scale: 2, mode: 'number' }).notNull(),
  goalWeightKg: numeric('goal_weight_kg', { precision: 5, scale: 2, mode: 'number' }),
  goalFeel: text('goal_feel'),
  pace: paceEnum('pace').notNull(),

  // Section 2 — Lifestyle
  jobType: jobTypeEnum('job_type').notNull(),
  exerciseFrequencyPerWeek: integer('exercise_frequency_per_week').notNull(),
  exerciseType: text('exercise_type').notNull(),
  sleepHours: numeric('sleep_hours', { precision: 3, scale: 1, mode: 'number' }).notNull(),
  stressLevel: stressEnum('stress_level').notNull(),
  alcoholDrinksPerWeek: integer('alcohol_drinks_per_week').notNull().default(0),

  // Section 3 — Food Preferences
  top5Meals: text('top_5_meals').notNull(),
  hatedFoods: text('hated_foods'),
  restrictions: text('restrictions').array().notNull().default(sql`'{}'::text[]`),
  cookingStyle: cookingStyleEnum('cooking_style').notNull(),
  adventurousness: integer('adventurousness').notNull(),

  // Section 4 — Snack Habits
  currentSnacks: text('current_snacks').notNull(),
  snackMotivation: snackMotivationEnum('snack_motivation').notNull(),
  snackPreference: snackPreferenceEnum('snack_preference').notNull(),
  nightSnacking: nightSnackEnum('night_snacking').notNull(),

  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => [
  index('idx_diet_intakes_user').on(table.userId),
])

// ─── Diet v2 · Plans ─────────────────────────────────────────────────────────

export const dietPlansV2 = pgTable('diet_plans_v2', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  intakeId: text('intake_id').notNull().references(() => dietIntakes.id),

  goal: dietGoalEnum('goal').notNull(),
  bmrKcal: integer('bmr_kcal').notNull(),
  tdeeKcal: integer('tdee_kcal').notNull(),
  targetKcal: integer('target_kcal').notNull(),
  targetProteinG: integer('target_protein_g').notNull(),
  targetCarbsG: integer('target_carbs_g').notNull(),
  targetFatG: integer('target_fat_g').notNull(),

  aiExplanation: text('ai_explanation'),
  aiPersonalRules: jsonb('ai_personal_rules'),
  aiTimeline: text('ai_timeline'),
  aiSupplements: jsonb('ai_supplements'),
  aiSnackSwaps: jsonb('ai_snack_swaps'),

  status: planStatusEnum('status').notNull().default('ACTIVE'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  replacedAt: timestamp('replaced_at'),
  deletedAt: timestamp('deleted_at'),
}, (table) => [
  index('idx_diet_plans_v2_user_active').on(table.userId),
])

// ─── Diet v2 · Plan Days ─────────────────────────────────────────────────────

export const dietPlanDays = pgTable('diet_plan_days', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  planId: text('plan_id').notNull().references(() => dietPlansV2.id, { onDelete: 'cascade' }),
  dayNumber: integer('day_number').notNull(),
  dayLabel: text('day_label').notNull(),
  theme: text('theme').notNull(),
  targetKcal: integer('target_kcal').notNull(),
}, (table) => [
  uniqueIndex('ux_diet_plan_days').on(table.planId, table.dayNumber),
])

// ─── Diet v2 · Meals ─────────────────────────────────────────────────────────

export const dietMeals = pgTable('diet_meals', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  planDayId: text('plan_day_id').notNull().references(() => dietPlanDays.id, { onDelete: 'cascade' }),
  mealType: mealTypeEnum('meal_type').notNull(),
  suggestedTime: text('suggested_time').notNull(),
  orderIndex: integer('order_index').notNull(),

  name: text('name').notNull(),
  kcal: integer('kcal').notNull(),
  proteinG: integer('protein_g').notNull(),
  carbsG: integer('carbs_g').notNull(),
  fatG: integer('fat_g').notNull(),

  prepTimeMin: integer('prep_time_min').notNull(),
  difficulty: text('difficulty'),
  isBatchCookFriendly: boolean('is_batch_cook_friendly').notNull().default(false),
  isLowCalTreat: boolean('is_low_cal_treat').notNull().default(false),

  ingredients: jsonb('ingredients').notNull(),
  recipeSteps: jsonb('recipe_steps').notNull(),

  youtubeUrl: text('youtube_url'),
  youtubeChannelName: text('youtube_channel_name'),
  youtubeDurationSec: integer('youtube_duration_sec'),
}, (table) => [
  index('idx_diet_meals_plan_day').on(table.planDayId),
])

// ─── Diet v2 · Grocery Items ─────────────────────────────────────────────────

export const dietGroceryItems = pgTable('diet_grocery_items', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  planId: text('plan_id').notNull().references(() => dietPlansV2.id, { onDelete: 'cascade' }),
  section: text('section').notNull(),
  name: text('name').notNull(),
  quantity: text('quantity').notNull(),
  orderIndex: integer('order_index').notNull(),
  isChecked: boolean('is_checked').notNull().default(false),
  checkedAt: timestamp('checked_at'),
}, (table) => [
  index('idx_diet_grocery_plan_section').on(table.planId, table.section),
])

// ─── Diet v2 · Regen Credits ─────────────────────────────────────────────────

export const dietRegenCredits = pgTable('diet_regen_credits', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  usedAt: timestamp('used_at').notNull().defaultNow(),
  isoWeek: text('iso_week').notNull(),
}, (table) => [
  index('idx_diet_regen_user_week').on(table.userId, table.isoWeek),
])

// ─── Weight Entries ──────────────────────────────────────────────────────────

export const weightSourceEnum = pgEnum('weight_source', ['MANUAL', 'HEALTH_SYNC'])

export const weightEntries = pgTable('weight_entries', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  weightKg: numeric('weight_kg', { precision: 5, scale: 1, mode: 'number' }).notNull(),
  measuredAt: timestamp('measured_at').notNull(),
  source: weightSourceEnum('source').notNull().default('MANUAL'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => [
  index('we_user_measured_idx').on(table.userId, table.measuredAt),
])

// ─── Notification Preferences ─────────────────────────────────────────────────

export const notificationPreferences = pgTable('notification_preferences', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().unique().references(() => users.id, { onDelete: 'cascade' }),

  // Workout reminders
  workoutEnabled: boolean('workout_enabled').notNull().default(false),
  workoutTime: text('workout_time').notNull().default('18:00'),
  workoutOffset: integer('workout_offset').notNull().default(30), // minutes before: 0 | 15 | 30
  workoutDays: jsonb('workout_days').notNull().default([1, 3, 5]), // 0=Sun … 6=Sat

  // Meal reminders
  breakfastEnabled: boolean('breakfast_enabled').notNull().default(false),
  breakfastTime: text('breakfast_time').notNull().default('08:00'),
  lunchEnabled: boolean('lunch_enabled').notNull().default(false),
  lunchTime: text('lunch_time').notNull().default('12:30'),
  snackEnabled: boolean('snack_enabled').notNull().default(false),
  snackTime: text('snack_time').notNull().default('16:00'),
  dinnerEnabled: boolean('dinner_enabled').notNull().default(false),
  dinnerTime: text('dinner_time').notNull().default('20:00'),

  // Hydration reminders
  hydrationEnabled: boolean('hydration_enabled').notNull().default(false),
  hydrationInterval: integer('hydration_interval').notNull().default(90), // minutes: 60 | 90 | 120
  hydrationActiveFrom: text('hydration_active_from').notNull().default('07:00'),
  hydrationActiveTo: text('hydration_active_to').notNull().default('22:00'),

  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})
