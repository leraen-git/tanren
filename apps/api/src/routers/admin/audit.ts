import { z } from 'zod'
import { router, adminProcedure } from '../../trpc.js'
import { db } from '../../db/index.js'
import { adminAuditLog } from '../../db/schema.js'
import { desc, eq } from 'drizzle-orm'

export const auditRouter = router({
  list: adminProcedure
    .input(
      z.object({
        cursor: z.string().optional(),
        limit: z.number().min(1).max(100).default(50),
        action: z.string().optional(),
      }),
    )
    .query(async ({ input }) => {
      const rows = await db
        .select({
          id: adminAuditLog.id,
          action: adminAuditLog.action,
          adminUserId: adminAuditLog.adminUserId,
          targetUserId: adminAuditLog.targetUserId,
          payload: adminAuditLog.payload,
          ipAddress: adminAuditLog.ipAddress,
          createdAt: adminAuditLog.createdAt,
        })
        .from(adminAuditLog)
        .where(input.action ? eq(adminAuditLog.action, input.action as any) : undefined)
        .orderBy(desc(adminAuditLog.createdAt))
        .limit(input.limit + 1)

      const hasMore = rows.length > input.limit
      const items = rows.slice(0, input.limit)

      return {
        items,
        nextCursor: hasMore ? items[items.length - 1]!.id : null,
      }
    }),
})
