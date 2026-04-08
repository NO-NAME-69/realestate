// src/schemas/shared.schema.ts
// Common Zod schemas shared across all modules

import { z } from 'zod';

// ━━━━━━━━━━━━━━━━ PRIMITIVE SCHEMAS ━━━━━━━━━━━━━━━━

export const UUIDSchema = z.string().uuid();

/** Money amounts — always integer paise, positive */
export const MoneySchema = z.number().int().min(1).max(100_000_000_00); // ₹10cr max

/** Indian mobile number */
export const MobileSchema = z.string().regex(/^[6-9]\d{9}$/, 'Invalid Indian mobile number');

/** PAN card format */
export const PANSchema = z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/, 'Invalid PAN format');

/** Aadhaar number — 12 digits */
export const AadhaarSchema = z.string().regex(/^\d{12}$/, 'Invalid Aadhaar format');

/** Email */
export const EmailSchema = z.string().email().max(255);

/** Password with complexity rules */
export const PasswordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password too long')
  .regex(/[A-Z]/, 'Password needs at least one uppercase letter')
  .regex(/[a-z]/, 'Password needs at least one lowercase letter')
  .regex(/[0-9]/, 'Password needs at least one digit')
  .regex(/[^A-Za-z0-9]/, 'Password needs at least one special character');

// ━━━━━━━━━━━━━━━━ PAGINATION ━━━━━━━━━━━━━━━━

export const PaginationSchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const DateRangeSchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

// ━━━━━━━━━━━━━━━━ SORT ━━━━━━━━━━━━━━━━

export const SortOrderSchema = z.enum(['asc', 'desc']).default('desc');

// ━━━━━━━━━━━━━━━━ RESPONSE TYPES ━━━━━━━━━━━━━━━━

export const PaginationMetaSchema = z.object({
  cursor: z.string().uuid().optional(),
  hasMore: z.boolean(),
  total: z.number().int().optional(),
});
