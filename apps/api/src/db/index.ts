import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from './schema.js'

const POOL_MAX = parseInt(process.env['DB_POOL_MAX'] ?? '10', 10)
const POOL_IDLE_TIMEOUT = parseInt(process.env['DB_POOL_IDLE_TIMEOUT_MS'] ?? '30000', 10)

const pool = new Pool({
  connectionString: process.env['DATABASE_URL'],
  max: POOL_MAX,
  idleTimeoutMillis: POOL_IDLE_TIMEOUT,
})

export const db = drizzle(pool, { schema })
export type DB = typeof db

async function ensureColumn(client: import('pg').PoolClient, table: string, column: string, definition: string) {
  const { rows } = await client.query(
    `SELECT 1 FROM information_schema.columns WHERE table_name = $1 AND column_name = $2`,
    [table, column],
  )
  if (rows.length === 0) {
    await client.query(`ALTER TABLE "${table}" ADD COLUMN ${definition}`)
    console.log(`[migration] Added ${table}.${column}`)
  }
}

export async function runPendingMigrations() {
  const client = await pool.connect()
  try {
    // --- 0001: workout_plans, workout_plan_days ---
    await client.query(`
      CREATE TABLE IF NOT EXISTS "workout_plans" (
        "id" text PRIMARY KEY NOT NULL,
        "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE cascade,
        "name" text NOT NULL,
        "is_active" boolean NOT NULL DEFAULT false,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      )
    `)
    await client.query(`
      CREATE TABLE IF NOT EXISTS "workout_plan_days" (
        "id" text PRIMARY KEY NOT NULL,
        "plan_id" text NOT NULL REFERENCES "workout_plans"("id") ON DELETE cascade,
        "day_of_week" integer NOT NULL,
        "workout_template_id" text NOT NULL REFERENCES "workout_templates"("id"),
        CONSTRAINT "workout_plan_days_plan_id_day_of_week_unique" UNIQUE("plan_id", "day_of_week")
      )
    `)
    console.log('[migration] Ensured workout_plans + workout_plan_days exist')

    // --- 0002: users columns ---
    await ensureColumn(client, 'users', 'height_cm', '"height_cm" real')
    await ensureColumn(client, 'users', 'weight_kg', '"weight_kg" real')

    // --- 0003: users columns ---
    await ensureColumn(client, 'users', 'gender', '"gender" text')
    await ensureColumn(client, 'users', 'onboarding_done', '"onboarding_done" boolean NOT NULL DEFAULT false')

    // --- 0004: diet_plans, diet_profiles ---
    await client.query(`
      CREATE TABLE IF NOT EXISTS "diet_plans" (
        "id" text PRIMARY KEY NOT NULL,
        "user_id" text NOT NULL REFERENCES "users"("id"),
        "plan_json" jsonb NOT NULL,
        "created_at" timestamp DEFAULT now() NOT NULL
      )
    `)
    await client.query(`
      CREATE TABLE IF NOT EXISTS "diet_profiles" (
        "id" text PRIMARY KEY NOT NULL,
        "user_id" text NOT NULL REFERENCES "users"("id"),
        "profile_json" jsonb NOT NULL,
        "created_at" timestamp DEFAULT now() NOT NULL
      )
    `)
    console.log('[migration] Ensured diet_plans + diet_profiles exist')

    // --- 0005: exercises FR columns ---
    await ensureColumn(client, 'exercises', 'name_fr', '"name_fr" text')
    await ensureColumn(client, 'exercises', 'description_fr', '"description_fr" text')

    // --- 0006: notification_preferences ---
    await client.query(`
      CREATE TABLE IF NOT EXISTS "notification_preferences" (
        "id" text PRIMARY KEY NOT NULL,
        "user_id" text NOT NULL UNIQUE,
        "workout_enabled" boolean DEFAULT false NOT NULL,
        "workout_time" text DEFAULT '18:00' NOT NULL,
        "workout_offset" integer DEFAULT 30 NOT NULL,
        "workout_days" jsonb DEFAULT '[1,3,5]'::jsonb NOT NULL,
        "breakfast_enabled" boolean DEFAULT false NOT NULL,
        "breakfast_time" text DEFAULT '08:00' NOT NULL,
        "lunch_enabled" boolean DEFAULT false NOT NULL,
        "lunch_time" text DEFAULT '12:30' NOT NULL,
        "snack_enabled" boolean DEFAULT false NOT NULL,
        "snack_time" text DEFAULT '16:00' NOT NULL,
        "dinner_enabled" boolean DEFAULT false NOT NULL,
        "dinner_time" text DEFAULT '20:00' NOT NULL,
        "hydration_enabled" boolean DEFAULT false NOT NULL,
        "hydration_interval" integer DEFAULT 90 NOT NULL,
        "hydration_active_from" text DEFAULT '07:00' NOT NULL,
        "hydration_active_to" text DEFAULT '22:00' NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL,
        "created_at" timestamp DEFAULT now() NOT NULL,
        CONSTRAINT "notification_preferences_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `)
    console.log('[migration] Ensured notification_preferences exists')

    // --- 0009: auth_provider column ---
    await ensureColumn(client, 'users', 'auth_provider', '"auth_provider" text NOT NULL DEFAULT \'apple\'')

    // --- 0010: email_hash column ---
    await ensureColumn(client, 'users', 'email_hash', '"email_hash" text')

    // --- 0011: exercise_sets.is_pr + indexes ---
    await ensureColumn(client, 'exercise_sets', 'is_pr', '"is_pr" boolean NOT NULL DEFAULT false')
    await client.query(`CREATE INDEX IF NOT EXISTS "ws_user_started_idx" ON "workout_sessions" ("user_id", "started_at")`)
    await client.query(`CREATE INDEX IF NOT EXISTS "ws_user_template_idx" ON "workout_sessions" ("user_id", "workout_template_id")`)
    await client.query(`CREATE INDEX IF NOT EXISTS "se_session_idx" ON "session_exercises" ("workout_session_id")`)
    await client.query(`CREATE INDEX IF NOT EXISTS "se_exercise_idx" ON "session_exercises" ("exercise_id")`)

    // --- 0012: weight_entries ---
    await client.query(`
      DO $$ BEGIN
        CREATE TYPE "weight_source" AS ENUM ('MANUAL', 'HEALTH_SYNC');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `)
    await client.query(`
      CREATE TABLE IF NOT EXISTS "weight_entries" (
        "id" text PRIMARY KEY NOT NULL,
        "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "weight_kg" numeric(5,1) NOT NULL,
        "measured_at" timestamp NOT NULL,
        "source" "weight_source" NOT NULL DEFAULT 'MANUAL',
        "created_at" timestamp NOT NULL DEFAULT now()
      )
    `)
    await client.query(`CREATE INDEX IF NOT EXISTS "we_user_measured_idx" ON "weight_entries" ("user_id", "measured_at")`)
    console.log('[migration] Ensured weight_entries exists')

    // --- 0013: auth_provider enum (safe to skip if column already text, enum conversion is fragile) ---

    // --- 0015: workout_sessions.status ---
    await client.query(`
      DO $$ BEGIN
        CREATE TYPE "session_status_enum" AS ENUM ('IN_PROGRESS', 'DONE', 'ABANDONED');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `)
    await ensureColumn(client, 'workout_sessions', 'status', '"status" session_status_enum NOT NULL DEFAULT \'IN_PROGRESS\'')

    // --- 0016: users.deleted_at ---
    await ensureColumn(client, 'users', 'deleted_at', '"deleted_at" timestamp')
    await client.query(`CREATE INDEX IF NOT EXISTS idx_users_not_deleted ON users(deleted_at) WHERE deleted_at IS NULL`)

    // --- 0017: personal_records index ---
    await client.query(`CREATE INDEX IF NOT EXISTS "pr_user_exercise_idx" ON "personal_records" ("user_id", "exercise_id")`)

    // --- 0018: diet v2 tables ---
    await client.query(`
      DO $$ BEGIN CREATE TYPE "diet_goal_enum" AS ENUM ('FAT_LOSS', 'MUSCLE_GAIN', 'RECOMPOSITION', 'PERFORMANCE'); EXCEPTION WHEN duplicate_object THEN null; END $$;
      DO $$ BEGIN CREATE TYPE "pace_enum" AS ENUM ('STEADY', 'FAST'); EXCEPTION WHEN duplicate_object THEN null; END $$;
      DO $$ BEGIN CREATE TYPE "job_type_enum" AS ENUM ('DESK', 'STANDING', 'MANUAL'); EXCEPTION WHEN duplicate_object THEN null; END $$;
      DO $$ BEGIN CREATE TYPE "stress_enum" AS ENUM ('LOW', 'MODERATE', 'HIGH'); EXCEPTION WHEN duplicate_object THEN null; END $$;
      DO $$ BEGIN CREATE TYPE "snack_motivation_enum" AS ENUM ('HUNGER', 'BOREDOM', 'HABIT'); EXCEPTION WHEN duplicate_object THEN null; END $$;
      DO $$ BEGIN CREATE TYPE "snack_preference_enum" AS ENUM ('SWEET', 'SAVOURY', 'BOTH'); EXCEPTION WHEN duplicate_object THEN null; END $$;
      DO $$ BEGIN CREATE TYPE "night_snack_enum" AS ENUM ('NEVER', 'SOMETIMES', 'OFTEN'); EXCEPTION WHEN duplicate_object THEN null; END $$;
      DO $$ BEGIN CREATE TYPE "cooking_style_enum" AS ENUM ('HOME_COOKING', 'QUICK_SIMPLE', 'MEAL_PREP'); EXCEPTION WHEN duplicate_object THEN null; END $$;
      DO $$ BEGIN CREATE TYPE "meal_type_enum" AS ENUM ('BREAKFAST', 'LUNCH', 'DINNER', 'SNACK', 'DESSERT'); EXCEPTION WHEN duplicate_object THEN null; END $$;
      DO $$ BEGIN CREATE TYPE "plan_status_enum" AS ENUM ('ACTIVE', 'REPLACED', 'DELETED'); EXCEPTION WHEN duplicate_object THEN null; END $$;
    `)
    await client.query(`
      CREATE TABLE IF NOT EXISTS "diet_intakes" (
        "id" text PRIMARY KEY NOT NULL,
        "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "age" integer NOT NULL,
        "biological_sex" text NOT NULL,
        "height_cm" numeric(5,1) NOT NULL,
        "current_weight_kg" numeric(5,2) NOT NULL,
        "goal_weight_kg" numeric(5,2),
        "goal_feel" text,
        "pace" "pace_enum" NOT NULL,
        "job_type" "job_type_enum" NOT NULL,
        "exercise_frequency_per_week" integer NOT NULL,
        "exercise_type" text NOT NULL,
        "sleep_hours" numeric(3,1) NOT NULL,
        "stress_level" "stress_enum" NOT NULL,
        "alcohol_drinks_per_week" integer NOT NULL DEFAULT 0,
        "top_5_meals" text NOT NULL,
        "hated_foods" text,
        "restrictions" text[] NOT NULL DEFAULT '{}'::text[],
        "cooking_style" "cooking_style_enum" NOT NULL,
        "adventurousness" integer NOT NULL,
        "current_snacks" text NOT NULL,
        "snack_motivation" "snack_motivation_enum" NOT NULL,
        "snack_preference" "snack_preference_enum" NOT NULL,
        "night_snacking" "night_snack_enum" NOT NULL,
        "created_at" timestamp NOT NULL DEFAULT now()
      )
    `)
    await client.query(`CREATE INDEX IF NOT EXISTS "idx_diet_intakes_user" ON "diet_intakes" ("user_id")`)
    await client.query(`
      CREATE TABLE IF NOT EXISTS "diet_plans_v2" (
        "id" text PRIMARY KEY NOT NULL,
        "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "intake_id" text NOT NULL REFERENCES "diet_intakes"("id"),
        "goal" "diet_goal_enum" NOT NULL,
        "bmr_kcal" integer NOT NULL,
        "tdee_kcal" integer NOT NULL,
        "target_kcal" integer NOT NULL,
        "target_protein_g" integer NOT NULL,
        "target_carbs_g" integer NOT NULL,
        "target_fat_g" integer NOT NULL,
        "ai_explanation" text,
        "ai_personal_rules" jsonb,
        "ai_timeline" text,
        "ai_supplements" jsonb,
        "ai_snack_swaps" jsonb,
        "status" "plan_status_enum" NOT NULL DEFAULT 'ACTIVE',
        "created_at" timestamp NOT NULL DEFAULT now(),
        "replaced_at" timestamp,
        "deleted_at" timestamp
      )
    `)
    await client.query(`CREATE INDEX IF NOT EXISTS "idx_diet_plans_v2_user_active" ON "diet_plans_v2" ("user_id")`)
    await client.query(`
      CREATE TABLE IF NOT EXISTS "diet_plan_days" (
        "id" text PRIMARY KEY NOT NULL,
        "plan_id" text NOT NULL REFERENCES "diet_plans_v2"("id") ON DELETE CASCADE,
        "day_number" integer NOT NULL,
        "day_label" text NOT NULL,
        "theme" text NOT NULL,
        "target_kcal" integer NOT NULL
      )
    `)
    await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS "ux_diet_plan_days" ON "diet_plan_days" ("plan_id", "day_number")`)
    await client.query(`
      CREATE TABLE IF NOT EXISTS "diet_meals" (
        "id" text PRIMARY KEY NOT NULL,
        "plan_day_id" text NOT NULL REFERENCES "diet_plan_days"("id") ON DELETE CASCADE,
        "meal_type" "meal_type_enum" NOT NULL,
        "suggested_time" text NOT NULL,
        "order_index" integer NOT NULL,
        "name" text NOT NULL,
        "kcal" integer NOT NULL,
        "protein_g" integer NOT NULL,
        "carbs_g" integer NOT NULL,
        "fat_g" integer NOT NULL,
        "prep_time_min" integer NOT NULL,
        "difficulty" text,
        "is_batch_cook_friendly" boolean NOT NULL DEFAULT false,
        "is_low_cal_treat" boolean NOT NULL DEFAULT false,
        "ingredients" jsonb NOT NULL,
        "recipe_steps" jsonb NOT NULL,
        "youtube_url" text,
        "youtube_channel_name" text,
        "youtube_duration_sec" integer
      )
    `)
    await client.query(`CREATE INDEX IF NOT EXISTS "idx_diet_meals_plan_day" ON "diet_meals" ("plan_day_id")`)
    await client.query(`
      CREATE TABLE IF NOT EXISTS "diet_grocery_items" (
        "id" text PRIMARY KEY NOT NULL,
        "plan_id" text NOT NULL REFERENCES "diet_plans_v2"("id") ON DELETE CASCADE,
        "section" text NOT NULL,
        "name" text NOT NULL,
        "quantity" text NOT NULL,
        "order_index" integer NOT NULL,
        "is_checked" boolean NOT NULL DEFAULT false,
        "checked_at" timestamp
      )
    `)
    await client.query(`CREATE INDEX IF NOT EXISTS "idx_diet_grocery_plan_section" ON "diet_grocery_items" ("plan_id", "section")`)
    await client.query(`
      CREATE TABLE IF NOT EXISTS "diet_regen_credits" (
        "id" text PRIMARY KEY NOT NULL,
        "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "used_at" timestamp NOT NULL DEFAULT now(),
        "iso_week" text NOT NULL
      )
    `)
    await client.query(`CREATE INDEX IF NOT EXISTS "idx_diet_regen_user_week" ON "diet_regen_credits" ("user_id", "iso_week")`)
    console.log('[migration] Ensured diet v2 tables exist')

    // --- 0019: workout_plans.generated_by_ai ---
    await ensureColumn(client, 'workout_plans', 'generated_by_ai', '"generated_by_ai" boolean NOT NULL DEFAULT false')

    // --- 0020: ai_generation_log ---
    await client.query(`
      CREATE TABLE IF NOT EXISTS "ai_generation_log" (
        "id" text PRIMARY KEY NOT NULL,
        "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "type" text NOT NULL,
        "created_at" timestamp DEFAULT now() NOT NULL
      )
    `)
    await client.query(`CREATE INDEX IF NOT EXISTS "idx_ai_gen_log_user_created" ON "ai_generation_log" ("user_id", "created_at")`)
    console.log('[migration] Ensured ai_generation_log exists')

    // --- 0021: admin role + audit log ---
    await client.query(`
      DO $$ BEGIN
        CREATE TYPE "user_role_enum" AS ENUM ('user', 'admin');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `)
    await ensureColumn(client, 'users', 'role', '"role" user_role_enum NOT NULL DEFAULT \'user\'')
    await ensureColumn(client, 'users', 'ai_quota_overrides', '"ai_quota_overrides" jsonb NOT NULL DEFAULT \'{}\'::jsonb')
    await ensureColumn(client, 'users', 'preferred_llm_model', '"preferred_llm_model" text')
    await client.query(`CREATE INDEX IF NOT EXISTS idx_users_role ON users(role) WHERE role = 'admin'`)
    await client.query(`
      DO $$ BEGIN
        CREATE TYPE "admin_audit_action_enum" AS ENUM (
          'role_changed', 'user_soft_deleted', 'user_restored',
          'ai_quota_overridden', 'ai_quota_reset', 'feature_flag_overridden',
          'llm_model_changed', 'bootstrap'
        );
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `)
    await client.query(`
      CREATE TABLE IF NOT EXISTS "admin_audit_log" (
        "id" text PRIMARY KEY DEFAULT gen_random_uuid()::text,
        "admin_user_id" text NOT NULL REFERENCES users(id),
        "action" admin_audit_action_enum NOT NULL,
        "target_user_id" text REFERENCES users(id),
        "payload" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "ip_address" text,
        "user_agent" text,
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `)
    await client.query(`CREATE INDEX IF NOT EXISTS idx_audit_admin_user ON admin_audit_log(admin_user_id, created_at DESC)`)
    await client.query(`CREATE INDEX IF NOT EXISTS idx_audit_target_user ON admin_audit_log(target_user_id, created_at DESC) WHERE target_user_id IS NOT NULL`)
    await client.query(`CREATE INDEX IF NOT EXISTS idx_audit_action ON admin_audit_log(action, created_at DESC)`)
    console.log('[migration] Ensured admin role + audit log exist')

    // --- 0022: auth_sessions ---
    await client.query(`
      CREATE TABLE IF NOT EXISTS auth_sessions (
        token text PRIMARY KEY,
        user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at timestamptz NOT NULL DEFAULT now(),
        expires_at timestamptz NOT NULL
      )
    `)
    await client.query(`CREATE INDEX IF NOT EXISTS idx_auth_sessions_user ON auth_sessions (user_id)`)
    await client.query(`CREATE INDEX IF NOT EXISTS idx_auth_sessions_expires ON auth_sessions (expires_at)`)
    console.log('[migration] Ensured auth_sessions exists')

    // --- 0023: diet_plans_v2 locale ---
    await ensureColumn(client, 'diet_plans_v2', 'locale', `"locale" text NOT NULL DEFAULT 'fr'`)
    console.log('[migration] Ensured diet_plans_v2.locale exists')

    // --- 0024: audit action enum: diet_credits_reset ---
    await client.query(`
      DO $$ BEGIN
        ALTER TYPE admin_audit_action_enum ADD VALUE IF NOT EXISTS 'diet_credits_reset';
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `)
    console.log('[migration] Ensured audit action diet_credits_reset exists')

    // --- Extra indexes ---
    await client.query(`CREATE INDEX IF NOT EXISTS wt_user_idx ON workout_templates (user_id)`)
    await client.query(`CREATE INDEX IF NOT EXISTS we_template_idx ON workout_exercises (workout_template_id)`)
    await client.query(`CREATE INDEX IF NOT EXISTS wpd_plan_idx ON workout_plan_days (plan_id)`)
    await client.query(`CREATE INDEX IF NOT EXISTS ex_difficulty_idx ON exercises (difficulty)`)
    console.log('[migration] Ensured all indexes exist')
  } finally {
    client.release()
  }
}
