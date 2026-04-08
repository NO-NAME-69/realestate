// src/lib/audit.ts
// Append-only audit logging — DB user should have INSERT-only on audit_logs

import { prisma } from '../config/database.js';
import { sha256 } from './crypto.js';
import type { AuditEntry } from '../types/index.js';

/**
 * Write an audit log entry using raw SQL to bypass Prisma middleware.
 * This ensures no interception or modification of audit records.
 */
export async function writeAuditLog(event: AuditEntry): Promise<void> {
  try {
    await prisma.$executeRaw`
      INSERT INTO audit_logs
        (id, event_type, actor_id, actor_role, target_type, target_id,
         ip_address, user_agent_hash, payload, result, failure_reason, created_at)
      VALUES
        (gen_random_uuid(), ${event.type}, ${event.actorId}, ${event.actorRole},
         ${event.targetType}, ${event.targetId},
         ${event.ipAddress}, ${event.userAgentHash},
         ${JSON.stringify(event.payload)}::jsonb,
         ${event.result}, ${event.failureReason ?? null}, NOW())
    `;
  } catch (error) {
    // Audit logging must NEVER crash the application
    // Log to stdout as fallback (will be captured by log aggregator)
    // eslint-disable-next-line no-console
    console.error('Failed to write audit log:', error, event);
  }
}

/**
 * Create an audit entry from a Fastify request context.
 */
export function buildAuditEntry(
  request: { user?: { id: string; role: string }; ip: string; headers: Record<string, string | string[] | undefined> },
  type: string,
  result: 'SUCCESS' | 'FAILURE',
  options: {
    targetType?: string;
    targetId?: string;
    payload?: Record<string, unknown>;
    failureReason?: string;
  } = {},
): AuditEntry {
  const userAgent = Array.isArray(request.headers['user-agent'])
    ? request.headers['user-agent'][0] ?? ''
    : request.headers['user-agent'] ?? '';

  return {
    type,
    actorId: request.user?.id ?? null,
    actorRole: request.user?.role ?? null,
    targetType: options.targetType ?? null,
    targetId: options.targetId ?? null,
    ipAddress: request.ip,
    userAgentHash: sha256(userAgent),
    payload: options.payload ?? {},
    result,
    failureReason: options.failureReason,
  };
}
