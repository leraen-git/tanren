-- Step 1: create the enum type
CREATE TYPE user_role_enum AS ENUM ('user', 'admin');

-- Step 2: add the role column with default 'user'
ALTER TABLE users
  ADD COLUMN role user_role_enum NOT NULL DEFAULT 'user';

-- Step 3: add AI quota overrides jsonb column
ALTER TABLE users
  ADD COLUMN ai_quota_overrides jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Step 4: add preferred LLM model column (for admin model selection)
ALTER TABLE users
  ADD COLUMN preferred_llm_model text;

-- Step 5: index for fast admin lookups
CREATE INDEX idx_users_role ON users(role) WHERE role = 'admin';

-- Step 6: create the audit action enum
CREATE TYPE admin_audit_action_enum AS ENUM (
  'role_changed',
  'user_soft_deleted',
  'user_restored',
  'ai_quota_overridden',
  'ai_quota_reset',
  'feature_flag_overridden',
  'llm_model_changed',
  'bootstrap'
);

-- Step 7: create the admin audit log table
CREATE TABLE admin_audit_log (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  admin_user_id text NOT NULL REFERENCES users(id),
  action admin_audit_action_enum NOT NULL,
  target_user_id text REFERENCES users(id),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_admin_user ON admin_audit_log(admin_user_id, created_at DESC);
CREATE INDEX idx_audit_target_user ON admin_audit_log(target_user_id, created_at DESC) WHERE target_user_id IS NOT NULL;
CREATE INDEX idx_audit_action ON admin_audit_log(action, created_at DESC);
