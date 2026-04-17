// src/modules/project/project.routes.ts
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { idempotencyMiddleware } from '../../middleware/idempotency.js';
import { validateBody, validateQuery } from '../../middleware/validate.js';
import { UserRole } from '../../types/enums.js';
import { prisma } from '../../config/database.js';
import { NotFoundError } from '../../lib/errors.js';
import {
  CreateProjectSchema,
  UpdateProjectSchema,
  ProjectListSchema,
  UpdateProjectStatusSchema,
} from '../../schemas/project.schema.js';
import type { CreateProjectInput, UpdateProjectInput, ProjectListInput, UpdateProjectStatusInput } from '../../schemas/project.schema.js';
import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_ROOT = path.join(__dirname, '..', '..', '..', 'uploads', 'projects');

export async function projectRoutes(fastify: FastifyInstance): Promise<void> {
  // Public-ish (authenticated users can view)
  fastify.get('/', {
    preHandler: [authenticate, validateQuery(ProjectListSchema)],
    handler: async (request: FastifyRequest<{ Querystring: ProjectListInput }>, reply: FastifyReply) => {
      const { cursor, limit, status, type } = request.query as ProjectListInput;
      const where: Record<string, unknown> = { deletedAt: null };
      if (status) where['status'] = status;
      if (type) where['type'] = type;

      const projects = await prisma.project.findMany({
        where,
        include: { 
          _count: { select: { plots: true, investments: true } },
          plots: { select: { status: true } } // For calculating sold vs available stats
        },
        orderBy: { createdAt: 'desc' },
        take: limit + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      });
      const hasMore = projects.length > limit;
      const dbData = hasMore ? projects.slice(0, limit) : projects;
      
      const data = dbData.map(p => {
        const available = p.plots.filter(plot => plot.status === 'AVAILABLE').length;
        const sold = p.plots.filter(plot => plot.status === 'SOLD').length;
        const held = p.plots.filter(plot => plot.status === 'HELD').length;
        // Strip the heavy plots array from response
        const { plots, ...rest } = p;
        return {
          ...rest,
          stats: {
            total: p._count.plots,
            available: available + held,
            sold: sold
          }
        };
      });

      void reply.send({ data, meta: { hasMore, cursor: dbData[dbData.length - 1]?.id } });
    },
  });

  fastify.get('/:id', {
    preHandler: [authenticate],
    handler: async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const project = await prisma.project.findUnique({
        where: { id: (request.params as { id: string }).id },
        include: { plots: { where: { deletedAt: null } }, _count: { select: { investments: true } } },
      });
      if (!project || project.deletedAt) throw new NotFoundError('Project');
      void reply.send({ data: project });
    },
  });

  // Admin-only routes
  fastify.post('/', {
    preHandler: [authenticate, authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN), validateBody(CreateProjectSchema), idempotencyMiddleware],
    handler: async (request: FastifyRequest<{ Body: CreateProjectInput }>, reply: FastifyReply) => {
      const project = await prisma.project.create({ data: request.body as CreateProjectInput });
      void reply.code(201).send({ data: project });
    },
  });

  fastify.put('/:id', {
    preHandler: [authenticate, authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN), validateBody(UpdateProjectSchema)],
    handler: async (request: FastifyRequest<{ Params: { id: string }; Body: UpdateProjectInput }>, reply: FastifyReply) => {
      const project = await prisma.project.update({
        where: { id: (request.params as { id: string }).id },
        data: request.body as UpdateProjectInput,
      });
      void reply.send({ data: project });
    },
  });

  fastify.put('/:id/status', {
    preHandler: [authenticate, authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN), validateBody(UpdateProjectStatusSchema)],
    handler: async (request: FastifyRequest<{ Params: { id: string }; Body: UpdateProjectStatusInput }>, reply: FastifyReply) => {
      const project = await prisma.project.update({
        where: { id: (request.params as { id: string }).id },
        data: { status: (request.body as UpdateProjectStatusInput).status },
      });
      void reply.send({ data: project });
    },
  });

  // ━━━━━━━━ IMAGE UPLOAD ━━━━━━━━
  fastify.post('/:id/images', {
    preHandler: [authenticate, authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN)],
    handler: async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const projectId = (request.params as { id: string }).id;

      // Verify project exists
      const project = await prisma.project.findUnique({ where: { id: projectId } });
      if (!project || project.deletedAt) throw new NotFoundError('Project');

      // Ensure upload directory exists
      const projectDir = path.join(UPLOADS_ROOT, projectId);
      fs.mkdirSync(projectDir, { recursive: true });

      const newUrls: string[] = [];
      const parts = request.parts();

      for await (const part of parts) {
        if (part.type === 'file' && part.mimetype.startsWith('image/')) {
          const ext = path.extname(part.filename || '.jpg') || '.jpg';
          const filename = `${randomUUID()}${ext}`;
          const filepath = path.join(projectDir, filename);

          await pipeline(part.file, fs.createWriteStream(filepath));
          newUrls.push(`/uploads/projects/${projectId}/${filename}`);
        }
      }

      if (newUrls.length === 0) {
        return reply.code(400).send({ error: 'No valid image files uploaded' });
      }

      // Append to existing gallery URLs
      const updated = await prisma.project.update({
        where: { id: projectId },
        data: { galleryUrls: [...project.galleryUrls, ...newUrls] },
      });

      void reply.send({ data: { galleryUrls: updated.galleryUrls, added: newUrls.length } });
    },
  });
}
