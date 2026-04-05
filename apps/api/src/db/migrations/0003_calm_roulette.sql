ALTER TABLE "users" ADD COLUMN "gender" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "onboarding_done" boolean DEFAULT false NOT NULL;