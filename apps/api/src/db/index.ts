import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from './schema.js'

const POOL_MAX = parseInt(process.env['DB_POOL_MAX'] ?? '10', 10)
const POOL_IDLE_TIMEOUT = parseInt(process.env['DB_POOL_IDLE_TIMEOUT_MS'] ?? '30000', 10)

const pool = new Pool({
  connectionString: process.env['DATABASE_URL'],
  max: POOL_MAX,
  idleTimeoutMillis: POOL_IDLE_TIMEOUT,
})

export const db = drizzle(pool, { schema })
export type DB = typeof db

export async function runPendingMigrations() {
  const client = await pool.connect()
  try {
    const { rows } = await client.query(
      `SELECT 1 FROM information_schema.columns WHERE table_name = 'workout_plans' AND column_name = 'generated_by_ai'`
    )
    if (rows.length === 0) {
      await client.query(`ALTER TABLE workout_plans ADD COLUMN generated_by_ai boolean NOT NULL DEFAULT false`)
      console.log('[migration] Added generated_by_ai column to workout_plans')
    }

    await client.query(`CREATE INDEX IF NOT EXISTS wt_user_idx ON workout_templates (user_id)`)
    await client.query(`CREATE INDEX IF NOT EXISTS we_template_idx ON workout_exercises (workout_template_id)`)
    await client.query(`CREATE INDEX IF NOT EXISTS wpd_plan_idx ON workout_plan_days (plan_id)`)
    await client.query(`CREATE INDEX IF NOT EXISTS ex_difficulty_idx ON exercises (difficulty)`)
    console.log('[migration] Ensured indexes exist')

    await client.query(`
      CREATE TABLE IF NOT EXISTS auth_sessions (
        token text PRIMARY KEY,
        user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at timestamptz NOT NULL DEFAULT now(),
        expires_at timestamptz NOT NULL
      )
    `)
    await client.query(`CREATE INDEX IF NOT EXISTS idx_auth_sessions_user ON auth_sessions (user_id)`)
    await client.query(`CREATE INDEX IF NOT EXISTS idx_auth_sessions_expires ON auth_sessions (expires_at)`)
    console.log('[migration] Ensured auth_sessions table exists')
  } finally {
    client.release()
  }
}
