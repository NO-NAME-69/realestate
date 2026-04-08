// src/lib/crypto.ts
// AES-256-GCM encryption for PII fields (PAN, Aadhaar, bank details)
// Authenticated encryption — provides both confidentiality and integrity

import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto';
import { env } from '../config/env.js';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // bytes
const TAG_LENGTH = 16; // bytes

// Key loaded from env — 64 hex chars = 32 bytes
const encryptionKey = Buffer.from(env.ENCRYPTION_KEY, 'hex');

/**
 * Encrypt plaintext using AES-256-GCM.
 * Returns format: iv:authTag:ciphertext (all hex-encoded)
 */
export function encrypt(plaintext: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, encryptionKey, iv, {
    authTagLength: TAG_LENGTH,
  });
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

/**
 * Decrypt ciphertext encrypted with AES-256-GCM.
 * Expects format: iv:authTag:ciphertext (all hex-encoded)
 */
export function decrypt(ciphertext: string): string {
  const parts = ciphertext.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid ciphertext format');
  }
  const [ivHex, tagHex, encHex] = parts as [string, string, string];

  const decipher = createDecipheriv(ALGORITHM, encryptionKey, Buffer.from(ivHex, 'hex'), {
    authTagLength: TAG_LENGTH,
  });
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encHex, 'hex')),
    decipher.final(),
  ]);
  return decrypted.toString('utf8');
}

/**
 * SHA-256 hash for non-reversible hashing (user agent, payload hashing).
 */
export function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

/**
 * Mask PAN number for logging: "ABCDE1234F" → "AB***F"
 */
export function maskPAN(pan: string): string {
  if (pan.length < 3) return '***';
  return `${pan.slice(0, 2)}***${pan.slice(-1)}`;
}

/**
 * Mask Aadhaar for logging: "123456789012" → "XXXX XXXX 9012"
 */
export function maskAadhaar(aadhaar: string): string {
  if (aadhaar.length < 4) return '****';
  return `XXXX XXXX ${aadhaar.slice(-4)}`;
}

/**
 * Mask bank account number: "1234567890" → "XXXXXX7890"
 */
export function maskBankAccount(account: string): string {
  if (account.length <= 4) return '****';
  return `${'X'.repeat(account.length - 4)}${account.slice(-4)}`;
}
