CREATE TABLE "diet_plans" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"target_calories" integer NOT NULL,
	"target_protein" integer NOT NULL,
	"target_carbs" integer NOT NULL,
	"target_fat" integer NOT NULL,
	"hydration_liters" real NOT NULL,
	"raw_plan" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "diet_profiles" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"age" integer NOT NULL,
	"sex" text NOT NULL,
	"goal_weight" real,
	"goal_pace" text DEFAULT 'steady' NOT NULL,
	"job_type" text NOT NULL,
	"exercise_frequency" text NOT NULL,
	"sleep_hours" real NOT NULL,
	"stress_level" text NOT NULL,
	"alcohol_per_week" text DEFAULT 'none' NOT NULL,
	"favorite_foods" text[] DEFAULT '{}' NOT NULL,
	"hated_foods" text DEFAULT '' NOT NULL,
	"dietary_restrictions" text DEFAULT 'none' NOT NULL,
	"cooking_style" text NOT NULL,
	"food_adventure" integer DEFAULT 5 NOT NULL,
	"current_snacks" text DEFAULT '' NOT NULL,
	"snack_reason" text DEFAULT 'hunger' NOT NULL,
	"snack_preference" text DEFAULT 'both' NOT NULL,
	"night_snacking" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "diet_profiles_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
ALTER TABLE "diet_plans" ADD CONSTRAINT "diet_plans_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "diet_profiles" ADD CONSTRAINT "diet_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;