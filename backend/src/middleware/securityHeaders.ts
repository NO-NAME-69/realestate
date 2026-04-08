// src/middleware/securityHeaders.ts
// OWASP security headers — applied globally

import type { FastifyInstance } from 'fastify';

/**
 * Register security headers on all responses.
 * Strips X-Powered-By and Server headers.
 */
export function registerSecurityHeaders(fastify: FastifyInstance): void {
  fastify.addHook('onSend', async (_request, reply, payload) => {
    void reply.headers({
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '0', // Disabled — use CSP instead
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
      'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Resource-Policy': 'same-origin',
    });
    void reply.removeHeader('X-Powered-By');
    void reply.removeHeader('Server');
    return payload;
  });
}
