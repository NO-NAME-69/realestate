// src/modules/auth/auth.routes.ts
// Auth route definitions

import type { FastifyInstance } from 'fastify';
import {
  registerController,
  loginController,
  refreshController,
  logoutController,
  verifyOTPController,
  checkAvailabilityController,
} from './auth.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { validateBody } from '../../middleware/validate.js';
import {
  RegisterSchema,
  LoginSchema,
  VerifyOTPSchema,
  RefreshTokenSchema,
} from '../../schemas/auth.schema.js';

export async function authRoutes(fastify: FastifyInstance): Promise<void> {
  // Public routes
  fastify.post('/register', {
    preHandler: [validateBody(RegisterSchema)],
    handler: registerController,
    config: { rateLimit: { max: 10, timeWindow: '1 hour' } },
  });

  fastify.get('/check-availability', {
    handler: checkAvailabilityController,
    config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
  });

  fastify.post('/login', {
    preHandler: [validateBody(LoginSchema)],
    handler: loginController,
    config: { rateLimit: { max: 5, timeWindow: '1 minute' } },
  });

  fastify.post('/verify-otp', {
    preHandler: [validateBody(VerifyOTPSchema)],
    handler: verifyOTPController,
    config: { rateLimit: { max: 10, timeWindow: '1 hour' } },
  });

  fastify.post('/refresh', {
    preHandler: [validateBody(RefreshTokenSchema)],
    handler: refreshController,
    config: { rateLimit: { max: 20, timeWindow: '1 hour' } },
  });

  // Authenticated routes
  fastify.post('/logout', {
    preHandler: [authenticate],
    handler: logoutController,
  });
}
