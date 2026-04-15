import {
  pgTable,
  text,
  integer,
  real,
  boolean,
  timestamp,
  pgEnum,
  jsonb,
} from 'drizzle-orm/pg-core'

// ─── Enums ────────────────────────────────────────────────────────────────────

export const userLevelEnum = pgEnum('user_level', ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'])
export const userGoalEnum = pgEnum('user_goal', ['WEIGHT_LOSS', 'MUSCLE_GAIN', 'MAINTENANCE'])
export const difficultyEnum = pgEnum('difficulty', ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'])

// ─── Users ────────────────────────────────────────────────────────────────────

export const users = pgTable('users', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  clerkId: text('clerk_id').notNull().unique(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  avatarUrl: text('avatar_url'),
  level: userLevelEnum('level').notNull().default('BEGINNER'),
  goal: userGoalEnum('goal').notNull().default('MUSCLE_GAIN'),
  weeklyTarget: integer('weekly_target').notNull().default(3),
  heightCm: real('height_cm'),
  weightKg: real('weight_kg'),
  gender: text('gender'),
  onboardingDone: boolean('onboarding_done').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
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
  completedAt: timestamp('completed_at'),
  durationSeconds: integer('duration_seconds').notNull().default(0),
  totalVolume: real('total_volume').notNull().default(0),
  notes: text('notes'),
  perceivedExertion: integer('perceived_exertion'),
})

// ─── Session Exercises ────────────────────────────────────────────────────────

export const sessionExercises = pgTable('session_exercises', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  workoutSessionId: text('workout_session_id').notNull().references(() => workoutSessions.id, { onDelete: 'cascade' }),
  exerciseId: text('exercise_id').notNull().references(() => exercises.id),
  order: integer('order').notNull().default(0),
})

// ─── Exercise Sets ────────────────────────────────────────────────────────────

export const exerciseSets = pgTable('exercise_sets', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  sessionExerciseId: text('session_exercise_id').notNull().references(() => sessionExercises.id, { onDelete: 'cascade' }),
  setNumber: integer('set_number').notNull(),
  reps: integer('reps').notNull().default(0),
  weight: real('weight').notNull().default(0),
  restSeconds: integer('rest_seconds').notNull().default(90),
  isCompleted: boolean('is_completed').notNull().default(false),
  completedAt: timestamp('completed_at'),
  notes: text('notes'),
})

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
})

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
