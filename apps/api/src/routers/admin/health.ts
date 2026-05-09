import { router, adminProcedure } from '../../trpc.js'

export const healthRouter = router({
  ping: adminProcedure.query(() => ({
    ok: true,
    timestamp: new Date().toISOString(),
  })),
})
