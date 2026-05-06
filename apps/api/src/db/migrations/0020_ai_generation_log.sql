CREATE TABLE IF NOT EXISTS "ai_generation_log" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "type" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_ai_gen_log_user_created" ON "ai_generation_log" ("user_id", "created_at");
