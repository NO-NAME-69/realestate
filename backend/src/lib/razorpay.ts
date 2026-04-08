// src/lib/razorpay.ts
// Razorpay SDK wrapper + webhook signature verification (constant-time)

import Razorpay from 'razorpay';
import crypto from 'crypto';
import { env } from '../config/env.js';

// Razorpay SDK instance
export const razorpayClient = new Razorpay({
  key_id: env.RAZORPAY_KEY_ID,
  key_secret: env.RAZORPAY_KEY_SECRET,
});

/**
 * Verify Razorpay webhook signature using HMAC-SHA256.
 * MUST use raw body bytes — NOT parsed JSON (serialization changes hash).
 * Uses constant-time comparison to prevent timing attacks.
 */
export function verifyRazorpayWebhook(
  rawBody: Buffer,
  signature: string,
  secret: string = env.RAZORPAY_WEBHOOK_SECRET,
): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');

  // Constant-time comparison — prevents timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'utf8'),
      Buffer.from(expectedSignature, 'utf8'),
    );
  } catch {
    // Buffers of different lengths — definitely not matching
    return false;
  }
}

/**
 * Verify Razorpay payment signature (for client-side payment verification).
 * Used after checkout: orderId + paymentId + signature → verified
 */
export function verifyRazorpayPayment(
  orderId: string,
  paymentId: string,
  signature: string,
): boolean {
  const body = `${orderId}|${paymentId}`;
  const expectedSignature = crypto
    .createHmac('sha256', env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest('hex');

  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'utf8'),
      Buffer.from(expectedSignature, 'utf8'),
    );
  } catch {
    return false;
  }
}
