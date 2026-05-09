import { storage } from './storage'

export interface PendingMutation {
  id: string
  procedure: string
  payload: unknown
  attempts: number
  lastError: string | null
  createdAt: string
  nextRetryAt: string
}

const KEY = 'sync-queue-v1'
const MAX_ATTEMPTS = 8

export const syncQueue = {
  read(): PendingMutation[] {
    const raw = storage.getString(KEY)
    return raw ? JSON.parse(raw) : []
  },

  add(mutation: Pick<PendingMutation, 'procedure' | 'payload'>) {
    const queue = this.read()
    queue.push({
      ...mutation,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
      attempts: 0,
      lastError: null,
      createdAt: new Date().toISOString(),
      nextRetryAt: new Date().toISOString(),
    })
    storage.set(KEY, JSON.stringify(queue))
  },

  remove(id: string) {
    const queue = this.read().filter((m) => m.id !== id)
    storage.set(KEY, JSON.stringify(queue))
  },

  markFailed(id: string, error: string) {
    const queue = this.read()
    const m = queue.find((item) => item.id === id)
    if (!m) return
    m.attempts++
    m.lastError = error
    if (m.attempts >= MAX_ATTEMPTS) {
      storage.set(KEY, JSON.stringify(queue.filter((item) => item.id !== id)))
      return
    }
    const backoffMs = Math.min(6 * 60 * 60 * 1000, 10_000 * Math.pow(6, m.attempts))
    m.nextRetryAt = new Date(Date.now() + backoffMs).toISOString()
    storage.set(KEY, JSON.stringify(queue))
  },

  count(): number {
    return this.read().length
  },
}
