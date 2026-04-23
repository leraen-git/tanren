import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('./storage', () => {
  const store = new Map<string, string>()
  return {
    storage: {
      getString: (key: string) => store.get(key),
      set: (key: string, value: string) => store.set(key, value),
      remove: (key: string) => store.delete(key),
    },
  }
})

import { syncQueue } from './syncQueue'

beforeEach(() => {
  const queue = syncQueue.read()
  for (const m of queue) syncQueue.remove(m.id)
})

describe('syncQueue', () => {
  it('starts empty', () => {
    expect(syncQueue.read()).toEqual([])
    expect(syncQueue.count()).toBe(0)
  })

  it('adds and reads mutations', () => {
    syncQueue.add({ procedure: 'sessions.save', payload: { foo: 1 } })
    expect(syncQueue.count()).toBe(1)
    const [item] = syncQueue.read()
    expect(item!.procedure).toBe('sessions.save')
    expect(item!.attempts).toBe(0)
  })

  it('removes by id', () => {
    syncQueue.add({ procedure: 'sessions.save', payload: {} })
    const [item] = syncQueue.read()
    syncQueue.remove(item!.id)
    expect(syncQueue.count()).toBe(0)
  })

  it('markFailed increments attempts and sets backoff', () => {
    syncQueue.add({ procedure: 'weight.add', payload: {} })
    const [item] = syncQueue.read()
    syncQueue.markFailed(item!.id, 'Network timeout')

    const [updated] = syncQueue.read()
    expect(updated!.attempts).toBe(1)
    expect(updated!.lastError).toBe('Network timeout')
    expect(new Date(updated!.nextRetryAt).getTime()).toBeGreaterThan(Date.now())
  })

  it('drops after max attempts', () => {
    syncQueue.add({ procedure: 'test.proc', payload: {} })
    const [item] = syncQueue.read()
    for (let i = 0; i < 8; i++) {
      syncQueue.markFailed(item!.id, 'fail')
    }
    expect(syncQueue.count()).toBe(0)
  })
})
