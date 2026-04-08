// src/schemas/plot.schema.ts
import { z } from 'zod';
import { UUIDSchema, PaginationSchema, MoneySchema } from './shared.schema.js';

export const PlotFilterSchema = PaginationSchema.extend({
  project_id: UUIDSchema.optional(),
  type: z.enum(['CORNER', 'MIDDLE', 'DOUBLE_ROAD']).optional(),
  status: z.enum(['AVAILABLE', 'HELD', 'RESERVED', 'SOLD']).optional(),
  min_price_paise: z.coerce.number().int().optional(),
  max_price_paise: z.coerce.number().int().optional(),
  min_size_sqft: z.coerce.number().int().optional(),
  facing: z.string().max(50).optional(),
});
export type PlotFilterInput = z.infer<typeof PlotFilterSchema>;

export const HoldPlotSchema = z.object({});
export type HoldPlotInput = z.infer<typeof HoldPlotSchema>;
