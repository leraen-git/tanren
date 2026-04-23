import { sql } from 'drizzle-orm'
import { db } from '../db/index.js'
import { redis } from '../redis.js'
import { afterAll, beforeEach } from 'vitest'

beforeEach(async () => {
  await db.execute(sql`
    DO $$ DECLARE r RECORD;
    BEGIN
      FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE 'TRUNCATE TABLE ' || quote_ident(r.tablename) || ' CASCADE';
      END LOOP;
    END $$;
  `)
  await redis.flushdb()
})

afterAll(async () => {
  await redis.quit()
})
