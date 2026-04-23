import { useCallback } from 'react'
import { syncQueue } from '@/lib/syncQueue'
import { trpc } from '@/lib/trpc'

export function useResilientMutation<TInput>(
  procedure: string,
  options?: { onSuccess?: () => void; onQueued?: () => void },
) {
  const utils = trpc.useUtils()

  return useCallback(
    async (input: TInput) => {
      try {
        const parts = procedure.split('.')
        let target: any = utils.client
        for (const p of parts) target = target[p]
        await target.mutate(input)
        options?.onSuccess?.()
      } catch (err: any) {
        if (err?.data?.code) {
          throw err
        }
        syncQueue.add({ procedure, payload: input })
        options?.onQueued?.()
      }
    },
    [procedure, utils, options],
  )
}
