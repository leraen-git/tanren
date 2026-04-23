-- Diet v2: 10 enums + 6 normalized tables (additive only, old diet_plans/diet_profiles untouched)

-- Enums
DO $$ BEGIN
  CREATE TYPE "diet_goal_enum" AS ENUM ('FAT_LOSS', 'MUSCLE_GAIN', 'RECOMPOSITION', 'PERFORMANCE');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "pace_enum" AS ENUM ('STEADY', 'FAST');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "job_type_enum" AS ENUM ('DESK', 'STANDING', 'MANUAL');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "stress_enum" AS ENUM ('LOW', 'MODERATE', 'HIGH');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "snack_motivation_enum" AS ENUM ('HUNGER', 'BOREDOM', 'HABIT');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "snack_preference_enum" AS ENUM ('SWEET', 'SAVOURY', 'BOTH');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "night_snack_enum" AS ENUM ('NEVER', 'SOMETIMES', 'OFTEN');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "cooking_style_enum" AS ENUM ('HOME_COOKING', 'QUICK_SIMPLE', 'MEAL_PREP');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "meal_type_enum" AS ENUM ('BREAKFAST', 'LUNCH', 'DINNER', 'SNACK', 'DESSERT');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "plan_status_enum" AS ENUM ('ACTIVE', 'REPLACED', 'DELETED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- diet_intakes
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
);

CREATE INDEX IF NOT EXISTS "idx_diet_intakes_user" ON "diet_intakes" ("user_id");

-- diet_plans_v2
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
);

CREATE INDEX IF NOT EXISTS "idx_diet_plans_v2_user_active" ON "diet_plans_v2" ("user_id");

-- diet_plan_days
CREATE TABLE IF NOT EXISTS "diet_plan_days" (
  "id" text PRIMARY KEY NOT NULL,
  "plan_id" text NOT NULL REFERENCES "diet_plans_v2"("id") ON DELETE CASCADE,
  "day_number" integer NOT NULL,
  "day_label" text NOT NULL,
  "theme" text NOT NULL,
  "target_kcal" integer NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "ux_diet_plan_days" ON "diet_plan_days" ("plan_id", "day_number");

-- diet_meals
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
);

CREATE INDEX IF NOT EXISTS "idx_diet_meals_plan_day" ON "diet_meals" ("plan_day_id");

-- diet_grocery_items
CREATE TABLE IF NOT EXISTS "diet_grocery_items" (
  "id" text PRIMARY KEY NOT NULL,
  "plan_id" text NOT NULL REFERENCES "diet_plans_v2"("id") ON DELETE CASCADE,
  "section" text NOT NULL,
  "name" text NOT NULL,
  "quantity" text NOT NULL,
  "order_index" integer NOT NULL,
  "is_checked" boolean NOT NULL DEFAULT false,
  "checked_at" timestamp
);

CREATE INDEX IF NOT EXISTS "idx_diet_grocery_plan_section" ON "diet_grocery_items" ("plan_id", "section");

-- diet_regen_credits
CREATE TABLE IF NOT EXISTS "diet_regen_credits" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "used_at" timestamp NOT NULL DEFAULT now(),
  "iso_week" text NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_diet_regen_user_week" ON "diet_regen_credits" ("user_id", "iso_week");
