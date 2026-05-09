#!/usr/bin/env tsx
/**
 * Promote a user to admin role.
 *
 * Usage:
 *   npm run admin:promote -- --email <email>
 *
 * Idempotent — running it twice on the same email is a no-op.
 * Logs the action in admin_audit_log with action='bootstrap'.
 */

import { db } from '../db/index.js'
import { users, adminAuditLog } from '../db/schema.js'
import { eq } from 'drizzle-orm'
import { deterministicHash } from '../services/cryptoService.js'

async function main() {
  const args = process.argv.slice(2)
  const emailIdx = args.indexOf('--email')
  if (emailIdx === -1 || !args[emailIdx + 1]) {
    console.error('Usage: npm run admin:promote -- --email <email>')
    process.exit(1)
  }

  const email = args[emailIdx + 1]!.toLowerCase().trim()
  const emailHash = deterministicHash(email)

  const found = await db
    .select({ id: users.id, role: users.role })
    .from(users)
    .where(eq(users.emailHash, emailHash))
    .limit(1)

  if (found.length === 0) {
    console.error(`No user found with email: ${email}`)
    console.error('Make sure the user has signed up at least once.')
    process.exit(1)
  }

  const user = found[0]!

  if (user.role === 'admin') {
    console.log(`User ${email} is already admin. No change.`)
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

  console.log(`User ${email} (${user.id}) promoted to admin.`)
  console.log('Audit log entry created.')
  process.exit(0)
}

main().catch((err) => {
  console.error('Promotion failed:', err)
  process.exit(1)
})
