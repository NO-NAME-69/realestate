// src/lib/money.ts
// Integer paise arithmetic — NEVER use floats for money
// Branded type prevents accidental rupee/paise confusion at compile time

import { AppError } from './errors.js';
import type { Paise } from '../types/index.js';

export type { Paise } from '../types/index.js';

/** Convert rupees to paise (integer). Rounds to nearest paise. */
export function toPaise(rupees: number): Paise {
  return Math.round(rupees * 100) as Paise;
}

/** Convert paise to rupees for display only. */
export function toRupees(paise: Paise): number {
  return paise / 100;
}

/** Format paise as INR string for display (e.g., "₹1,234.56"). */
export function formatINR(paise: Paise): string {
  const rupees = paise / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(rupees);
}

/** Add two Paise values. */
export function addPaise(a: Paise, b: Paise): Paise {
  return (a + b) as Paise;
}

/** Subtract paise. Throws if result would be negative. */
export function subtractPaise(a: Paise, b: Paise): Paise {
  if (a < b) {
    throw new AppError('NEGATIVE_MONEY', 422, 'Subtraction would result in negative money');
  }
  return (a - b) as Paise;
}

/** Multiply paise by a factor (integer result via floor). */
export function multiplyPaise(amount: Paise, factor: number): Paise {
  return Math.floor(amount * factor) as Paise;
}

/**
 * Distribute a total among N shares proportionally using integer math.
 * Returns individual amounts + remainder (remainder → company account).
 *
 * Example: distributePaise(10033, [1, 1, 1])
 *   → amounts: [3344, 3344, 3344], remainder: 1
 */
export function distributePaise(
  total: Paise,
  shares: number[],
): { amounts: Paise[]; remainder: Paise } {
  if (shares.length === 0) {
    return { amounts: [], remainder: total };
  }

  const sumShares = shares.reduce((a, b) => a + b, 0);

  if (sumShares === 0) {
    return { amounts: shares.map(() => 0 as Paise), remainder: total };
  }

  const amounts = shares.map((s) => Math.floor((total * s) / sumShares) as Paise);
  const distributed = amounts.reduce((a, b) => (a + b) as Paise, 0 as Paise);
  const remainder = (total - distributed) as Paise;

  return { amounts, remainder };
}

/** Validate that a number is a valid Paise value (positive integer). */
export function isValidPaise(value: number): value is Paise {
  return Number.isInteger(value) && value >= 0;
}

/** Assert a number into Paise (runtime check). */
export function assertPaise(value: number): Paise {
  if (!Number.isInteger(value) || value < 0) {
    throw new AppError('INVALID_MONEY', 422, `Invalid paise value: ${String(value)}`);
  }
  return value as Paise;
}
