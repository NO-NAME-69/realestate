// src/lib/redis.ts
// Redis helper functions for locking, rate limiting, and idempotency

import { redis } from '../config/redis.js';
import { sha256 } from './crypto.js';

/**
 * Acquire a distributed lock using Redis SET NX.
 * Returns true if lock acquired, false if already held.
 */
export async function acquireLock(
  key: string,
  ttlSeconds: number = 30,
): Promise<boolean> {
  const result = await redis.set(`lock:${key}`, '1', 'EX', ttlSeconds, 'NX');
  return result === 'OK';
}

/**
 * Release a distributed lock.
 */
export async function releaseLock(key: string): Promise<void> {
  await redis.del(`lock:${key}`);
}

/**
 * Check idempotency key. Returns cached response if exists.
 */
export async function getIdempotencyResult(
  userId: string,
  key: string,
): Promise<{ statusCode: number; body: string; payloadHash: string } | null> {
  const cacheKey = `idempotency:${userId}:${key}`;
  const existing = await redis.get(cacheKey);
  if (!existing) return null;

  return JSON.parse(existing) as { statusCode: number; body: string; payloadHash: string };
}

/**
 * Store idempotency result (24h TTL).
 */
export async function setIdempotencyResult(
  userId: string,
  key: string,
  payloadHash: string,
  statusCode: number,
  body: string,
): Promise<void> {
  const cacheKey = `idempotency:${userId}:${key}`;
  await redis.setex(
    cacheKey,
    86400, // 24 hours
    JSON.stringify({ payloadHash, statusCode, body }),
  );
}

/**
 * Hash a request payload for idempotency comparison.
 */
export function hashPayload(payload: unknown): string {
  return sha256(JSON.stringify(payload));
}

/**
 * Increment login attempt counter. Returns current count.
 */
export async function incrementLoginAttempts(
  email: string,
  ip: string,
): Promise<number> {
  const key = `login_attempts:${email}:${ip}`;
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, 1800); // 30 min window
  }
  return count;
}

/**
 * Reset login attempt counter on successful login.
 */
export async function resetLoginAttempts(
  email: string,
  ip: string,
): Promise<void> {
  const key = `login_attempts:${email}:${ip}`;
  await redis.del(key);
}

/**
 * Check if account is locked.
 */
export async function isAccountLocked(email: string): Promise<boolean> {
  const key = `account_locked:${email}`;
  const locked = await redis.get(key);
  return locked !== null;
}

/**
 * Lock account for specified duration.
 */
export async function lockAccount(
  email: string,
  durationSeconds: number,
): Promise<void> {
  const key = `account_locked:${email}`;
  await redis.setex(key, durationSeconds, '1');
}

/**
 * Store OTP in Redis with TTL.
 */
export async function storeOTP(
  identifier: string,
  otp: string,
  ttlSeconds: number = 300, // 5 min default
): Promise<void> {
  const key = `otp:${identifier}`;
  await redis.setex(key, ttlSeconds, otp);
}

/**
 * Verify and consume OTP (one-time use).
 */
export async function verifyOTP(
  identifier: string,
  otp: string,
): Promise<boolean> {
  const key = `otp:${identifier}`;
  const stored = await redis.get(key);
  if (!stored || stored !== otp) return false;
  await redis.del(key); // consume — one-time use
  return true;
}
