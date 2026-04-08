// src/types/fastify.d.ts
// Fastify type augmentation — adds request.user

import type { UserRole } from './enums.js';

declare module 'fastify' {
  interface FastifyRequest {
    user: {
      id: string;
      role: UserRole;
      sessionId: string;
    };
  }
}
