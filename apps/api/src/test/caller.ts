import { appRouter } from '../router.js'
import { db } from '../db/index.js'
import type { Context } from '../trpc.js'

const mockReq = {
  headers: { 'content-type': 'application/json' },
  ip: '127.0.0.1',
  log: {
    info: () => {},
    warn: () => {},
    error: () => {},
  },
} as unknown as Context['req']

export function createTestCaller(userId: string | null = null, sessionToken: string | null = null): ReturnType<typeof appRouter.createCaller> {
  return appRouter.createCaller({
    req: mockReq,
    db,
    userId,
    sessionToken,
  })
}
