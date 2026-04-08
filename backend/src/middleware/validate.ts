// src/middleware/validate.ts
// Zod request validation for Fastify

import type { FastifyRequest, FastifyReply } from 'fastify';
import type { ZodSchema, ZodError } from 'zod';

/**
 * Create a Zod validation preHandler for request body.
 * Returns 422 with field-level error messages.
 */
export function validateBody<T>(schema: ZodSchema<T>) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const result = schema.safeParse(request.body);
    if (!result.success) {
      const fields = formatZodErrors(result.error);
      void reply.code(422).send({
        error: 'Validation failed',
        requestId: request.id,
        fields,
      });
    } else {
      // Replace body with validated (and stripped) data
      (request as { body: T }).body = result.data;
    }
  };
}

/**
 * Create a Zod validation preHandler for query params.
 */
export function validateQuery<T>(schema: ZodSchema<T>) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const result = schema.safeParse(request.query);
    if (!result.success) {
      const fields = formatZodErrors(result.error);
      void reply.code(422).send({
        error: 'Validation failed',
        requestId: request.id,
        fields,
      });
    } else {
      (request as { query: T }).query = result.data;
    }
  };
}

/**
 * Create a Zod validation preHandler for route params.
 */
export function validateParams<T>(schema: ZodSchema<T>) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const result = schema.safeParse(request.params);
    if (!result.success) {
      const fields = formatZodErrors(result.error);
      void reply.code(422).send({
        error: 'Validation failed',
        requestId: request.id,
        fields,
      });
    } else {
      (request as { params: T }).params = result.data;
    }
  };
}

function formatZodErrors(error: ZodError): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const path = issue.path.join('.');
    fields[path] = issue.message;
  }
  return fields;
}
