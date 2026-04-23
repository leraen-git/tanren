-- Weight source enum
DO $$ BEGIN
  CREATE TYPE "weight_source" AS ENUM ('MANUAL', 'HEALTH_SYNC');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Weight entries table
CREATE TABLE IF NOT EXISTS "weight_entries" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "weight_kg" real NOT NULL,
  "measured_at" timestamp NOT NULL,
  "source" "weight_source" NOT NULL DEFAULT 'MANUAL',
  "created_at" timestamp NOT NULL DEFAULT now()
);

-- Index for period queries
CREATE INDEX IF NOT EXISTS "we_user_measured_idx" ON "weight_entries" ("user_id", "measured_at");
