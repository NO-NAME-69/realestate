// src/types/index.ts
// Shared domain types — branded types, utility types

import type { UserRole } from './enums.js';

// ━━━━━━━━━━━━━━━━ BRANDED TYPE: PAISE ━━━━━━━━━━━━━━━━
declare const __brand: unique symbol;
type Brand<T, B> = T & { [__brand]: B };

/** All money values in paise (1₹ = 100 paise). NEVER use floats for money. */
export type Paise = Brand<number, 'Paise'>;

// ━━━━━━━━━━━━━━━━ JWT PAYLOAD TYPES ━━━━━━━━━━━━━━━━

export interface AccessTokenPayload {
  sub: string; // userId (UUID)
  role: UserRole;
  sessionId: string; // UUID
  iat: number;
  exp: number;
}

export interface RefreshTokenPayload {
  sub: string;
  sessionId: string;
  family: string; // token family UUID
  iat: number;
  exp: number;
}

// ━━━━━━━━━━━━━━━━ AUDIT LOG ENTRY ━━━━━━━━━━━━━━━━

export interface AuditEntry {
  type: string;
  actorId: string | null;
  actorRole: string | null;
  targetType: string | null;
  targetId: string | null;
  ipAddress: string | null;
  userAgentHash: string | null;
  payload: Record<string, unknown>;
  result: 'SUCCESS' | 'FAILURE';
  failureReason?: string;
}

// ━━━━━━━━━━━━━━━━ PAGINATION ━━━━━━━━━━━━━━━━

export interface PaginationMeta {
  cursor?: string;
  hasMore: boolean;
  total?: number;
}

export interface ApiResponse<T> {
  data: T;
  meta?: PaginationMeta;
}

export interface ApiError {
  error: string;
  requestId: string;
  fields?: Record<string, string>;
}

// Re-export enums
export * from './enums.js';
