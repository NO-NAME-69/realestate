// src/schemas/investment.schema.ts
import { z } from 'zod';
import { MoneySchema, UUIDSchema, PaginationSchema } from './shared.schema.js';
import { env } from '../config/env.js';

export const CreateInvestmentSchema = z.object({
  project_id: UUIDSchema,
  plot_id: UUIDSchema.optional(),
  amount_paise: MoneySchema,
  is_reinvestment: z.boolean().default(false),
  source_profit_id: UUIDSchema.optional(),
});
export type CreateInvestmentInput = z.infer<typeof CreateInvestmentSchema>;

export const InvestmentListSchema = PaginationSchema.extend({
  project_id: UUIDSchema.optional(),
});
export type InvestmentListInput = z.infer<typeof InvestmentListSchema>;
