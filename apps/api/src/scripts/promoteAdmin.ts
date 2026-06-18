#!/usr/bin/env tsx
/**
 * Promote a user to admin role.
 *
 * Usage:
 *   npm run admin:promote -- --email <email>
 *   npm run admin:promote -- --id <userId>
 *
 * Idempotent — running it twice is a no-op.
 * Logs the action in admin_audit_log with action='bootstrap'.
 */

import { db } from '../db/index.js'
import { users, adminAuditLog } from '../db/schema.js'
import { eq } from 'drizzle-orm'
import { deterministicHash } from '../services/cryptoService.js'

async function main() {
  const args = process.argv.slice(2)
  const emailIdx = args.indexOf('--email')
  const idIdx = args.indexOf('--id')

  if (emailIdx === -1 && idIdx === -1) {
    console.error('Usage: npm run admin:promote -- --email <email>')
    console.error('       npm run admin:promote -- --id <userId>')
    process.exit(1)
  }

  let found: { id: string; role: string | null }[]

  if (idIdx !== -1 && args[idIdx + 1]) {
    const userId = args[idIdx + 1]!.trim()
    found = await db
      .select({ id: users.id, role: users.role })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)
  } else if (emailIdx !== -1 && args[emailIdx + 1]) {
    const email = args[emailIdx + 1]!.toLowerCase().trim()
    const emailHash = deterministicHash(email)
    found = await db
      .select({ id: users.id, role: users.role })
      .from(users)
      .where(eq(users.emailHash, emailHash))
      .limit(1)
  } else {
    console.error('Provide --email <email> or --id <userId>')
    process.exit(1)
  }

  if (found.length === 0) {
    console.error('No user found. Make sure the user has signed up at least once.')
    process.exit(1)
  }

  const user = found[0]!

  if (user.role === 'admin') {
    console.log(`User ${user.id} is already admin. No change.`)
    process.exit(0)
  }

  await db.transaction(async (tx) => {
    await tx.update(users).set({ role: 'admin' }).where(eq(users.id, user.id))

    await tx.insert(adminAuditLog).values({
      adminUserId: user.id,
      action: 'bootstrap',
      targetUserId: user.id,
      payload: { previousRole: user.role, newRole: 'admin', method: 'cli_promote_script' },
      ipAddress: null,
      userAgent: 'cli',
    })
  })

  console.log(`User ${user.id} promoted to admin.`)
  console.log('Audit log entry created.')
  process.exit(0)
}

main().catch((err) => {
  console.error('Promotion failed:', err)
  process.exit(1)
})
