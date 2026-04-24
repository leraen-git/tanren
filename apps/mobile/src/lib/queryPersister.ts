import type { Persister, PersistedClient } from '@tanstack/react-query-persist-client'
import { storage } from './storage'

const QUERY_CACHE_KEY = 'tanren-query-cache-v1'

export const mmkvPersister: Persister = {
  persistClient: async (client: PersistedClient) => {
    try {
      storage.set(QUERY_CACHE_KEY, JSON.stringify(client))
    } catch (err) {
      console.warn('[queryPersister] persistClient failed', err)
    }
  },

  restoreClient: async (): Promise<PersistedClient | undefined> => {
    try {
      const cached = storage.getString(QUERY_CACHE_KEY)
      if (!cached) return undefined
      return JSON.parse(cached) as PersistedClient
    } catch (err) {
      console.warn('[queryPersister] restoreClient failed, clearing cache', err)
      storage.remove(QUERY_CACHE_KEY)
      return undefined
    }
  },

  removeClient: async () => {
    storage.remove(QUERY_CACHE_KEY)
  },
}
