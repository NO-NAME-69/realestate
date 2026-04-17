// src/schemas/project.schema.ts
import { z } from 'zod';
import { UUIDSchema, PaginationSchema, MoneySchema } from './shared.schema.js';

export const CreateProjectSchema = z.object({
  name: z.string().min(2).max(300).trim(),
  type: z.string().min(1).max(50).trim(),
  location: z.string().min(2).max(500).trim(),
  description: z.string().max(5000).trim().optional(),
  totalAreaSqft: z.number().int().positive(),
  totalCost: MoneySchema,
  estimatedValue: MoneySchema,
  completionDate: z.coerce.date().optional(),
  galleryUrls: z.array(z.string().url()).max(20).optional(),
});
export type CreateProjectInput = z.infer<typeof CreateProjectSchema>;

export const UpdateProjectSchema = CreateProjectSchema.partial();
export type UpdateProjectInput = z.infer<typeof UpdateProjectSchema>;

export const ProjectListSchema = PaginationSchema.extend({
  status: z.string().optional(),
  type: z.string().optional(),
});
export type ProjectListInput = z.infer<typeof ProjectListSchema>;

export const UpdateProjectStatusSchema = z.object({
  status: z.enum([
    'PLANNED', 'LAND_ACQUIRED', 'LEGAL_IN_PROGRESS', 'APPROVED',
    'UNDER_DEVELOPMENT', 'READY_FOR_SALE', 'COMPLETED', 'CLOSED',
  ]),
});
export type UpdateProjectStatusInput = z.infer<typeof UpdateProjectStatusSchema>;
