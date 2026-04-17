ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "auth_provider" text NOT NULL DEFAULT 'apple';
