// src/middleware/authorize.ts
// RBAC + resource ownership check
// Returns 404 (not 403) — prevents resource enumeration

import type { FastifyRequest, FastifyReply } from 'fastify';
import { UserRole } from '../types/enums.js';
import { writeAuditLog } from '../lib/audit.js';
import { sha256 } from '../lib/crypto.js';

/**
 * Authorization middleware factory.
 * Usage: { preHandler: [authenticate, authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN)] }
 *
 * Returns 404 on unauthorized — prevents attackers from knowing resource exists.
 */
export function authorize(...allowedRoles: UserRole[]) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    if (!request.user) {
      void reply.code(404).send({ error: 'Not found', requestId: request.id });
      return;
    }

    if (!allowedRoles.includes(request.user.role as UserRole)) {
      void writeAuditLog({
        type: 'UNAUTHORIZED_ACCESS_ATTEMPT',
        actorId: request.user.id,
        actorRole: request.user.role,
        targetType: 'endpoint',
        targetId: null,
        ipAddress: request.ip,
        userAgentHash: sha256(String(request.headers['user-agent'] ?? '')),
        payload: {
          path: request.url,
          method: request.method,
          requiredRoles: allowedRoles,
        },
        result: 'FAILURE',
        failureReason: `Role ${request.user.role} not in [${allowedRoles.join(', ')}]`,
      });
      void reply.code(404).send({ error: 'Not found', requestId: request.id });
    }
  };
}

/**
 * Verify that the requesting user owns the resource.
 * Use for horizontal privilege escalation prevention.
 */
export function authorizeOwner(ownerIdExtractor: (request: FastifyRequest) => string | undefined) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    if (!request.user) {
      void reply.code(404).send({ error: 'Not found', requestId: request.id });
      return;
    }

    // Admins and Super Admins bypass ownership check
    if (
      request.user.role === UserRole.ADMIN ||
      request.user.role === UserRole.SUPER_ADMIN
    ) {
      return;
    }

    const ownerId = ownerIdExtractor(request);
    if (ownerId && ownerId !== request.user.id) {
      void reply.code(404).send({ error: 'Not found', requestId: request.id });
    }
  };
}
