import Redis from 'ioredis'

const REDIS_URL = process.env['REDIS_URL'] ?? 'redis://localhost:6379'

export const redis = new Redis(REDIS_URL, {
  lazyConnect: true,
  maxRetriesPerRequest: 1,
  retryStrategy: (times) => (times > 2 ? null : Math.min(times * 100, 300)),
})

redis.on('error', (err: Error) => {
  if (process.env['NODE_ENV'] !== 'test') {
    console.error('[Redis]', err.message)
  }
})
