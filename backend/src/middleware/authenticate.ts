// src/middleware/authenticate.ts
// JWT verification → request.user decoration

import type { FastifyRequest, FastifyReply } from 'fastify';
import { verifyAccessToken } from '../lib/jwt.js';
import { writeAuditLog } from '../lib/audit.js';
import { sha256 } from '../lib/crypto.js';

/**
 * Authentication middleware.
 * Extracts and verifies JWT from Authorization: Bearer header.
 * Populates request.user with { id, role, sessionId }.
 */
export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    void writeAuditLog({
      type: 'UNAUTHORIZED_ACCESS_ATTEMPT',
      actorId: null,
      actorRole: null,
      targetType: 'endpoint',
      targetId: null,
      ipAddress: request.ip,
      userAgentHash: sha256(String(request.headers['user-agent'] ?? '')),
      payload: { path: request.url, method: request.method },
      result: 'FAILURE',
      failureReason: 'Missing or invalid authorization header',
    });
    void reply.code(401).send({ error: 'Unauthorized', requestId: request.id });
    return;
  }

  const token = authHeader.slice(7); // Remove "Bearer "
  try {
    const payload = verifyAccessToken(token);
    request.user = {
      id: payload.sub,
      role: payload.role,
      sessionId: payload.sessionId,
    };
  } catch {
    void reply.code(401).send({ error: 'Invalid or expired token', requestId: request.id });
  }
}
