import { createTRPCReact } from '@trpc/react-query'
import type { AppRouter } from '@tanren/api'

export const trpc = createTRPCReact<AppRouter>()
