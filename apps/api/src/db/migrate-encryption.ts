import { drizzle } from 'drizzle-orm/node-postgres'
import pg from 'pg'
import { users, dietProfiles } from './schema.js'
import { encryptUserFields, encryptDietFields } from './encryption.js'
import { eq } from 'drizzle-orm'

const DATABASE_URL = process.env['DATABASE_URL']
if (!DATABASE_URL) {
  console.error('DATABASE_URL is required')
  process.exit(1)
}

if (!process.env['ENCRYPTION_KEY']) {
  console.error('ENCRYPTION_KEY is required')
  process.exit(1)
}

const pool = new pg.Pool({ connectionString: DATABASE_URL })
const db = drizzle(pool)

async function migrateUsers() {
  const allUsers = await db.select().from(users)
  let encrypted = 0

  for (const user of allUsers) {
    if (typeof user.email === 'string' && user.email.includes('.') && user.email.split('.').length === 3) {
      continue
    }

    const fields = encryptUserFields({ email: user.email, name: user.name })
    await db.update(users).set(fields).where(eq(users.id, user.id))
    encrypted++
  }

  console.log(`Users: ${encrypted}/${allUsers.length} encrypted`)
}

async function migrateDietProfiles() {
  const allProfiles = await db.select().from(dietProfiles)
  let encrypted = 0

  for (const profile of allProfiles) {
    if (typeof profile.hatedFoods === 'string' && profile.hatedFoods.includes('.') && profile.hatedFoods.split('.').length === 3) {
      continue
    }

    const fields = encryptDietFields({
      hatedFoods: profile.hatedFoods,
      dietaryRestrictions: profile.dietaryRestrictions,
      currentSnacks: profile.currentSnacks,
    })
    await db.update(dietProfiles).set(fields).where(eq(dietProfiles.id, profile.id))
    encrypted++
  }

  console.log(`Diet profiles: ${encrypted}/${allProfiles.length} encrypted`)
}

async function main() {
  console.log('Starting encryption migration...')
  await migrateUsers()
  await migrateDietProfiles()
  console.log('Encryption migration complete.')
  await pool.end()
}

main().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})
