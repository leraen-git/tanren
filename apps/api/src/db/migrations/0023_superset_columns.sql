-- Add superset support: group_id on templates + sessions, performed_in_superset on sets
ALTER TABLE workout_exercises ADD COLUMN superset_group_id TEXT;
ALTER TABLE session_exercises ADD COLUMN superset_group_id TEXT;
ALTER TABLE exercise_sets ADD COLUMN performed_in_superset BOOLEAN NOT NULL DEFAULT false;
