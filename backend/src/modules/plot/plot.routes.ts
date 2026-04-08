// src/modules/plot/plot.routes.ts
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authenticate } from '../../middleware/authenticate.js';
import { idempotencyMiddleware } from '../../middleware/idempotency.js';
import { validateQuery } from '../../middleware/validate.js';
import { PlotFilterSchema } from '../../schemas/plot.schema.js';
import { listPlots, getPlotDetail, holdPlot, releasePlotHold, getUserHeldPlots } from './plot.service.js';
import type { PlotFilterInput } from '../../schemas/plot.schema.js';

export async function plotRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/', {
    preHandler: [authenticate, validateQuery(PlotFilterSchema)],
    handler: async (request: FastifyRequest<{ Querystring: PlotFilterInput }>, reply: FastifyReply) => {
      const result = await listPlots(request.query as PlotFilterInput);
      void reply.send({ data: result.plots, meta: result.meta });
    },
  });

  fastify.get('/held', {
    preHandler: [authenticate],
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const holds = await getUserHeldPlots(request.user.id);
      void reply.send({ data: holds });
    },
  });

  fastify.get('/:id', {
    preHandler: [authenticate],
    handler: async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const plot = await getPlotDetail((request.params as { id: string }).id);
      void reply.send({ data: plot });
    },
  });

  fastify.post('/:id/hold', {
    preHandler: [authenticate, idempotencyMiddleware],
    handler: async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const hold = await holdPlot(request.user.id, (request.params as { id: string }).id);
      void reply.code(201).send({ data: hold });
    },
    config: { rateLimit: { max: 10, timeWindow: '1 hour' } },
  });

  fastify.delete('/:id/hold', {
    preHandler: [authenticate],
    handler: async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      await releasePlotHold(request.user.id, (request.params as { id: string }).id);
      void reply.send({ data: { message: 'Hold released' } });
    },
  });
}
