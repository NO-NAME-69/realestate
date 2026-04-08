// src/modules/wallet/wallet.routes.ts
import type { FastifyInstance } from 'fastify';
import { authenticate } from '../../middleware/authenticate.js';
import { idempotencyMiddleware } from '../../middleware/idempotency.js';
import { validateBody, validateQuery } from '../../middleware/validate.js';
import { TopupInitiateSchema, TopupVerifySchema, TransactionListSchema } from '../../schemas/wallet.schema.js';
import { getWalletBalance, initiateTopup, verifyTopup, getTransactions } from './wallet.service.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import type { TopupInitiateInput, TopupVerifyInput, TransactionListInput } from '../../schemas/wallet.schema.js';

export async function walletRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/balance', {
    preHandler: [authenticate],
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const result = await getWalletBalance(request.user.id);
      void reply.send({ data: result });
    },
  });

  fastify.post('/topup/initiate', {
    preHandler: [authenticate, validateBody(TopupInitiateSchema), idempotencyMiddleware],
    handler: async (request: FastifyRequest<{ Body: TopupInitiateInput }>, reply: FastifyReply) => {
      const result = await initiateTopup(request.user.id, request.body);
      void reply.send({ data: result });
    },
    config: { rateLimit: { max: 10, timeWindow: '1 hour' } },
  });

  fastify.post('/topup/verify', {
    preHandler: [authenticate, validateBody(TopupVerifySchema), idempotencyMiddleware],
    handler: async (request: FastifyRequest<{ Body: TopupVerifyInput }>, reply: FastifyReply) => {
      const result = await verifyTopup(request.user.id, request.body);
      void reply.send({ data: result });
    },
  });

  fastify.get('/transactions', {
    preHandler: [authenticate, validateQuery(TransactionListSchema)],
    handler: async (request: FastifyRequest<{ Querystring: TransactionListInput }>, reply: FastifyReply) => {
      const { cursor, limit } = request.query as TransactionListInput;
      const result = await getTransactions(request.user.id, cursor, limit);
      void reply.send({ data: result.transactions, meta: result.meta });
    },
  });
}
