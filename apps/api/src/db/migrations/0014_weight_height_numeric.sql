-- Round existing values to avoid precision surprises
UPDATE users SET weight_kg = ROUND(weight_kg::numeric, 1) WHERE weight_kg IS NOT NULL;
UPDATE users SET height_cm = ROUND(height_cm::numeric, 0) WHERE height_cm IS NOT NULL;
UPDATE weight_entries SET weight_kg = ROUND(weight_kg::numeric, 1);

-- Alter types
ALTER TABLE users
  ALTER COLUMN weight_kg TYPE numeric(5,1) USING weight_kg::numeric(5,1),
  ALTER COLUMN height_cm TYPE numeric(5,1) USING height_cm::numeric(5,1);

ALTER TABLE weight_entries
  ALTER COLUMN weight_kg TYPE numeric(5,1) USING weight_kg::numeric(5,1);
