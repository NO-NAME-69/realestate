// src/lib/jwt.ts
// JWT sign/verify wrappers — HS256 for both access and refresh tokens
// All payloads validated with Zod after decode

import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { env } from '../config/env.js';
import { UserRole } from '../types/enums.js';
import type { AccessTokenPayload, RefreshTokenPayload } from '../types/index.js';
import { UnauthorizedError } from './errors.js';

// Zod schemas for payload validation after decode
const AccessTokenPayloadSchema = z.object({
  sub: z.string().uuid(),
  role: z.nativeEnum(UserRole),
  sessionId: z.string().uuid(),
  iat: z.number(),
  exp: z.number(),
});

const RefreshTokenPayloadSchema = z.object({
  sub: z.string().uuid(),
  sessionId: z.string().uuid(),
  family: z.string().uuid(),
  iat: z.number(),
  exp: z.number(),
});

/**
 * Sign an access token (HS256).
 */
export function signAccessToken(payload: {
  userId: string;
  role: UserRole;
  sessionId: string;
}): string {
  return jwt.sign(
    {
      sub: payload.userId,
      role: payload.role,
      sessionId: payload.sessionId,
    },
    env.JWT_SECRET,
    {
      expiresIn: env.JWT_ACCESS_EXPIRY as any,
    },
  );
}

/**
 * Verify and decode an access token. Returns validated payload.
 * Throws UnauthorizedError on any failure.
 */
export function verifyAccessToken(token: string): AccessTokenPayload {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET, {
      algorithms: ['HS256'],
    });

    const result = AccessTokenPayloadSchema.safeParse(decoded);
    if (!result.success) {
      throw new UnauthorizedError('Invalid token payload');
    }
    return result.data;
  } catch (error) {
    if (error instanceof UnauthorizedError) throw error;
    if (error instanceof jwt.TokenExpiredError) {
      throw new UnauthorizedError('Token expired');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new UnauthorizedError('Invalid token');
    }
    throw new UnauthorizedError('Token verification failed');
  }
}

/**
 * Sign a refresh token (HS256 with same secret + family tracking).
 */
export function signRefreshToken(payload: {
  userId: string;
  sessionId: string;
  family: string;
}): string {
  return jwt.sign(
    {
      sub: payload.userId,
      sessionId: payload.sessionId,
      family: payload.family,
    },
    env.JWT_SECRET,
    {
      expiresIn: env.JWT_REFRESH_EXPIRY as any,
    },
  );
}

/**
 * Verify and decode a refresh token. Returns validated payload.
 */
export function verifyRefreshToken(token: string): RefreshTokenPayload {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET, {
      algorithms: ['HS256'],
    });

    const result = RefreshTokenPayloadSchema.safeParse(decoded);
    if (!result.success) {
      throw new UnauthorizedError('Invalid refresh token payload');
    }
    return result.data;
  } catch (error) {
    if (error instanceof UnauthorizedError) throw error;
    if (error instanceof jwt.TokenExpiredError) {
      throw new UnauthorizedError('Refresh token expired');
    }
    throw new UnauthorizedError('Invalid refresh token');
  }
}
