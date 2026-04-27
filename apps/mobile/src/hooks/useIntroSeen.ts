import { useCallback, useReducer } from 'react'
import { storage, STORAGE_KEYS } from '../lib/storage'

export function useIntroSeen() {
  const [, forceRender] = useReducer((x: number) => x + 1, 0)
  const seen = storage.getBoolean(STORAGE_KEYS.INTRO_SEEN) ?? false

  const markSeen = useCallback(() => {
    storage.set(STORAGE_KEYS.INTRO_SEEN, true)
    forceRender()
  }, [])

  const reset = useCallback(() => {
    storage.remove(STORAGE_KEYS.INTRO_SEEN)
    forceRender()
  }, [])

  return { seen, markSeen, reset }
}
