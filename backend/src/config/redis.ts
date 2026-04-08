// src/config/redis.ts
// ioredis singleton for rate limiting, idempotency, sessions, and distributed locks

import { createRequire } from 'node:module';
import { env } from './env.js';

// ioredis has ESM/CJS interop issues with TypeScript — use createRequire
const require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const Redis = require('ioredis');

// Use weak typing since ioredis ESM types are broken
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let redisInstance: any = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getRedis(): any {
  if (!redisInstance) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
    redisInstance = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy(times: number): number | null {
        if (times > 10) return null;
        return Math.min(times * 200, 5000);
      },
      enableReadyCheck: true,
      lazyConnect: false,
    });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    redisInstance.on('error', (err: Error) => {
      // eslint-disable-next-line no-console
      console.error('Redis connection error:', err);
    });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    redisInstance.on('connect', () => {
      // eslint-disable-next-line no-console
      console.log('✅ Redis connected');
    });
  }
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return redisInstance;
}

export const redis = getRedis();

export async function disconnectRedis(): Promise<void> {
  if (redisInstance) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    await redisInstance.quit();
    redisInstance = null;
  }
}
