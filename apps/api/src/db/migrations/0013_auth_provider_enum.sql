-- Normalize existing values
UPDATE users SET auth_provider = LOWER(auth_provider);
UPDATE users SET auth_provider = 'apple'
  WHERE auth_provider NOT IN ('apple', 'google', 'email', 'guest');

-- Create the enum type
CREATE TYPE auth_provider_enum AS ENUM ('apple', 'google', 'email', 'guest');

-- Convert column from text to enum
ALTER TABLE users
  ALTER COLUMN auth_provider TYPE auth_provider_enum
  USING auth_provider::auth_provider_enum;

-- Set default
ALTER TABLE users ALTER COLUMN auth_provider SET DEFAULT 'apple';
