// src/schemas/wallet.schema.ts
import { z } from 'zod';
import { MoneySchema, UUIDSchema, PaginationSchema } from './shared.schema.js';

export const TopupInitiateSchema = z.object({
  amount_paise: MoneySchema.min(50000), // ₹500 minimum
});
export type TopupInitiateInput = z.infer<typeof TopupInitiateSchema>;

export const TopupVerifySchema = z.object({
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
});
export type TopupVerifyInput = z.infer<typeof TopupVerifySchema>;

export const TransactionListSchema = PaginationSchema.extend({
  type: z.string().optional(),
  status: z.string().optional(),
});
export type TransactionListInput = z.infer<typeof TransactionListSchema>;
