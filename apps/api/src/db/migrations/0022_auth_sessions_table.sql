CREATE TABLE IF NOT EXISTS "auth_sessions" (
  "token" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "expires_at" timestamp with time zone NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_auth_sessions_user" ON "auth_sessions" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_auth_sessions_expires" ON "auth_sessions" ("expires_at");
