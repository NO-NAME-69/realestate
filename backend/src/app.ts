// src/app.ts
// Fastify instance setup + plugin registration

import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import rateLimit from '@fastify/rate-limit';
import { env } from './config/env.js';
import { redis } from './config/redis.js';
import { registerSecurityHeaders } from './middleware/securityHeaders.js';
import { AppError } from './lib/errors.js';
import { writeAuditLog } from './lib/audit.js';
import { sha256 } from './lib/crypto.js';

// Module routes
import { authRoutes } from './modules/auth/auth.routes.js';
import { walletRoutes } from './modules/wallet/wallet.routes.js';
import { investmentRoutes } from './modules/investment/investment.routes.js';
import { plotRoutes } from './modules/plot/plot.routes.js';
import { projectRoutes } from './modules/project/project.routes.js';
import { teamRoutes } from './modules/team/team.routes.js';
import { adminRoutes } from './modules/admin/admin.routes.js';
import { webhookRoutes } from './modules/webhooks/webhook.routes.js';
import { userRoutes } from './modules/user/user.routes.js';

export async function buildApp() {
  const fastify = Fastify({
    logger: {
      level: env.NODE_ENV === 'development' ? 'debug' : 'info',
      transport:
        env.NODE_ENV === 'development'
          ? { target: 'pino-pretty', options: { colorize: true } }
          : undefined,
    },
    trustProxy: true,
  });

  // ━━━━━━━━ SECURITY HEADERS ━━━━━━━━
  registerSecurityHeaders(fastify);

  // ━━━━━━━━ CORS ━━━━━━━━
  await fastify.register(cors, {
    origin: [env.FRONTEND_URL],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Authorization', 'Content-Type', 'Idempotency-Key'],
    credentials: true,
    maxAge: 86400,
  });

  // ━━━━━━━━ COOKIES (for refresh token) ━━━━━━━━
  await fastify.register(cookie, {
    secret: env.JWT_SECRET,
  });

  // ━━━━━━━━ RATE LIMITING ━━━━━━━━
  await fastify.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
    redis,
    keyGenerator: (request) => {
      return request.user?.id ?? request.ip;
    },
  });

  // ━━━━━━━━ ERROR HANDLER ━━━━━━━━
  fastify.setErrorHandler(async (error, request, reply) => {
    const isAppError = error instanceof AppError;
    const appError = isAppError ? error as AppError : null;

    // Log full error internally
    request.log.error({ err: error, requestId: request.id });

    // Audit log if security-relevant
    const statusCode = appError?.statusCode ?? (error as { statusCode?: number }).statusCode ?? 500;
    if (statusCode === 401 || statusCode === 403 || statusCode === 429) {
      void writeAuditLog({
        type: statusCode === 429 ? 'RATE_LIMIT_BREACH' : 'UNAUTHORIZED_ACCESS_ATTEMPT',
        actorId: request.user?.id ?? null,
        actorRole: request.user?.role ?? null,
        targetType: 'endpoint',
        targetId: null,
        ipAddress: request.ip,
        userAgentHash: sha256(String(request.headers['user-agent'] ?? '')),
        payload: { path: request.url, method: request.method },
        result: 'FAILURE',
        failureReason: appError?.message ?? 'Internal error',
      });
    }

    // Return sanitized response — NEVER stack trace in production
    return reply.code(statusCode).send({
      error: appError?.message ?? 'Internal server error',
      requestId: request.id,
      ...(appError?.fields ? { fields: appError.fields } : {}),
    });
  });

  // ━━━━━━━━ ROUTES ━━━━━━━━
  await fastify.register(authRoutes, { prefix: '/api/v1/auth' });
  await fastify.register(userRoutes, { prefix: '/api/v1/users' });
  await fastify.register(walletRoutes, { prefix: '/api/v1/wallet' });
  await fastify.register(investmentRoutes, { prefix: '/api/v1/investments' });
  await fastify.register(plotRoutes, { prefix: '/api/v1/plots' });
  await fastify.register(projectRoutes, { prefix: '/api/v1/projects' });
  await fastify.register(teamRoutes, { prefix: '/api/v1/teams' });
  await fastify.register(adminRoutes, { prefix: '/api/v1/admin' });
  await fastify.register(webhookRoutes, { prefix: '/api/v1/webhooks' });

  // Health check
  fastify.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

  return fastify;
}
