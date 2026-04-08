// src/modules/investment/investment.routes.ts
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authenticate } from '../../middleware/authenticate.js';
import { idempotencyMiddleware } from '../../middleware/idempotency.js';
import { validateBody, validateQuery } from '../../middleware/validate.js';
import { CreateInvestmentSchema, InvestmentListSchema } from '../../schemas/investment.schema.js';
import { createInvestment, getUserInvestments, getPortfolio } from './investment.service.js';
import type { CreateInvestmentInput, InvestmentListInput } from '../../schemas/investment.schema.js';

export async function investmentRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.post('/', {
    preHandler: [authenticate, validateBody(CreateInvestmentSchema), idempotencyMiddleware],
    handler: async (request: FastifyRequest<{ Body: CreateInvestmentInput }>, reply: FastifyReply) => {
      const idempotencyKey = request.headers['idempotency-key'] as string;
      const result = await createInvestment(request.user.id, request.body, idempotencyKey);
      void reply.code(201).send({ data: result });
    },
    config: { rateLimit: { max: 20, timeWindow: '1 hour' } },
  });

  fastify.get('/', {
    preHandler: [authenticate, validateQuery(InvestmentListSchema)],
    handler: async (request: FastifyRequest<{ Querystring: InvestmentListInput }>, reply: FastifyReply) => {
      const { cursor, limit } = request.query as InvestmentListInput;
      const result = await getUserInvestments(request.user.id, cursor, limit);
      void reply.send({ data: result.investments, meta: result.meta });
    },
  });

  fastify.get('/portfolio', {
    preHandler: [authenticate],
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const result = await getPortfolio(request.user.id);
      void reply.send({ data: result });
    },
  });
}
