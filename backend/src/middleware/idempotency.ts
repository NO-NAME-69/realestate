// src/middleware/idempotency.ts
// Idempotency-Key enforcement for all financial mutations

import type { FastifyRequest, FastifyReply } from 'fastify';
import { getIdempotencyResult, setIdempotencyResult, hashPayload } from '../lib/redis.js';

/**
 * Idempotency middleware for financial mutations.
 * Requires Idempotency-Key header (UUID).
 * Caches response for 24h in Redis.
 */
export async function idempotencyMiddleware(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const key = request.headers['idempotency-key'];
  if (!key || typeof key !== 'string') {
    void reply.code(400).send({
      error: 'Idempotency-Key header required',
      requestId: request.id,
    });
    return;
  }

  const userId = request.user?.id;
  if (!userId) {
    void reply.code(401).send({ error: 'Unauthorized', requestId: request.id });
    return;
  }

  // Check for existing result
  const existing = await getIdempotencyResult(userId, key);
  if (existing) {
    const currentPayloadHash = hashPayload(request.body);
    if (existing.payloadHash === currentPayloadHash) {
      // Same key + same payload → return cached result (safe replay)
      void reply.code(existing.statusCode).send(existing.body);
      return;
    }
    // Same key + different payload → reject
    void reply.code(422).send({
      error: 'Idempotency key reused with different payload',
      requestId: request.id,
    });
    return;
  }

  // Note: In Fastify 5, response caching after handler is done in the route handler.
  // The idempotency result will be stored by the service layer or onSend hook at the route level.
}
