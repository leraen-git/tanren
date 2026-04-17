import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { Pool } from 'pg'

const pool = new Pool({ connectionString: process.env['DATABASE_URL'] })
const db = drizzle(pool)

console.log('Running migrations...')
await migrate(db, { migrationsFolder: './src/db/migrations' })
console.log('Migrations complete.')

await pool.end()
process.exit(0)
